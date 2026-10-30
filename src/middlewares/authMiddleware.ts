import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import {
  type AuthContext,
  setContextSession,
  setContextUser,
} from "../utils/AuthContext";
import { auth } from "../auth";
import { getApiErrorShape } from "../utils/apiTypes";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export const authMiddleware: MiddlewareHandler<{
  Variables: AuthContext;
}> = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        code: ReasonPhrases.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
      }),
      StatusCodes.UNAUTHORIZED,
    );
  }
  setContextSession(c, session["session"]);
  setContextUser(c, session["user"]);
  await next();
});
