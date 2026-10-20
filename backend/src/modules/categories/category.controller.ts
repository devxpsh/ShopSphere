import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schemas';
import { categoryService } from './category.service';

export class CategoryController {
  public listCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const isAdmin = req.user?.role === Role.ADMIN;
    const includeInactive = isAdmin && req.query.includeInactive === 'true';

    const categories = await categoryService.listCategories({ includeInactive });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  });

  public getCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const slugOrId = req.params.slugOrId as string;
    const isAdmin = req.user?.role === Role.ADMIN;
    const includeInactive = isAdmin && req.query.includeInactive === 'true';

    const category = await categoryService.getCategoryBySlugOrId(slugOrId, {
      includeInactive,
    });

    res.status(200).json({
      success: true,
      data: { category },
    });
  });

  public createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCategoryInput;
    const category = await categoryService.createCategory(body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: { category },
    });
  });

  public updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const body = req.body as UpdateCategoryInput;
    const category = await categoryService.updateCategory(id, body);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: { category },
    });
  });

  public deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const result = await categoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message:
        result.action === 'deactivated'
          ? 'Category has linked products and was deactivated.'
          : 'Category deleted successfully.',
      data: result,
    });
  });
}

export const categoryController = new CategoryController();
