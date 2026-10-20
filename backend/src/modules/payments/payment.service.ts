import crypto from 'crypto';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import {
  MockPaymentVerifyInput,
  RazorpayCreateOrderInput,
  RazorpayVerifyPaymentInput,
} from './payment.validation';

const DEV_FALLBACK_RAZORPAY_SECRET = 'rzp_test_secret_shopsphere_dev';
const DEV_FALLBACK_WEBHOOK_SECRET = 'rzp_test_webhook_secret_shopsphere_dev';

function getRazorpaySecret(): string {
  if (env.RAZORPAY_KEY_SECRET && env.RAZORPAY_KEY_SECRET.trim().length > 0) {
    return env.RAZORPAY_KEY_SECRET.trim();
  }
  if (env.NODE_ENV !== 'production') {
    return DEV_FALLBACK_RAZORPAY_SECRET;
  }
  throw new AppError(
    'Razorpay secret key is not configured on the server',
    500,
    'PAYMENT_CONFIG_ERROR'
  );
}

export function getWebhookSecret(): string {
  if (env.RAZORPAY_WEBHOOK_SECRET && env.RAZORPAY_WEBHOOK_SECRET.trim().length > 0) {
    return env.RAZORPAY_WEBHOOK_SECRET.trim();
  }
  if (env.NODE_ENV !== 'production') {
    return DEV_FALLBACK_WEBHOOK_SECRET;
  }
  throw new AppError(
    'Razorpay webhook secret is not configured on the server',
    500,
    'PAYMENT_CONFIG_ERROR'
  );
}

export function computeRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

