declare module 'sql.js' {
  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }
  export interface Statement {
    bind(params: any[]): void;
    step(): boolean;
    get(): any[];
    free(): void;
  }
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }
  export default function initSqlJs(config?: SqlJsConfig): Promise<{ Database: new (data?: Uint8Array) => Database }>;
}
