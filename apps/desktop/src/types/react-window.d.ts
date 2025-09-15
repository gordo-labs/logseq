declare module 'react-window' {
  import type { ReactElement } from 'react';
  export interface ListChildComponentProps<T = any> {
    index: number;
    style: React.CSSProperties;
    data: T;
  }
  export interface FixedSizeListProps {
    className?: string;
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    itemData?: any;
    children?: (props: ListChildComponentProps) => ReactElement | null;
  }
  export const FixedSizeList: React.FC<FixedSizeListProps>;
}
