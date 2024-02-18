import type {List, Todo, TodoUpdate, Share} from 'shared';
import type {Executor} from './pg.js';

export type SearchResult = {
  id: string;
  rowversion: number;
};

export type ClientGroupRecord = {
  id: string;
  userID: string;
  cvrVersion: number;
};

export type ClientRecord = {
  id: string;
  clientGroupID: string;
  lastMutationID: number;
};

export type Affected = {
  listIDs: string[];
  userIDs: string[];
};

export async function createList(
  executor: Executor,
  userID: string,
  list: List,
): Promise<Affected> {
  if (userID !== list.ownerID) {
    throw new Error('Authorization error, cannot create list for other user');
  }
  await executor(
    `insert into list (id, ownerid, name, lastmodified) values ($1, $2, $3, now())`,
    [list.id, list.ownerID, list.name],
  );
  return {listIDs: [], userIDs: [list.ownerID]};
}

export async function deleteList(
  executor: Executor,
  userID: string,
  listID: string,
): Promise<Affected> {
  await requireAccessToList(executor, listID, userID);
  const userIDs = await getAccessors(executor, listID);
  await executor(`delete from list where id = $1`, [listID]);
  return {
    listIDs: [],
    userIDs,
  };
}

export async function searchLists(
  executor: Executor,
  {accessibleByUserID}: {accessibleByUserID: string},
) {
  const {rows} = await executor(
    `select id, xmin as rowversion from list where ownerid = $1 or ` +
      `id in (select listid from share where userid = $1)`,
    [accessibleByUserID],
  );
  return rows as SearchResult[];
}

export async function getLists(executor: Executor, listIDs: string[]) {
  if (listIDs.length === 0) return [];
  const {rows} = await executor(
    `select id, name, ownerID from list where id in (${getPlaceholders(
      listIDs.length,
    )})`,
    listIDs,
  );
  return rows.map(r => {
    const list: List = {
      id: r.id,
      name: r.name,
      ownerID: r.ownerid,
    };
    return list;
  });
}

export async function createShare(
  executor: Executor,
  userID: string,
  share: Share,
): Promise<Affected> {
  await requireAccessToList(executor, share.listID, userID);
  await executor(
    `insert into share (id, listid, userid, lastmodified) values ($1, $2, $3, now())`,
    [share.id, share.listID, share.userID],
  );
  return {
    listIDs: [share.listID],
    userIDs: [share.userID],
  };
}

export async function deleteShare(
  executor: Executor,
  userID: string,
  id: string,
): Promise<Affected> {
  const [share] = await getShares(executor, [id]);
  if (!share) {
    throw new Error("Specified share doesn't exist");
  }

  await requireAccessToList(executor, share.listID, userID);
  await executor(`delete from share where id = $1`, [id]);
  return {
    listIDs: [share.listID],
    userIDs: [share.userID],
  };
}

export async function searchShares(
  executor: Executor,
  {listIDs}: {listIDs: string[]},
) {
  if (listIDs.length === 0) return [];
  const {rows} = await executor(
    `select s.id, s.xmin as rowversion from share s, list l where s.listid = l.id and l.id in (${getPlaceholders(
      listIDs.length,
    )})`,
    listIDs,
  );
  return rows as SearchResult[];
}

export async function getShares(executor: Executor, shareIDs: string[]) {
  if (shareIDs.length === 0) return [];
  const {rows} = await executor(
    `select id, listid, userid from share where id in (${getPlaceholders(
      shareIDs.length,
    )})`,
    shareIDs,
  );
  return rows.map(r => {
    const share: Share = {
      id: r.id,
      listID: r.listid,
      userID: r.userid,
    };
    return share;
  });
}

export async function createTodo(
  executor: Executor,
  userID: string,
  todo: Omit<Todo, 'sort'>,
): Promise<Affected> {
  await requireAccessToList(executor, todo.listID, userID);
  const {rows} = await executor(
    `select max(ord) as maxord from item where listid = $1`,
    [todo.listID],
  );
  const maxOrd = rows[0]?.maxord ?? 0;
  await executor(
    `insert into item (id, listid, title, complete, ord, lastmodified) values ($1, $2, $3, $4, $5, now())`,
    [todo.id, todo.listID, todo.text, todo.completed, maxOrd + 1],
  );
  return {
    listIDs: [todo.listID],
    userIDs: [],
  };
}

export async function updateTodo(
  executor: Executor,
  userID: string,
  update: TodoUpdate,
): Promise<Affected> {
  const todo = await mustGetTodo(executor, update.id);
  await requireAccessToList(executor, todo.listID, userID);
  await executor(
    `update item set title = coalesce($1, title), complete = coalesce($2, complete), ord = coalesce($3, ord), lastmodified = now() where id = $4`,
    [update.text, update.completed, update.sort, update.id],
  );
  return {
    listIDs: [todo.listID],
    userIDs: [],
  };
}

