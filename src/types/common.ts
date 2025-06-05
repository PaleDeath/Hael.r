export interface WithClassName {
  className?: string;
}

export type MergeWithClassName<T> = T & WithClassName; 