export function verifyHmacSignatureTimingSafe(expectedHex: string, receivedHex: string): boolean {
  try {
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const receivedBuf = Buffer.from(receivedHex, 'utf8');
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export class PaymentService {
  /**
   * Processes a mock payment for local/demo checkout flows.
   */
  public static async verifyMockPayment(userId: string, input: MockPaymentVerifyInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (order.userId !== userId) {
        throw new AppError(
          'You do not have permission to pay for this order',
          403,
          'FORBIDDEN_RESOURCE'
        );
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new AppError('Cannot process payment for a cancelled order', 400, 'ORDER_CANCELLED');
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new AppError('Order is already paid', 400, 'ORDER_ALREADY_PAID');
      }

      const existingPayment = order.payments[0];
      const randomHex = crypto.randomBytes(8).toString('hex');

      if (input.outcome === 'SUCCESS') {
        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              provider: PaymentProvider.MOCK,
              status: PaymentStatus.PAID,
              method: input.method,
              providerPaymentId: `mock_pay_${randomHex}`,
              providerSignature: `mock_sig_${randomHex}`,
              paidAt: new Date(),
              failureReason: null,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: PaymentProvider.MOCK,
              status: PaymentStatus.PAID,
              amountPaise: order.totalPaise,
              currency: 'INR',
              method: input.method,
              providerOrderId: `mock_ord_${randomHex}`,
              providerPaymentId: `mock_pay_${randomHex}`,
              providerSignature: `mock_sig_${randomHex}`,
              paidAt: new Date(),
            },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status:
              order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
          },
          include: {
            items: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        return updatedOrder;
      } else {
        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              provider: PaymentProvider.MOCK,
              status: PaymentStatus.FAILED,
              method: input.method,
              failureReason: 'Simulated mock payment failure declined by user/bank',
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: PaymentProvider.MOCK,
              status: PaymentStatus.FAILED,
              amountPaise: order.totalPaise,
              currency: 'INR',
              method: input.method,
              failureReason: 'Simulated mock payment failure declined by user/bank',
            },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
          include: {
            items: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        return updatedOrder;
      }
    });
  }

  /**
   * Initializes a Razorpay test-mode order for an existing ShopSphere order.
   */
  public static async createRazorpayOrder(userId: string, input: RazorpayCreateOrderInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.userId !== userId) {
      throw new AppError(
        'You do not have permission to initiate payment for this order',
        403,
        'FORBIDDEN_RESOURCE'
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Cannot pay for a cancelled order', 400, 'ORDER_CANCELLED');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppError('Order is already paid', 400, 'ORDER_ALREADY_PAID');
    }

    const razorpayOrderId = `order_rzp_${crypto.randomBytes(7).toString('hex')}`;
    const existingPayment = order.payments[0];

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          provider: PaymentProvider.RAZORPAY,
          status: PaymentStatus.PENDING,
          providerOrderId: razorpayOrderId,
          amountPaise: order.totalPaise,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.RAZORPAY,
          status: PaymentStatus.PENDING,
          amountPaise: order.totalPaise,
          currency: 'INR',
          providerOrderId: razorpayOrderId,
        },
      });
    }

    const secret = getRazorpaySecret();
    const simulatedPaymentId = `pay_rzp_${crypto.randomBytes(7).toString('hex')}`;
    const simulatedSignature = computeRazorpayPaymentSignature(
      razorpayOrderId,
      simulatedPaymentId,
      secret
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amountPaise: order.totalPaise,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_shopsphere_demo_key',
      prefill: {
        name: order.shippingRecipientName,
        email: order.user.email,
        contact: order.shippingPhone,
      },
      // Provided only in non-production environments so developers/interviewers can test
      // cryptographic HMAC-SHA256 verification without live Razorpay credentials
      ...(env.NODE_ENV !== 'production'
        ? {
            sandboxSimulation: {
              razorpayPaymentId: simulatedPaymentId,
              razorpaySignature: simulatedSignature,
            },
          }
        : {}),
    };
  }

  /**
   * Verifies a Razorpay payment signature server-side using HMAC-SHA256 and timingSafeEqual.
   */
  public static async verifyRazorpayPayment(userId: string, input: RazorpayVerifyPaymentInput) {
    const secret = getRazorpaySecret();

    const expectedSignature = computeRazorpayPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      secret
    );

    const isSignatureValid = verifyHmacSignatureTimingSafe(
      expectedSignature,
      input.razorpaySignature
    );

    if (!isSignatureValid) {
      throw new AppError(
        'Invalid Razorpay payment signature verification failed',
        400,
        'INVALID_PAYMENT_SIGNATURE'
      );
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (order.userId !== userId) {
        throw new AppError(
          'You do not have permission to verify payment for this order',
          403,
          'FORBIDDEN_RESOURCE'
        );
      }

      const paymentRecord = order.payments.find(
        (p) => p.providerOrderId === input.razorpayOrderId
      );

      if (!paymentRecord) {
        throw new AppError(
          'No matching Razorpay order record found for this order',
          400,
          'PAYMENT_ORDER_MISMATCH'
        );
      }

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          provider: PaymentProvider.RAZORPAY,
          status: PaymentStatus.PAID,
          providerPaymentId: input.razorpayPaymentId,
          providerSignature: input.razorpaySignature,
          method: input.method,
          paidAt: new Date(),
          failureReason: null,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status:
            order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
        },
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Handles server-to-server Razorpay webhooks with HMAC-SHA256 verification and idempotency.
   */
  public static async handleRazorpayWebhook(
    rawBodyString: string,
    signatureHeader: string | undefined,
    eventIdHeader: string | undefined,
    payload: Record<string, unknown>
  ) {
    if (!signatureHeader) {
      throw new AppError('Missing X-Razorpay-Signature header', 400, 'MISSING_WEBHOOK_SIGNATURE');
    }

    const webhookSecret = getWebhookSecret();
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyString)
      .digest('hex');

    if (!verifyHmacSignatureTimingSafe(expectedSignature, signatureHeader)) {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const eventId =
      eventIdHeader ||
      (typeof payload.id === 'string' ? payload.id : undefined) ||
      `evt_${crypto.createHash('sha256').update(rawBodyString).digest('hex').slice(0, 24)}`;

    // Idempotency check: has this webhook event already been processed?
    const existingWebhookPayment = await prisma.payment.findUnique({
      where: { webhookEventId: eventId },
    });

    if (existingWebhookPayment) {
      return { processed: false, reason: 'already_processed', eventId };
    }

    const eventType = typeof payload.event === 'string' ? payload.event : '';
    const paymentEntity = (
      (payload.payload as Record<string, unknown> | undefined)?.payment as
        | Record<string, unknown>
        | undefined
    )?.entity as Record<string, unknown> | undefined;

    if (!paymentEntity) {
      return { processed: false, reason: 'no_payment_entity', eventId };
    }

    const providerOrderId =
      typeof paymentEntity.order_id === 'string' ? paymentEntity.order_id : undefined;
    const providerPaymentId =
      typeof paymentEntity.id === 'string' ? paymentEntity.id : undefined;

    if (!providerOrderId) {
      return { processed: false, reason: 'missing_order_id', eventId };
    }

    const payment = await prisma.payment.findUnique({
      where: { providerOrderId },
      include: { order: true },
    });

    if (!payment) {
      return { processed: false, reason: 'payment_record_not_found', eventId };
    }

    if (eventType === 'payment.captured') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
            webhookEventId: eventId,
            rawPayload: payload as Prisma.InputJsonValue,
            paidAt: payment.paidAt ?? new Date(),
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status:
              payment.order.status === OrderStatus.PENDING
                ? OrderStatus.CONFIRMED
                : payment.order.status,
          },
        }),
      ]);

      return { processed: true, status: 'PAID', orderId: payment.orderId, eventId };
    }

    if (eventType === 'payment.failed') {
      const errorDesc =
        typeof paymentEntity.error_description === 'string'
          ? paymentEntity.error_description
          : 'Payment failed via webhook';

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
            webhookEventId: eventId,
            failureReason: errorDesc,
            rawPayload: payload as Prisma.InputJsonValue,
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        }),
      ]);

      return { processed: true, status: 'FAILED', orderId: payment.orderId, eventId };
    }

    return { processed: false, reason: 'unhandled_event_type', eventId };
  }
}
