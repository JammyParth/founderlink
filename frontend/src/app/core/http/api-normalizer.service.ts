import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ApiEnvelope, BackendWrappedResponse } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class ApiNormalizerService {

  normalizeSuccess<T>(response: HttpResponse<any>): ApiEnvelope<T> {
    if (response.status === 204 || response.body === null) {
      return { success: true, data: null, error: null };
    }

    const body = response.body;

    // Check if it's a wrapped response
    if (body && typeof body === 'object' && !Array.isArray(body) && ('data' in body || 'message' in body)) {
      // It might be { message, data } or just { message }
      const wrapped = body as BackendWrappedResponse<T>;
      return { 
        success: true, 
        data: wrapped.data !== undefined ? wrapped.data : (null as any), 
        error: null 
      };
    }

    // Plain DTO or array
    return { success: true, data: body as T, error: null };
  }

  normalizeError<T>(errorResponse: HttpErrorResponse): ApiEnvelope<T> {
    let errorMessage = 'An unexpected error occurred.';
    
    if (errorResponse.error instanceof ErrorEvent) {
      errorMessage = errorResponse.error.message;
    } else if (errorResponse.error) {
      if (typeof errorResponse.error === 'string') {
        errorMessage = errorResponse.error;
      } else if (errorResponse.error.message) {
        errorMessage = errorResponse.error.message;
      } else if (errorResponse.error.error) {
        errorMessage = errorResponse.error.error;
      } else if (typeof errorResponse.error === 'object') {
        // Handle validation errors (field map)
        const errors = Object.values(errorResponse.error).filter(val => typeof val === 'string');
        if (errors.length > 0) {
          errorMessage = errors.join(', ');
        } else {
          errorMessage = JSON.stringify(errorResponse.error);
        }
      }
    } else if (errorResponse.message) {
      errorMessage = errorResponse.message;
    }

    return { success: false, data: null, error: errorMessage };
  }
}
