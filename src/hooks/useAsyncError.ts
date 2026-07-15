import { useState } from 'react';

export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error;
  }

  return (nextError: unknown) => {
    if (nextError instanceof Error) {
      setError(nextError);
      return;
    }

    setError(new Error('Unknown async error'));
  };
}
