import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '../api/products.api';
import type { ProductFilterParams } from '../types';

export function useProducts(filters: ProductFilterParams = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.listProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useProductDetail(slugOrId: string | undefined) {
  return useQuery({
    queryKey: ['product', slugOrId],
    queryFn: () => productsApi.getProductBySlugOrId(slugOrId!),
    enabled: Boolean(slugOrId),
    staleTime: 60 * 1000,
  });
}
