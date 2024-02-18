import {z} from 'zod';
import type {PatchOperation, PullResponse} from 'replicache';
import type Express from 'express';
import {transact} from './pg';
import {
  getClientGroup,
  getLists,
  getShares,
  getTodos,
  putClientGroup,
  searchClients,
  searchLists,
  searchShares,
  searchTodos,
} from './data';
import {
  cvrEntriesFromSearch,
  type CVR,
  diffCVR,
  isCVRDiffEmpty,
  CVREntries,
} from './cvr';
import {nanoid} from 'nanoid';

const cookie = z.object({
  order: z.number(),
  cvrID: z.string(),
});

type Cookie = z.infer<typeof cookie>;

const pullRequest = z.object({
  clientGroupID: z.string(),
  cookie: z.union([cookie, z.null()]),
});

// cvrKey -> ClientViewRecord
const cvrCache = new Map<string, CVR>();

// Implements the algorithm from:
// https://doc.replicache.dev/strategies/row-version#pull
export async function pull(
  userID: string,
  requestBody: Express.Request,
): Promise<PullResponse> {
  console.log(`Processing pull`, JSON.stringify(requestBody, null, ''));

  const pull = pullRequest.parse(requestBody);

  const {clientGroupID} = pull;
  // 1: Fetch prevCVR
  const prevCVR = pull.cookie ? cvrCache.get(pull.cookie.cvrID) : undefined;
  // 2: Init baseCVR
  const baseCVR: CVR = prevCVR ?? {};
  console.log({prevCVR, baseCVR});

  // 3: begin transaction
  const txResult = await transact(async executor => {
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const baseClientGroupRecord = await getClientGroup(
      executor,
      clientGroupID,
      userID,
    );

    const [listMeta, clientMeta] = await Promise.all([
      // 6: Read all domain data, just ids and versions
      searchLists(executor, {accessibleByUserID: userID}),
      // 7: Read all clients in CG
      searchClients(executor, {
        clientGroupID,
      }),
    ]);

    console.log({baseClientGroupRecord, clientMeta, listMeta});

    // 6: Read all domain data, just ids and versions
    const listIDs = listMeta.map(l => l.id);
    const [todoMeta, shareMeta] = await Promise.all([
      searchTodos(executor, {listIDs}),
      searchShares(executor, {listIDs}),
    ]);
    console.log({todoMeta, shareMeta});

    // 8: Build nextCVR
    const nextCVR: CVR = {
      list: cvrEntriesFromSearch(listMeta),
      todo: cvrEntriesFromSearch(todoMeta),
      share: cvrEntriesFromSearch(shareMeta),
      client: cvrEntriesFromSearch(clientMeta),
    };
    console.log({nextCVR});

    // 9: calculate diffs
    const diff = diffCVR(baseCVR, nextCVR);
    console.log({diff});

    // 10: If diff is empty, return no-op PR
    if (prevCVR && isCVRDiffEmpty(diff)) {
      return null;
    }

    // 11: get entities
    const [lists, shares, todos] = await Promise.all([
      getLists(executor, diff.list.puts),
      getShares(executor, diff.share.puts),
      getTodos(executor, diff.todo.puts),
    ]);
    console.log({lists, shares, todos});

    // 12: changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients: CVREntries = {};
    for (const clientID of diff.client.puts) {
      clients[clientID] = nextCVR.client[clientID];
    }
    console.log({clients});

    // 13: newCVRVersion
    const baseCVRVersion = pull.cookie?.order ?? 0;
    const nextCVRVersion =
      Math.max(baseCVRVersion, baseClientGroupRecord.cvrVersion) + 1;

    // 14: Write ClientGroupRecord
    const nextClientGroupRecord = {
      ...baseClientGroupRecord,
      cvrVersion: nextCVRVersion,
    };
    console.log({nextClientGroupRecord});
    await putClientGroup(executor, nextClientGroupRecord);

    return {
      entities: {
        list: {dels: diff.list.dels, puts: lists},
        share: {dels: diff.share.dels, puts: shares},
        todo: {dels: diff.todo.dels, puts: todos},
      },
      clients,
      nextCVR,
      nextCVRVersion,
    };
  });

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pull.cookie,
      lastMutationIDChanges: {},
      patch: [],
    };
  }

  const {entities, clients, nextCVR, nextCVRVersion} = txResult;

  // 16-17: store cvr
  const cvrID = nanoid();
  cvrCache.set(cvrID, nextCVR);

  // 18(i): build patch
  const patch: PatchOperation[] = [];
  if (prevCVR === undefined) {
    patch.push({op: 'clear'});
  }

  for (const [name, {puts, dels}] of Object.entries(entities)) {
    for (const id of dels) {
      patch.push({op: 'del', key: `${name}/${id}`});
    }
    for (const entity of puts) {
      patch.push({
        op: 'put',
        key: `${name}/${entity.id}`,
        value: entity,
      });
    }
  }

  // 18(ii): construct cookie
  const cookie: Cookie = {
    order: nextCVRVersion,
    cvrID,
  };

  // 17(iii): lastMutationIDChanges
  const lastMutationIDChanges = clients;

  return {
    cookie,
    lastMutationIDChanges,
    patch,
  };
}
