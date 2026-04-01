export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface BackendWrappedResponse<T> {
  message?: string;
  data?: T;
}
