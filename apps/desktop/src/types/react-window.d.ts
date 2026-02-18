declare module 'react-window' {
  import type { Component, ReactElement, CSSProperties, Ref } from 'react';

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps<T = any> {
    className?: string;
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    itemData?: T;
    overscanCount?: number;
    style?: CSSProperties;
    children: React.ComponentType<ListChildComponentProps<T>>;
    ref?: Ref<FixedSizeList<T>>;
  }

  export class FixedSizeList<T = any> extends Component<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }

  export interface VariableSizeListProps<T = any> {
    className?: string;
    height: number;
    itemCount: number;
    itemSize: (index: number) => number;
    width: number | string;
    itemData?: T;
    overscanCount?: number;
    style?: CSSProperties;
    children: React.ComponentType<ListChildComponentProps<T>>;
    ref?: Ref<VariableSizeList<T>>;
  }

  export class VariableSizeList<T = any> extends Component<VariableSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }
}
