import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { isUuid, slugify } from '../../utils/slug';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schemas';

export class CategoryService {
  public async listCategories(options: { includeInactive?: boolean } = {}) {
    const includeInactive = options.includeInactive ?? false;

    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: includeInactive ? {} : { isActive: true },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
        _count: {
          select: {
            products: includeInactive ? true : { where: { isActive: true } },
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      parent: cat.parent,
      children: cat.children,
      isActive: cat.isActive,
      productCount: cat._count.products,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  public async getCategoryBySlugOrId(
    slugOrId: string,
    options: { includeInactive?: boolean } = {}
  ) {
    const includeInactive = options.includeInactive ?? false;
    const whereClause = isUuid(slugOrId)
      ? { id: slugOrId, ...(includeInactive ? {} : { isActive: true }) }
      : { slug: slugOrId, ...(includeInactive ? {} : { isActive: true }) };

    const category = await prisma.category.findFirst({
      where: whereClause,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: includeInactive ? {} : { isActive: true },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
        _count: {
          select: {
            products: includeInactive ? true : { where: { isActive: true } },
          },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      parent: category.parent,
      children: category.children,
      isActive: category.isActive,
      productCount: category._count.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  public async createCategory(input: CreateCategoryInput) {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) {
      throw new AppError('Could not generate a valid slug for category.', 400, 'INVALID_SLUG');
    }

    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new AppError('Parent category not found.', 404, 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    const created = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
      },
    });

    return created;
  }

  public async updateCategory(id: string, input: UpdateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    if (input.parentId && input.parentId === id) {
      throw new AppError(
        'A category cannot be its own parent.',
        400,
        'INVALID_CATEGORY_PARENT'
      );
    }

    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new AppError('Parent category not found.', 404, 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    const slug =
      input.slug ?? (input.name && !input.slug ? slugify(input.name) : undefined);

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return updated;
  }

  public async deleteCategory(id: string) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!existing) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    // If category has products, soft-deactivate to preserve referential integrity
    if (existing._count.products > 0) {
      const deactivated = await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        action: 'deactivated' as const,
        category: deactivated,
      };
    }

    await prisma.category.delete({ where: { id } });
    return {
      action: 'deleted' as const,
      category: existing,
    };
  }
}

export const categoryService = new CategoryService();
