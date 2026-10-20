import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { sendSuccess } from '../../utils/apiResponse';
import { CreateReviewInput } from './review.validation';

export class ReviewController {
  public static async listProductReviews(req: Request, res: Response): Promise<void> {
    const { productId } = req.params as { productId: string };
    const reviews = await ReviewService.listProductReviews(productId);
    sendSuccess(res, { reviews }, 200);
  }

  public static async upsertReview(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateReviewInput;
    const result = await ReviewService.upsertReview(req.user!.id, body);
    sendSuccess(res, result, 201);
  }

  public static async deleteReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const result = await ReviewService.deleteReview(id, req.user!.id, req.user!.role);
    sendSuccess(res, result, 200);
  }
}
