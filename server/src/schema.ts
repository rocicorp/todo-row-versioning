import type {PGConfig} from './pgconfig/pgconfig.js';
import type {Executor} from './pg.js';

export async function createDatabase(executor: Executor, dbConfig: PGConfig) {
  console.log('creating database');
  const schemaVersion = await dbConfig.getSchemaVersion(executor);
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
    rowversion integer not null,
    lastmodified timestamp(6) not null
    )`);

  await executor(`create table share (
      id varchar(36) primary key not null,
      listid varchar(36) not null,
      userid varchar(36) not null,
      rowversion integer not null,
      lastmodified timestamp(6) not null
      )`);

  await executor(`create table item (
    id varchar(36) primary key not null,
    listid varchar(36) not null,
    title text not null,
    complete boolean not null,
    ord integer not null,
    rowversion integer not null,
    lastmodified timestamp(6) not null
    )`);
}
