import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects, ZodObject, ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: AnyZodObject | ZodEffects<AnyZodObject>;
}

export const validateRequest =
  (schemas: ValidationSchemas | AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const resolved: ValidationSchemas =
        schemas instanceof ZodObject
          ? (schemas.shape as ValidationSchemas)
          : (schemas as ValidationSchemas);

      if (resolved.body) {
        req.body = await resolved.body.parseAsync(req.body);
      }
      if (resolved.query) {
        req.query = (await resolved.query.parseAsync(req.query)) as Request['query'];
      }
      if (resolved.params) {
        req.params = (await resolved.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      next(error);
    }
  };
