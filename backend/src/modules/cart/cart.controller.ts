import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { cartService } from './cart.service';
import {
  AddCartItemInput,
  ApplyCartCouponInput,
  MergeGuestCartInput,
  UpdateCartItemInput,
} from './cart.validation';

export class CartController {
  getCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.user!.id);
    res.status(200).json({
      success: true,
      data: { cart },
    });
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as AddCartItemInput;
    const cart = await cartService.addItem(req.user!.id, body);
    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: { cart },
    });
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateCartItemInput;
    const cart = await cartService.updateItemQuantity(
      req.user!.id,
      req.params.productId as string,
      body
    );
    res.status(200).json({
      success: true,
      message: 'Cart updated.',
      data: { cart },
    });
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.removeItem(
      req.user!.id,
      req.params.productId as string
    );
    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: { cart },
    });
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.clearCart(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Cart cleared.',
      data: { cart },
    });
  });

  applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ApplyCartCouponInput;
    const cart = await cartService.applyCoupon(req.user!.id, body.code);
    res.status(200).json({
      success: true,
      message: `Coupon "${cart.appliedCoupon?.code}" applied to cart.`,
      data: { cart },
    });
  });

  removeCoupon = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.removeCoupon(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Coupon removed from cart.',
      data: { cart },
    });
  });

  mergeGuestCart = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as MergeGuestCartInput;
    const cart = await cartService.mergeGuestCart(req.user!.id, body);
    res.status(200).json({
      success: true,
      message: 'Guest cart merged.',
      data: { cart },
    });
  });
}

export const cartController = new CartController();
