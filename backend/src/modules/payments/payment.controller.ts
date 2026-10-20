import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess } from '../../utils/apiResponse';
import {
  MockPaymentVerifyInput,
  RazorpayCreateOrderInput,
  RazorpayVerifyPaymentInput,
} from './payment.validation';

export class PaymentController {
  public static async verifyMockPayment(req: Request, res: Response): Promise<void> {
    const body = req.body as MockPaymentVerifyInput;
    const order = await PaymentService.verifyMockPayment(req.user!.id, body);
    sendSuccess(res, { order }, 200);
  }

  public static async createRazorpayOrder(req: Request, res: Response): Promise<void> {
    const body = req.body as RazorpayCreateOrderInput;
    const razorpayOrder = await PaymentService.createRazorpayOrder(req.user!.id, body);
    sendSuccess(res, { razorpayOrder }, 200);
  }

  public static async verifyRazorpayPayment(req: Request, res: Response): Promise<void> {
    const body = req.body as RazorpayVerifyPaymentInput;
    const order = await PaymentService.verifyRazorpayPayment(req.user!.id, body);
    sendSuccess(res, { order }, 200);
  }

  public static async razorpayWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const eventId = req.headers['x-razorpay-event-id'] as string | undefined;
    const rawBody = JSON.stringify(req.body);
    const result = await PaymentService.handleRazorpayWebhook(
      rawBody,
      signature,
      eventId,
      req.body as Record<string, unknown>
    );
    sendSuccess(res, result, 200);
  }
}
