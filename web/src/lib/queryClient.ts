import { QueryClient } from '@tanstack/react-query';

/**
 * One client for the whole site.
 *
 * `retry: 1` rather than TanStack's default of 3: a 401 has already been
 * handled by the api client's refresh interceptor by the time a query sees it,
 * and the remaining failures here are a dead backend or a 403. Retrying either
 * three times just delays the error message the user needs.
 *
 * `staleTime` is a floor, not a promise of freshness — individual queries
 * override it (the dashboard asks for 15s because its numbers change).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});
