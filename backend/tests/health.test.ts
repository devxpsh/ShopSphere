import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import {
  assertValidPaise,
  calculatePercentageDiscountPaise,
  formatPaiseToINR,
} from '../src/utils/currency';

describe('Phase 1 Foundation — Health Endpoint & Core Utilities', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/health & /api/health', () => {
    it('returns 200 OK and confirms live PostgreSQL database connectivity', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('shopsphere-backend');
      expect(response.body.data.database.status).toBe('connected');
      expect(typeof response.body.data.database.latencyMs).toBe('number');
    });

    it('supports the /api/health convenience alias', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.database.status).toBe('connected');
    });
  });

  describe('404 Not Found Handler', () => {
    it('returns a structured 404 JSON error for unknown routes', async () => {
      const response = await request(app).get('/api/v1/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('Integer Paise Currency Utilities', () => {
    it('accepts valid non-negative integer paise and rejects floats or negative amounts', () => {
      expect(() => assertValidPaise(0)).not.toThrow();
      expect(() => assertValidPaise(149900)).not.toThrow();
      expect(() => assertValidPaise(1499.5)).toThrow();
      expect(() => assertValidPaise(-100)).toThrow();
    });

    it('formats integer paise into Indian Rupee currency string', () => {
      const formatted = formatPaiseToINR(149900);
      expect(formatted).toContain('1,499.00');
    });

    it('calculates percentage discounts in integer paise with optional cap', () => {
      // 20% of ₹1,500.00 (150000 paise) = ₹300.00 (30000 paise)
      expect(calculatePercentageDiscountPaise(150000, 20)).toBe(30000);
      // Capped at ₹200.00 (20000 paise)
      expect(calculatePercentageDiscountPaise(150000, 20, 20000)).toBe(20000);
    });
  });
});
