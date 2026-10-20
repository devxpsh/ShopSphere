import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { sendSuccess } from '../../utils/apiResponse';
import { CancelOrderInput, CreateOrderInput, ListOrdersQueryInput } from './order.validation';

export class OrderController {
  public static async createOrder(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateOrderInput;
    const order = await OrderService.createOrderFromCart(req.user!.id, body);
    sendSuccess(res, { order }, 201);
  }

  public static async listMyOrders(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListOrdersQueryInput;
    const result = await OrderService.listUserOrders(req.user!.id, query);
    sendSuccess(res, { orders: result.orders }, 200, result.pagination);
  }

  public static async getOrderById(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const order = await OrderService.getOrderById(id, req.user!.id, req.user!.role);
    sendSuccess(res, { order }, 200);
  }

  public static async cancelOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const body = req.body as CancelOrderInput;
    const order = await OrderService.cancelOrder(id, req.user!.id, req.user!.role, body);
    sendSuccess(res, { order }, 200);
  }
}
