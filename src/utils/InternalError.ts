import type { Context } from "hono";
import { getApiErrorShape } from "./apiTypes";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export function handleInternalError(c: Context) {
  return c.json(
    getApiErrorShape({
      success: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_SERVER_ERROR",
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    }),
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
}
