import { apiRequest } from './client';
import type { Category } from '../types';

export const categoriesApi = {
  async listCategories(): Promise<Category[]> {
    const res = await apiRequest<{ categories: Category[] }>('/categories');
    return res.data.categories;
  },

  async getCategoryBySlugOrId(slugOrId: string): Promise<Category> {
    const res = await apiRequest<{ category: Category }>(
      `/categories/${encodeURIComponent(slugOrId)}`
    );
    return res.data.category;
  },
};
