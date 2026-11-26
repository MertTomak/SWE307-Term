// validate (400): checks the body, query and path parameters with zod before the
// controller runs (5.8.4.3, A05). The parsed values are stored in res.locals.input.
import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export interface Input<B = unknown, Q = unknown, P = unknown> {
  body: B;
  query: Q;
  params: P;
}

export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // A ZodError thrown here is turned into 400 VALIDATION_ERROR by the error handler.
    res.locals.input = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
    } satisfies Input;
    next();
  };
}

/** The validated input of the current request. */
export const input = <B = unknown, Q = unknown, P = unknown>(res: Response) => res.locals.input as Input<B, Q, P>;
