import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { AdminService } from './admin.service';
import {
  AdminInventoryLogsQueryInput,
  AdminOrdersQueryInput,
  AdminReviewsQueryInput,
  CreateAdminCouponInput,
  ModerateReviewInput,
  UpdateAdminCouponInput,
  UpdateOrderStatusInput,
} from './admin.schemas';

export class AdminController {
  public static async getAnalytics(_req: Request, res: Response) {
    const analytics = await AdminService.getDashboardAnalytics();
    res.status(200).json({
      success: true,
      data: { analytics },
    });
  }

  public static async listOrders(req: Request, res: Response) {
    const query = req.query as unknown as AdminOrdersQueryInput;
    const result = await AdminService.listAllOrders(query);
    res.status(200).json({
      success: true,
      data: { orders: result.orders },
      pagination: result.pagination,
    });
  }

  public static async updateOrderStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const orderId = String(req.params.id);
    const body = req.body as UpdateOrderStatusInput;
    const order = await AdminService.updateOrderStatus(
      orderId,
      req.user.id,
      body
    );

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order.status}.`,
      data: { order },
    });
  }

  public static async listInventoryLogs(req: Request, res: Response) {
    const query = req.query as unknown as AdminInventoryLogsQueryInput;
    const result = await AdminService.listInventoryLogs(query);
    res.status(200).json({
      success: true,
      data: { logs: result.logs },
      pagination: result.pagination,
    });
  }

  public static async listCoupons(_req: Request, res: Response) {
    const coupons = await AdminService.listAllCoupons();
    res.status(200).json({
      success: true,
      data: { coupons },
    });
  }

  public static async createCoupon(req: Request, res: Response) {
    const body = req.body as CreateAdminCouponInput;
    const coupon = await AdminService.createCoupon(body);
    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      data: { coupon },
    });
  }

  public static async updateCoupon(req: Request, res: Response) {
    const id = String(req.params.id);
    const body = req.body as UpdateAdminCouponInput;
    const coupon = await AdminService.updateCoupon(id, body);
    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully.',
      data: { coupon },
    });
  }

  public static async deleteCoupon(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await AdminService.deleteCoupon(id);
    res.status(200).json({
      success: true,
      message:
        result.action === 'DELETED'
          ? 'Coupon deleted permanently.'
          : 'Coupon has historical order redemptions and was deactivated.',
      data: result,
    });
  }

  public static async listReviews(req: Request, res: Response) {
    const query = req.query as unknown as AdminReviewsQueryInput;
    const result = await AdminService.listAllReviews(query);
    res.status(200).json({
      success: true,
      data: { reviews: result.reviews },
      pagination: result.pagination,
    });
  }

  public static async moderateReview(req: Request, res: Response) {
    const reviewId = String(req.params.id);
    const body = req.body as ModerateReviewInput;
    const result = await AdminService.moderateReview(reviewId, body);
    res.status(200).json({
      success: true,
      message: `Review marked as ${result.review.status}.`,
      data: result,
    });
  }
}
