import type { Context } from "hono";
import type { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import z from "zod";
import { getApiErrorShape } from "./apiTypes";

export function handleZodError(c: Context, err: ZodError) {
  c.status(StatusCodes.BAD_REQUEST);
  return c.json({
    ...getApiErrorShape({
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      code: "VALIDATION_ERROR",
    }),
    error: {
      name: err.name,
      message: z.treeifyError(err),
    },
  });
}
