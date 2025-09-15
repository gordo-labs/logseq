declare module '@tauri-apps/api/tauri' {
  export function invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/api/dialog' {
  export interface OpenDialogOptions {
    directory?: boolean;
    multiple?: boolean;
  }
  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
}
