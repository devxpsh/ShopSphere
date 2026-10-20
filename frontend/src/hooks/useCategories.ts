import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories.api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.listCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategory(slugOrId: string | undefined) {
  return useQuery({
    queryKey: ['categories', slugOrId],
    queryFn: () => categoriesApi.getCategoryBySlugOrId(slugOrId!),
    enabled: Boolean(slugOrId),
    staleTime: 5 * 60 * 1000,
  });
}
