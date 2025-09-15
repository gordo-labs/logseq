declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement | null;
  }
  interface CSSProperties {
    [property: string]: any;
  }
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prev: S) => S);
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useMemo<T>(factory: () => T, deps?: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  function useRef<T>(initial: T): { current: T };
  interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children?: ReactNode }>;
  }
  function useContext<T>(ctx: Context<T>): T;
  function createContext<T>(defaultValue: T): Context<T>;
  interface ChangeEvent<T = Element> {
    target: T;
  }
  const StrictMode: any;
}

declare module 'react' {
  export = React;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(children: any): void };
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
