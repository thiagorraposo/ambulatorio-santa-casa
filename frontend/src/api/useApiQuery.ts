import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSession } from '../app/session';
import type { ApiError } from './client';

export function useApiQuery<T>(path: string, enabled = true): UseQueryResult<T, ApiError> {
  const session = useSession();
  return useQuery<T, ApiError>({
    queryKey: ['clinical', session.generation, path],
    queryFn: ({ signal }) => session.client.get<T>(path, signal),
    enabled: enabled && session.status === 'authenticated' && !session.identityError,
  });
}
