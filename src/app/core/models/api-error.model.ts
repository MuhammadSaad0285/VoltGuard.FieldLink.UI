export interface ApiError {
  message?: string;
  detail?: string;
  title?: string;
  status?: number;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[] | string>;
}

interface ApiErrorLike {
  error?: ApiError | string | null;
  message?: string;
}

export function getApiErrorMessage(error: unknown, fallbackMessage = 'Something went wrong'): string {
  const apiError = error as ApiErrorLike;
  const body = apiError.error;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  const problemDetails = typeof body === 'object' && body ? body : undefined;
  const validationMessage = getFirstValidationMessage(problemDetails?.errors);

  return (
    problemDetails?.detail ??
    problemDetails?.message ??
    validationMessage ??
    apiError.message ??
    fallbackMessage
  );
}

function getFirstValidationMessage(errors: ApiError['errors']): string | undefined {
  if (!errors) {
    return undefined;
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const message = value.find((item) => !!item?.trim());

      if (message) {
        return message;
      }

      continue;
    }

    if (value?.trim()) {
      return value;
    }
  }

  return undefined;
}
