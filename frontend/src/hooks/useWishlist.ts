import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../api/wishlist.api';
import { useAuth } from '../context/AuthContext';
import type { WishlistItem } from '../types';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export function useWishlist() {
  const { isAuthenticated } = useAuth();

  return useQuery<WishlistItem[]>({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: () => wishlistApi.getWishlist(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistApi.addToWishlist(productId),
    onSuccess: (items) => {
      queryClient.setQueryData(WISHLIST_QUERY_KEY, items);
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistApi.removeFromWishlist(productId),
    onSuccess: (items) => {
      queryClient.setQueryData(WISHLIST_QUERY_KEY, items);
    },
  });
}
