import type {Executor} from './pg.js';

export async function createDatabase(executor: Executor) {
  console.log('creating database');
  const schemaVersion = await getSchemaVersion(executor);
  if (schemaVersion < 0 || schemaVersion > 1) {
    throw new Error('Unexpected schema version: ' + schemaVersion);
  }
  if (schemaVersion === 0) {
    await createSchemaVersion1(executor);
  }
}

export async function createSchemaVersion1(executor: Executor) {
  await executor(
    'create table replicache_meta (key text primary key, value json)',
  );
  await executor(
    "insert into replicache_meta (key, value) values ('schemaVersion', '1')",
  );

  // cvrversion is null until first pull initializes it.
  await executor(`create table replicache_client_group (
    id varchar(36) primary key not null,
    cvrversion integer null,
    clientversion integer not null,
    lastmodified timestamp(6) not null
    )`);

  await executor(`create table replicache_client (
    id varchar(36) primary key not null,
    clientgroupid varchar(36) not null,
    lastmutationid integer not null,
    clientversion integer not null,
    lastmodified timestamp(6) not null
    )`);

  await executor(`create table list (
    id varchar(36) primary key not null,
    ownerid varchar(36) not null,
    name text not null,
    lastmodified timestamp(6) not null
    )`);

  await executor(`create table share (
    id varchar(36) primary key not null,
    listid varchar(36) not null,
    userid varchar(36) not null,
    lastmodified timestamp(6) not null
    )`);

  await executor(`create table item (
    id varchar(36) primary key not null,
    listid varchar(36) not null,
    title text not null,
    complete boolean not null,
    ord integer not null,
    lastmodified timestamp(6) not null
    )`);
}

async function getSchemaVersion(executor: Executor): Promise<number> {
  const metaExists = await executor(`select exists(
      select from pg_tables where schemaname = 'public' and tablename = 'replicache_meta')`);
  if (!metaExists.rows[0].exists) {
    return 0;
  }
  const qr = await executor(
    `select value from replicache_meta where key = 'schemaVersion'`,
  );
  return qr.rows[0].value;
}
