import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authRoutes } from "./auth/auth";
import { ZodError } from "zod";
import { handleZodError } from "../../utils/ZodError";
import { handleNotFoundError, NotFoundError } from "../../utils/NotFoundError";
import { DrizzleQueryError } from "drizzle-orm";
import { handleDbError } from "../../utils/DbError";
import { handleInternalError } from "../../utils/InternalError";
import { APIError } from "better-auth";
import { handleAuthError } from "../../utils/AuthError";
import { authMiddleware } from "../../middlewares/authMiddleware";

const checkHealth = createRoute({
  method: "get",
  description: "check if api is running",
  path: "/health",
  tags: ["health"],
  responses: {
    200: {
      description: "application is running",
    },
  },
});

const apiV1Routes = new OpenAPIHono().basePath("/api/v1");
apiV1Routes.openapi(checkHealth, (c) => {
  return c.json({
    message: "version one is running",
  });
});
apiV1Routes.use(authMiddleware);
apiV1Routes.route("/", authRoutes);

// doc
apiV1Routes.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Restaurant Manager API",
    version: "1.0.0",
    description: "Version 1 API",
  },
});
apiV1Routes.get(
  "/doc/ui",
  swaggerUI({
    url: "/api/v1/doc",
  }),
);

apiV1Routes.onError((err, c) => {
  if (err instanceof ZodError) {
    return handleZodError(c, err);
  }
  if (err instanceof NotFoundError) {
    return handleNotFoundError(c, err);
  }
  if (err instanceof DrizzleQueryError) {
    return handleDbError(c, err);
  }
  if (err instanceof APIError) {
    return handleAuthError(c, err);
  }
  // internal error
  return handleInternalError(c);
});

export { apiV1Routes };