export async function deleteTodo(
  executor: Executor,
  userID: string,
  todoID: string,
): Promise<Affected> {
  const todo = await mustGetTodo(executor, todoID);
  await requireAccessToList(executor, todo.listID, userID);
  await executor(`delete from item where id = $1`, [todoID]);
  return {
    listIDs: [todo.listID],
    userIDs: [],
  };
}

export async function searchTodos(
  executor: Executor,
  {listIDs}: {listIDs: string[]},
) {
  if (listIDs.length === 0) return [];
  const {rows} = await executor(
    `select id, xmin as rowversion from item where listid in (${getPlaceholders(
      listIDs.length,
    )})`,
    listIDs,
  );
  return rows as SearchResult[];
}

export async function mustGetTodo(executor: Executor, id: string) {
  const [todo] = await getTodos(executor, [id]);
  if (!todo) {
    throw new Error('Specified todo does not exist');
  }
  return todo;
}

export async function getTodos(executor: Executor, todoIDs: string[]) {
  if (todoIDs.length === 0) return [];
  const {rows} = await executor(
    `select id, listid, title, complete, ord from item where id in (${getPlaceholders(
      todoIDs.length,
    )})`,
    todoIDs,
  );
  return rows.map(r => {
    const todo: Todo = {
      id: r.id,
      listID: r.listid,
      text: r.title,
      completed: r.complete,
      sort: r.ord,
    };
    return todo;
  });
}

export async function putClientGroup(
  executor: Executor,
  clientGroup: ClientGroupRecord,
) {
  const {id, userID, cvrVersion} = clientGroup;
  await executor(
    `insert into replicache_client_group
      (id, userid, cvrversion, lastmodified)
    values
      ($1, $2, $3, now())
    on conflict (id) do update set
      userid = $2, cvrversion = $3, lastmodified = now()`,
    [id, userID, cvrVersion],
  );
}

export async function getClientGroup(
  executor: Executor,
  clientGroupID: string,
  userID: string,
): Promise<ClientGroupRecord> {
  const {rows} = await executor(
    `select userid, cvrversion from replicache_client_group where id = $1`,
    [clientGroupID],
  );
  if (!rows || rows.length === 0) {
    return {
      id: clientGroupID,
      userID,
      cvrVersion: 0,
    };
  }
  const r = rows[0];
  if (r.userid !== userID) {
    throw new Error('Authorization error - user does not own client group');
  }
  return {
    id: clientGroupID,
    userID: r.userid,
    cvrVersion: r.cvrversion,
  };
}

export async function searchClients(
  executor: Executor,
  {clientGroupID}: {clientGroupID: string},
) {
  const {rows} = await executor(
    `select id, lastmutationid as rowversion from replicache_client where clientGroupID = $1`,
    [clientGroupID],
  );
  return rows as SearchResult[];
}

export async function getClient(
  executor: Executor,
  clientID: string,
  clientGroupID: string,
): Promise<ClientRecord> {
  const {rows} = await executor(
    `select clientgroupid, lastmutationid from replicache_client where id = $1`,
    [clientID],
  );
  if (!rows || rows.length === 0)
    return {
      id: clientID,
      clientGroupID: '',
      lastMutationID: 0,
    };
  const r = rows[0];
  if (r.clientgroupid !== clientGroupID) {
    throw new Error(
      'Authorization error - client does not belong to client group',
    );
  }
  return {
    id: r.id,
    clientGroupID: r.clientgroupid,
    lastMutationID: r.lastmutationid,
  };
}

export async function putClient(executor: Executor, client: ClientRecord) {
  const {id, clientGroupID, lastMutationID} = client;
  await executor(
    `
      insert into replicache_client
        (id, clientgroupid, lastmutationid, lastmodified)
      values
        ($1, $2, $3, now())
      on conflict (id) do update set
        lastmutationid = $3, lastmodified = now()
      `,
    [id, clientGroupID, lastMutationID],
  );
}

export async function getAccessors(executor: Executor, listID: string) {
  const {rows} = await executor(
    `select ownerid as userid from list where id = $1 union ` +
      `select userid from share where listid = $1`,
    [listID],
  );
  return rows.map(r => r.userid) as string[];
}

async function requireAccessToList(
  executor: Executor,
  listID: string,
  accessingUserID: string,
) {
  const {rows} = await executor(
    `select 1 from list where id = $1 and (ownerid = $2 or id in (select listid from share where userid = $2))`,
    [listID, accessingUserID],
  );
  if (rows.length === 0) {
    throw new Error("Authorization error, can't access list");
  }
}

function getPlaceholders(count: number) {
  return Array.from({length: count}, (_, i) => `$${i + 1}`).join(', ');
}
