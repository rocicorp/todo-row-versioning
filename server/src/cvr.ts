import type {SearchResult} from './data';

export class ClientViewData {
  constructor() {
    this._data = new Map();
  }

  static fromSearchResult(result: SearchResult[]) {
    const cvr = new ClientViewData();
    for (const row of result) {
      cvr._data.set(row.id, row.rowversion);
    }
    return cvr;
  }

  private _data: Map<string, number> = new Map();

  getPutsSince(cvr: ClientViewData) {
    const puts: string[] = [];
    for (const [id, rowversion] of this._data) {
      const prev = cvr._data.get(id);
      if (prev === undefined || prev < rowversion) {
        puts.push(id);
      }
    }
    return puts;
  }

  getDelsSince(cvr: ClientViewData) {
    const dels: string[] = [];
    for (const [id] of cvr._data) {
      if (!this._data.get(id)) {
        dels.push(id);
      }
    }
    return dels;
  }
}
