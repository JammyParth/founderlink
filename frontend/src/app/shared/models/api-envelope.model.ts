export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  statusCode?: number;
}

export interface BackendWrappedResponse<T> {
  message?: string;
  data?: T;
}
