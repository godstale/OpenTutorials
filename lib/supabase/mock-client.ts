export interface Filter {
  type: 'eq' | 'neq' | 'in';
  column: string;
  value: any;
}

export class MockQueryBuilder {
  private table: string;
  private filters: Filter[] = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private singleResult: boolean = false;
  private isMaybeSingle: boolean = false;
  private limitCount: number | null = null;
  private runQuery: (query: any, action: string, data?: any) => Promise<any>;

  constructor(table: string, runQuery: any) {
    this.table = table;
    this.runQuery = runQuery;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async insert(data: any) {
    return this.execute('insert', data);
  }

  async update(data: any) {
    return this.execute('update', data);
  }

  async delete() {
    return this.execute('delete');
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute('select');
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (e) {
      if (onrejected) return onrejected(e);
      throw e;
    }
  }

  private async execute(action: string, data?: any) {
    const serialized = {
      table: this.table,
      filters: this.filters,
      order: this.orderConfig,
      single: this.singleResult,
      maybeSingle: this.isMaybeSingle,
      limit: this.limitCount
    };
    return this.runQuery(serialized, action, data);
  }
}

export class MockSupabaseClient {
  auth = {
    getUser: async () => {
      return {
        data: {
          user: {
            id: 'local-user-id',
            email: 'user@opentutor.local',
            user_metadata: { name: 'Local User' }
          }
        },
        error: null
      };
    },
    signUp: async (credentials: any) => {
      return {
        data: {
          user: {
            id: 'local-user-id',
            email: credentials.email
          }
        },
        error: null
      };
    },
    signInWithPassword: async (credentials: any) => {
      return {
        data: {
          user: {
            id: 'local-user-id',
            email: credentials.email
          },
          session: {
            access_token: 'mock-token'
          }
        },
        error: null
      };
    },
    signOut: async () => {
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  };

  storage = {
    from: (bucket: string) => {
      return {
        download: async (path: string) => {
          const result = await this.runQuery({ table: '' }, 'storage_download', { bucket, path });
          if (result.error) return { data: null, error: result.error };

          const base64 = result.data.base64;
          if (typeof window === 'undefined') {
            return { data: Buffer.from(base64, 'base64'), error: null };
          } else {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);
            return { data: blob, error: null };
          }
        },
        upload: async (path: string, fileBody: any, options?: any) => {
          let base64 = '';
          if (typeof window === 'undefined') {
            if (Buffer.isBuffer(fileBody)) {
              base64 = fileBody.toString('base64');
            } else if (fileBody instanceof ArrayBuffer) {
              base64 = Buffer.from(fileBody).toString('base64');
            } else {
              base64 = Buffer.from(fileBody).toString('base64');
            }
          } else {
            if (fileBody instanceof Blob) {
              base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1]);
                };
                reader.readAsDataURL(fileBody);
              });
            } else if (fileBody instanceof ArrayBuffer) {
              base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(fileBody) as any));
            } else {
              base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(fileBody) as any));
            }
          }

          const result = await this.runQuery({ table: '' }, 'storage_upload', { bucket, path, fileData: base64 });
          return result;
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: `/courses/${path}` } };
        }
      };
    }
  };

  from(table: string) {
    return new MockQueryBuilder(table, this.runQuery.bind(this));
  }

  private async runQuery(query: any, action: string, data?: any) {
    if (typeof window === 'undefined') {
      const { executeLocalQuery } = require('../db/local-db-server');
      return executeLocalQuery(query, action, data);
    } else {
      const res = await fetch('/api/local-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, action, data })
      });
      return await res.json();
    }
  }
}

export function createMockSupabaseClient() {
  return new MockSupabaseClient();
}
