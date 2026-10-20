import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { couponService } from './coupon.service';
import { CreateCouponInput, ValidateCouponInput } from './coupon.validation';

export class CouponController {
  listActive = asyncHandler(async (_req: Request, res: Response) => {
    const coupons = await couponService.listActiveCoupons();
    res.status(200).json({
      success: true,
      data: { coupons },
    });
  });

  validate = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ValidateCouponInput;
    const userId = req.user!.id;

    let subtotalPaise = body.subtotalPaise;
    if (subtotalPaise === undefined) {
      // Calculate from the user's live cart if not explicitly passed
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: { select: { pricePaise: true, isActive: true } } },
          },
        },
      });
      subtotalPaise = (cart?.items ?? []).reduce((acc, item) => {
        if (!item.product.isActive) return acc;
        return acc + item.product.pricePaise * item.quantity;
      }, 0);
    }

    const result = await couponService.validateAndCalculateDiscount(
      body.code,
      subtotalPaise,
      userId
    );

    res.status(200).json({
      success: true,
      message: `Coupon "${result.coupon.code}" is valid.`,
      data: result,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateCouponInput;
    const coupon = await couponService.createCoupon(body);
    res.status(201).json({
      success: true,
      message: 'Coupon created.',
      data: { coupon },
    });
  });
}

export const couponController = new CouponController();
