import { Request, Response } from 'express';
import { WishlistService } from './wishlist.service';
import { sendSuccess } from '../../utils/apiResponse';
import { WishlistItemBody } from './wishlist.validation';

export class WishlistController {
  public static async getWishlist(req: Request, res: Response): Promise<void> {
    const items = await WishlistService.listWishlist(req.user!.id);
    sendSuccess(res, { items }, 200);
  }

  public static async addItem(req: Request, res: Response): Promise<void> {
    const body = req.body as WishlistItemBody;
    const items = await WishlistService.addToWishlist(req.user!.id, body.productId);
    sendSuccess(res, { items }, 200);
  }

  public static async removeItem(req: Request, res: Response): Promise<void> {
    const { productId } = req.params as { productId: string };
    const items = await WishlistService.removeFromWishlist(req.user!.id, productId);
    sendSuccess(res, { items }, 200);
  }
}
