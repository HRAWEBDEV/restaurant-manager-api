import type { DrizzleQueryError } from "drizzle-orm";
import type { Context } from "hono";
import { getApiErrorShape } from "./apiTypes";
import { StatusCodes } from "http-status-codes";
import { handleInternalError } from "./InternalError";

export function handleDbError(c: Context, err: DrizzleQueryError) {
  if (err.cause && "code" in err.cause) {
    if ((err.cause.code as string) == "23505") {
      c.status(StatusCodes.BAD_REQUEST);
      return c.json({
        ...getApiErrorShape({
          success: false,
          statusCode: StatusCodes.BAD_REQUEST,
          code: "RESOURCE_ALREADY_EXISTS",
        }),
      });
    }
  }
  return handleInternalError(c);
}
