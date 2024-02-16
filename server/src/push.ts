import {z} from 'zod';
import {Executor, transact} from './pg';
import {getPokeBackend} from './poke';
import {
  createList,
  createTodo,
  createShare,
  deleteList,
  deleteTodo,
  deleteShare,
  putClient,
  putClientGroup,
  updateTodo,
  Affected,
  getClientGroup,
  getClient,
} from './data';
import type {ReadonlyJSONValue} from 'replicache';
import {listSchema, shareSchema, todoSchema} from 'shared';

const mutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  name: z.string(),
  args: z.any(),
});

type Mutation = z.infer<typeof mutationSchema>;

const pushRequestSchema = z.object({
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

export async function push(userID: string, requestBody: ReadonlyJSONValue) {
  console.log('Processing push', JSON.stringify(requestBody, null, ''));

  const push = pushRequestSchema.parse(requestBody);

  const t0 = Date.now();

  const affected = {
    listIDs: new Set<string>(),
    userIDs: new Set<string>(),
  };

  for (const mutation of push.mutations) {
    const result = await processMutation(
      userID,
      push.clientGroupID,
      mutation,
      null,
    );
    if ('error' in result) {
      await processMutation(userID, push.clientGroupID, mutation, result.error);
    } else {
      for (const listID of result.affected.listIDs) {
        affected.listIDs.add(listID);
      }
      for (const userID of result.affected.userIDs) {
        affected.userIDs.add(userID);
      }
    }
  }

  const pokeBackend = getPokeBackend();
  for (const listID of affected.listIDs) {
    pokeBackend.poke(`list/${listID}`);
  }
  for (const userID of affected.userIDs) {
    pokeBackend.poke(`user/${userID}`);
  }

  console.log('Processed all mutations in', Date.now() - t0);
}

async function processMutation(
  userID: string,
  clientGroupID: string,
  mutation: Mutation,
  error: string | null,
): Promise<{affected: Affected} | {error: string}> {
  return await transact(async executor => {
    let affected: Affected = {listIDs: [], userIDs: []};

    console.log(
      error === null ? 'Processing mutation' : 'Processing mutation error',
      JSON.stringify(mutation, null, ''),
    );

    const baseClientGroup = await getClientGroup(executor, clientGroupID);
    const baseClient = await getClient(executor, mutation.clientID);

    const nextClientVersion = baseClientGroup.clientVersion + 1;
    const nextMutationID = baseClient.lastMutationID + 1;

    if (mutation.id < nextMutationID) {
      console.log(
        `Mutation ${mutation.id} has already been processed - skipping`,
      );
      return {affected};
    }
    if (mutation.id > nextMutationID) {
      throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
    }

    const t1 = Date.now();

    if (error === null) {
      try {
        affected = await mutate(executor, userID, mutation);
      } catch (e) {
        console.error(
          `Error executing mutation: ${JSON.stringify(mutation)}: ${e}`,
        );
        return {error: String(e)};
      }
    }

    const nextClientGroup = {
      id: clientGroupID,
      cvrVersion: baseClientGroup.cvrVersion,
      clientVersion: nextClientVersion,
    };

    const nextClient = {
      id: mutation.clientID,
      clientGroupID,
      lastMutationID: nextMutationID,
      clientVersion: nextClientVersion,
    };

    await Promise.all([
      putClientGroup(executor, nextClientGroup),
      putClient(executor, nextClient),
    ]);

    console.log('Processed mutation in', Date.now() - t1);
    return {affected};
  });
}

async function mutate(
  executor: Executor,
  userID: string,
  mutation: Mutation,
): Promise<Affected> {
  switch (mutation.name) {
    case 'createList':
      return await createList(
        executor,
        userID,
        listSchema.parse(mutation.args),
      );
    case 'deleteList':
      return await deleteList(
        executor,
        userID,
        z.string().parse(mutation.args),
      );
    case 'createTodo':
      return await createTodo(
        executor,
        userID,
        todoSchema.omit({sort: true}).parse(mutation.args),
      );
    case 'createShare':
      return await createShare(
        executor,
        userID,
        shareSchema.parse(mutation.args),
      );
    case 'deleteShare':
      return await deleteShare(
        executor,
        userID,
        z.string().parse(mutation.args),
      );
    case 'updateTodo':
      return await updateTodo(
        executor,
        userID,
        todoSchema
          .partial()
          .merge(todoSchema.pick({id: true}))
          .parse(mutation.args),
      );
    case 'deleteTodo':
      return await deleteTodo(
        executor,
        userID,
        z.string().parse(mutation.args),
      );
    default:
      return {
        listIDs: [],
        userIDs: [],
      };
  }
}
