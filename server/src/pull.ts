import {z} from 'zod';
import type {PatchOperation, PullResponse, PullResponseOKV1} from 'replicache';
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
import {ClientViewData} from './cvr';

const cookie = z.object({
  order: z.number(),
  clientGroupID: z.string(),
});

type Cookie = z.infer<typeof cookie>;

const pullRequest = z.object({
  clientGroupID: z.string(),
  cookie: z.union([cookie, z.null()]),
});

type ClientViewRecord = {
  list: ClientViewData;
  todo: ClientViewData;
  share: ClientViewData;
  clientVersion: number;
};

// cvrKey -> ClientViewRecord
const cvrCache = new Map<string, ClientViewRecord>();

export async function pull(
  userID: string,
  requestBody: Express.Request,
): Promise<PullResponse> {
  console.log(`Processing pull`, JSON.stringify(requestBody, null, ''));

  const pull = pullRequest.parse(requestBody);

  const {clientGroupID} = pull;
  const prevCVR = pull.cookie
    ? cvrCache.get(makeCVRKey(pull.cookie))
    : undefined;
  const baseCVR = prevCVR ?? {
    list: new ClientViewData(),
    todo: new ClientViewData(),
    share: new ClientViewData(),
    clientVersion: 0,
  };
  console.log({prevCVR, baseCVR});

  const {nextCVRVersion, nextCVR, clientChanges, lists, shares, todos} =
    await transact(async executor => {
      const baseClientGroupRecord = await getClientGroup(
        executor,
        clientGroupID,
      );

      const [clientChanges, listMeta] = await Promise.all([
        searchClients(executor, {
          clientGroupID,
          sinceClientVersion: baseCVR.clientVersion,
        }),
        searchLists(executor, {accessibleByUserID: userID}),
      ]);

      console.log({baseClientGroupRecord, clientChanges, listMeta});

      // TODO: Should be able to do this join in the database and eliminate a round-trip.
      const listIDs = listMeta.map(l => l.id);
      const [todoMeta, shareMeta] = await Promise.all([
        searchTodos(executor, {listIDs}),
        searchShares(executor, {listIDs}),
      ]);

      console.log({todoMeta, shareMeta});

      const nextCVR: ClientViewRecord = {
        list: ClientViewData.fromSearchResult(listMeta),
        todo: ClientViewData.fromSearchResult(todoMeta),
        share: ClientViewData.fromSearchResult(shareMeta),
        clientVersion: baseClientGroupRecord.clientVersion,
      };

      const listPuts = nextCVR.list.getPutsSince(baseCVR.list);
      const sharePuts = nextCVR.share.getPutsSince(baseCVR.share);
      const todoPuts = nextCVR.todo.getPutsSince(baseCVR.todo);

      // Replicache ClientGroups can be forked from an existing
      // ClientGroup with existing state and cookie. In this case we
      // might see a new CG getting a pull with a non-null cookie.
      // For these CG's, initialize to incoming cookie.
      let prevCVRVersion = baseClientGroupRecord.cvrVersion;
      if (prevCVRVersion === null) {
        if (pull.cookie !== null) {
          prevCVRVersion = pull.cookie.order;
        } else {
          prevCVRVersion = 0;
        }
        console.log(
          `ClientGroup ${clientGroupID} is new, initializing to ${prevCVRVersion}`,
        );
      }

      const nextClientGroupRecord = {
        ...baseClientGroupRecord,
        cvrVersion: prevCVRVersion + 1,
      };

      console.log({listPuts, sharePuts, todoPuts, nextClientGroupRecord});

      const [lists, shares, todos] = await Promise.all([
        getLists(executor, listPuts),
        getShares(executor, sharePuts),
        getTodos(executor, todoPuts),
        putClientGroup(executor, nextClientGroupRecord),
      ]);

      return {
        nextCVRVersion: nextClientGroupRecord.cvrVersion,
        nextCVR,
        clientChanges,
        lists,
        shares,
        todos,
      };
    });

  console.log({nextCVRVersion, nextCVR, clientChanges, lists, shares, todos});

  const listDels = nextCVR.list.getDelsSince(baseCVR.list);
  const shareDels = nextCVR.share.getDelsSince(baseCVR.share);
  const todoDels = nextCVR.todo.getDelsSince(baseCVR.todo);

  console.log({listDels, shareDels, todoDels});

  const patch: PatchOperation[] = [];

  if (prevCVR === undefined) {
    patch.push({op: 'clear'});
  }

  for (const id of listDels) {
    patch.push({op: 'del', key: `list/${id}`});
  }
  for (const list of lists) {
    patch.push({op: 'put', key: `list/${list.id}`, value: list});
  }
  for (const id of shareDels) {
    patch.push({op: 'del', key: `share/${id}`});
  }
  for (const share of shares) {
    patch.push({op: 'put', key: `share/${share.id}`, value: share});
  }
  for (const id of todoDels) {
    patch.push({op: 'del', key: `todo/${id}`});
  }
  for (const todo of todos) {
    patch.push({op: 'put', key: `todo/${todo.id}`, value: todo});
  }

  const respCookie: Cookie = {
    clientGroupID,
    order: nextCVRVersion,
  };
  const resp: PullResponseOKV1 = {
    cookie: respCookie,
    lastMutationIDChanges: Object.fromEntries(
      clientChanges.map(e => [e.id, e.lastMutationID] as const),
    ),
    patch,
  };

  cvrCache.set(makeCVRKey(respCookie), nextCVR);

  return resp;
}

function makeCVRKey({order, clientGroupID}: Cookie) {
  return `${clientGroupID}/${order}`;
}
