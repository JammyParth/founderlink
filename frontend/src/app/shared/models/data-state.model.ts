export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'reconciling';

export interface DataState<T> {
  data: T | null;
  loadingState: LoadingState;
  error: string | null;
}

export function createInitialState<T>(): DataState<T> {
  return {
    data: null,
    loadingState: 'idle',
    error: null
  };
}
