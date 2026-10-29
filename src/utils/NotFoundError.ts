import type { Context } from "hono";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

function handleNotFoundError(c: Context, error: NotFoundError) {
  c.status(StatusCodes.NOT_FOUND);
  return c.json({
    success: false,
    statusCode: StatusCodes.NOT_FOUND,
    code: "NOT_FOUND",
    message: error.message || ReasonPhrases.NOT_FOUND,
  });
}

export { NotFoundError, handleNotFoundError };
