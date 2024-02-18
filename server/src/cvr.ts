import type {SearchResult} from './data';

export type CVR = Record<string, CVREntries>;
export type CVREntries = Record<string, number>;

export function cvrEntriesFromSearch(result: SearchResult[]) {
  const r: CVREntries = {};
  for (const row of result) {
    r[row.id] = row.rowversion;
  }
  return r;
}

export type CVRDiff = Record<string, CVREntryDiff>;
export type CVREntryDiff = {
  puts: string[];
  dels: string[];
};

export function diffCVR(prev: CVR, next: CVR) {
  const r: CVRDiff = {};
  const names = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  for (const name of names) {
    const prevEntries = prev[name] ?? {};
    const nextEntries = next[name] ?? {};
    r[name] = {
      puts: Object.keys(nextEntries).filter(
        id =>
          prevEntries[id] === undefined || prevEntries[id] < nextEntries[id],
      ),
      dels: Object.keys(prevEntries).filter(
        id => nextEntries[id] === undefined,
      ),
    };
  }
  return r;
}

export function isCVRDiffEmpty(diff: CVRDiff) {
  return Object.values(diff).every(
    e => e.puts.length === 0 && e.dels.length === 0,
  );
}
