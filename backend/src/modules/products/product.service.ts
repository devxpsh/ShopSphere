import { InventoryReason, Prisma, ReviewStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertValidPaise } from '../../utils/currency';
import { isUuid, slugify } from '../../utils/slug';
import {
  AdjustInventoryInput,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from './product.schemas';

const productSummaryInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }],
    select: {
      id: true,
      url: true,
      altText: true,
      displayOrder: true,
      isPrimary: true,
    },
  },
};

type ProductWithSummary = Prisma.ProductGetPayload<{
  include: typeof productSummaryInclude;
}>;

function serializeProduct(product: ProductWithSummary) {
  const discountPercentage =
    product.mrpPaise > product.pricePaise
      ? Math.round(((product.mrpPaise - product.pricePaise) / product.mrpPaise) * 100)
      : 0;
  const ratingNumber = Number(product.averageRating ?? 0);
  const isDemo =
    product.sku.startsWith('DEMO-') || product.name.includes('[DEMO]');

  return {
    id: product.id,
    categoryId: product.categoryId,
    category: product.category,
    sku: product.sku,
    name: product.name,
    title: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    brand: product.brand,
    pricePaise: product.pricePaise,
    mrpPaise: product.mrpPaise,
    discountPercentage,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    inStock: product.stockQuantity > 0,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isDemo,
    specifications: product.specifications,
    averageRating: ratingNumber,
    ratingAvg: ratingNumber,
    reviewCount: product.reviewCount,
    images: product.images,
    primaryImage: product.images[0]?.url ?? null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export class ProductService {
  public async listProducts(
    query: ProductListQuery,
    options: { isAdmin?: boolean } = {}
  ) {
    const isAdmin = options.isAdmin ?? false;
    const includeInactive = isAdmin && query.includeInactive === true;

    const where: Prisma.ProductWhereInput = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    const searchTerm = (query.q ?? query.search)?.trim();
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      if (isUuid(query.category)) {
        where.OR = [
          ...(where.OR ?? []),
          { categoryId: query.category },
          { category: { parentId: query.category } },
        ];
        // If search term was also present, combine with AND
        if (searchTerm) {
          delete where.OR;
          where.AND = [
            {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { brand: { contains: searchTerm, mode: 'insensitive' } },
                { sku: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { categoryId: query.category },
                { category: { parentId: query.category } },
              ],
            },
          ];
        }
      } else {
        const categoryFilter: Prisma.ProductWhereInput = {
          OR: [
            { category: { slug: query.category } },
            { category: { parent: { slug: query.category } } },
          ],
        };
        if (where.OR) {
          const existingOr = where.OR;
          delete where.OR;
          where.AND = [{ OR: existingOr }, categoryFilter];
        } else {
          where.AND = [...(Array.isArray(where.AND) ? where.AND : []), categoryFilter];
        }
      }
    }

    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }

    if (query.minPricePaise !== undefined || query.maxPricePaise !== undefined) {
      where.pricePaise = {
        ...(query.minPricePaise !== undefined ? { gte: query.minPricePaise } : {}),
        ...(query.maxPricePaise !== undefined ? { lte: query.maxPricePaise } : {}),
      };
    }

    if (query.inStock === true) {
      where.stockQuantity = { gt: 0 };
    } else if (query.inStock === false) {
      where.stockQuantity = { equals: 0 };
    }

    if (query.featured !== undefined) {
      where.isFeatured = query.featured;
    }

    if (query.minRating !== undefined) {
      where.averageRating = { gte: query.minRating };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (query.sortBy) {
      case 'price_asc':
        orderBy = { pricePaise: 'asc' };
        break;
      case 'price_desc':
        orderBy = { pricePaise: 'desc' };
        break;
      case 'rating_desc':
        orderBy = { averageRating: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const [totalItems, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: productSummaryInclude,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      items: products.map(serializeProduct),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getProductBySlugOrId(
    slugOrId: string,
    options: { isAdmin?: boolean } = {}
  ) {
    const isAdmin = options.isAdmin ?? false;
    const whereClause: Prisma.ProductWhereInput = isUuid(slugOrId)
      ? { id: slugOrId, ...(isAdmin ? {} : { isActive: true }) }
      : { slug: slugOrId, ...(isAdmin ? {} : { isActive: true }) };

    const product = await prisma.product.findFirst({
      where: whereClause,
      include: {
        ...productSummaryInclude,
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            isVerifiedPurchase: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      take: 4,
      orderBy: { averageRating: 'desc' },
      include: productSummaryInclude,
    });

    return {
      ...serializeProduct(product),
      reviews: product.reviews,
      relatedProducts: relatedProducts.map(serializeProduct),
    };
  }

  public async createProduct(input: CreateProductInput, actorUserId: string) {
    assertValidPaise(input.pricePaise, 'pricePaise');
    assertValidPaise(input.mrpPaise, 'mrpPaise');

    if (input.mrpPaise < input.pricePaise) {
      throw new AppError(
        'MRP in paise must be greater than or equal to selling price in paise.',
        400,
        'INVALID_PRODUCT_PRICING'
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    const slug = input.slug ?? slugify(input.name);
    if (!slug) {
      throw new AppError('Could not generate a valid slug for product.', 400, 'INVALID_SLUG');
    }

    const imagesInput = input.images ?? [];
    const normalizedImages = imagesInput.map((img, idx) => ({
      url: img.url,
      altText: img.altText ?? input.name,
      displayOrder: img.displayOrder ?? idx,
      isPrimary: idx === 0 ? true : Boolean(img.isPrimary),
    }));

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: input.categoryId,
          sku: input.sku,
          name: input.name,
          slug,
          shortDescription: input.shortDescription ?? null,
          description: input.description,
          brand: input.brand ?? null,
          pricePaise: input.pricePaise,
          mrpPaise: input.mrpPaise,
          stockQuantity: input.stockQuantity ?? 0,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          isActive: input.isActive ?? true,
          isFeatured: input.isFeatured ?? false,
          specifications: input.specifications
            ? (input.specifications as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          images:
            normalizedImages.length > 0
              ? {
                  create: normalizedImages,
                }
              : undefined,
        },
        include: productSummaryInclude,
      });

      if ((input.stockQuantity ?? 0) > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            actorUserId,
            changeQuantity: input.stockQuantity ?? 0,
            previousStock: 0,
            newStock: input.stockQuantity ?? 0,
            reason: InventoryReason.INITIAL_STOCK,
            notes: 'Initial stock on product creation',
          },
        });
      }

      return product;
    });

    return serializeProduct(created);
  }

  public async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    const nextPricePaise = input.pricePaise ?? existing.pricePaise;
    const nextMrpPaise = input.mrpPaise ?? existing.mrpPaise;

    assertValidPaise(nextPricePaise, 'pricePaise');
    assertValidPaise(nextMrpPaise, 'mrpPaise');

    if (nextMrpPaise < nextPricePaise) {
      throw new AppError(
        'MRP in paise must be greater than or equal to selling price in paise.',
        400,
        'INVALID_PRODUCT_PRICING'
      );
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (input.images.length > 0) {
          await tx.productImage.createMany({
            data: input.images.map((img, idx) => ({
              productId: id,
              url: img.url,
              altText: img.altText ?? (input.name ?? existing.name),
              displayOrder: img.displayOrder ?? idx,
              isPrimary: idx === 0 ? true : Boolean(img.isPrimary),
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.shortDescription !== undefined
            ? { shortDescription: input.shortDescription }
            : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.brand !== undefined ? { brand: input.brand } : {}),
          ...(input.pricePaise !== undefined ? { pricePaise: input.pricePaise } : {}),
          ...(input.mrpPaise !== undefined ? { mrpPaise: input.mrpPaise } : {}),
          ...(input.lowStockThreshold !== undefined
            ? { lowStockThreshold: input.lowStockThreshold }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.specifications !== undefined
            ? {
                specifications: input.specifications
                  ? (input.specifications as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              }
            : {}),
        },
        include: productSummaryInclude,
      });
    });

    return serializeProduct(updated);
  }

  public async adjustInventory(
    productId: string,
    input: AdjustInventoryInput,
    actorUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
      }

      const previousStock = product.stockQuantity;
      const newStock = previousStock + input.changeQuantity;

      if (newStock < 0) {
        throw new AppError(
          `Insufficient stock for adjustment. Current stock is ${previousStock}, cannot change by ${input.changeQuantity}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
        include: productSummaryInclude,
      });

      const inventoryLog = await tx.inventoryLog.create({
        data: {
          productId,
          actorUserId,
          changeQuantity: input.changeQuantity,
          previousStock,
          newStock,
          reason: input.reason,
          notes: input.notes ?? null,
        },
      });

      return {
        product: serializeProduct(updatedProduct),
        inventoryLog,
      };
    });
  }

  public async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    const deactivated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: productSummaryInclude,
    });

    return serializeProduct(deactivated);
  }
}

export const productService = new ProductService();
