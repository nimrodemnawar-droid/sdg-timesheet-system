import { useCallback } from 'react';
import { TRPCClientError } from '@trpc/client';

interface ErrorHandlingOptions {
  onNetworkError?: (error: Error) => void;
  onServerError?: (error: Error) => void;
  onUnknownError?: (error: Error) => void;
}

export function useApiErrorHandler(options: ErrorHandlingOptions = {}) {
  const isNetworkError = useCallback((error: unknown): boolean => {
    if (error instanceof TRPCClientError) {
      const message = error.message.toLowerCase();
      return (
        message.includes('json') ||
        message.includes('unexpected token') ||
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('timeout') ||
        error.data?.code === 'INTERNAL_SERVER_ERROR'
      );
    }
    return false;
  }, []);

  const isServerError = useCallback((error: unknown): boolean => {
    if (error instanceof TRPCClientError) {
      return error.data?.httpStatus === 500 || error.data?.code === 'INTERNAL_SERVER_ERROR';
    }
    return false;
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));

      if (isNetworkError(error)) {
        options.onNetworkError?.(err);
      } else if (isServerError(error)) {
        options.onServerError?.(err);
      } else {
        options.onUnknownError?.(err);
      }
    },
    [isNetworkError, isServerError, options]
  );

  return {
    handleError,
    isNetworkError,
    isServerError,
  };
}
