import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@/lib/client-api";

/**
 * Thin bridge between the existing `apiRequest` helper and TanStack Query.
 * Replaces the hand-rolled useEffect + isActive + loading/error/data quartet
 * with a single declarative call:
 *
 *   const { data, isLoading, error } = useApiQuery<Foo>(["foo", id], `/v1/foo/${id}`);
 *
 * Pass `init` for non-GET requests and `options` for staleTime/enabled/etc.
 */
export function useApiQuery<T>(
  key: QueryKey,
  path: string,
  init?: RequestInit,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error, T, QueryKey>({
    queryKey: key,
    queryFn: () => apiRequest<T>(path, init),
    ...options,
  });
}
