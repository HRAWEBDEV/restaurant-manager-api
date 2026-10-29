import type { DrizzleQueryError } from "drizzle-orm";
import type { Context } from "hono";
import { getApiErrorShape } from "./apiTypes";
import { StatusCodes } from "http-status-codes";
import { APIError } from "better-auth";

export function handleAuthError(c: Context, err: APIError) {
  c.status(StatusCodes.BAD_REQUEST);
  return c.json({
    ...getApiErrorShape({
      success: false,
      code: err.body?.code,
      message: err.body?.message,
      statusCode: StatusCodes.BAD_REQUEST,
    }),
  });
}
