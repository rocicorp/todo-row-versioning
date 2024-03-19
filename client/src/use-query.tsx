import {Entity, generateZQL} from '@rocicorp/rails';
import {EntityQuery} from '@rocicorp/rails/out/zql/query/entity-query.js';
import {EntitySchema} from '@rocicorp/rails/out/zql/schema/entity-schema.js';
import {useEffect, useMemo, useState} from 'react';

export function useQuery<S extends EntitySchema, R>(
  query: EntityQuery<S, R>,
  dependencies: unknown[] = [],
): R {
  const view = useMemo(() => query.prepare().materialize(), dependencies);
  const [value, setValue] = useState<R>(view.value as R);
  useEffect(() => {
    setValue(view.value);
    return view.on(setValue);
  }, dependencies);
  return value;
}

type ReplicacheLike = Parameters<typeof generateZQL>[0];

export function useTable<E extends Entity>(
  rep: ReplicacheLike,
  tableName: string,
) {
  return generateZQL<E>(rep, tableName);
}
