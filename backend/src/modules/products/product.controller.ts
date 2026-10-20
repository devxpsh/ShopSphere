import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  AdjustInventoryInput,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from './product.schemas';
import { productService } from './product.service';

export class ProductController {
  public listProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ProductListQuery;
    const isAdmin = req.user?.role === Role.ADMIN;

    const result = await productService.listProducts(query, { isAdmin });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  public getProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const slugOrId = req.params.slugOrId as string;
    const isAdmin = req.user?.role === Role.ADMIN;

    const product = await productService.getProductBySlugOrId(slugOrId, { isAdmin });

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  public createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductInput;
    const product = await productService.createProduct(body, req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: { product },
    });
  });

  public updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const body = req.body as UpdateProductInput;
    const product = await productService.updateProduct(id, body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: { product },
    });
  });

  public adjustInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const body = req.body as AdjustInventoryInput;
    const result = await productService.adjustInventory(id, body, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Inventory adjusted successfully.',
      data: result,
    });
  });

  public deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const product = await productService.deleteProduct(id);

    res.status(200).json({
      success: true,
      message: 'Product deactivated successfully.',
      data: { product },
    });
  });
}

export const productController = new ProductController();
