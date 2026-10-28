import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authRoutes } from "./auth/auth";

const checkHealth = createRoute({
  method: "get",
  path: "/health",
  tags: ["health"],
  responses: {
    200: {
      description: "application is working",
    },
  },
});

const apiV1Routes = new OpenAPIHono().basePath("/api/v1");
apiV1Routes.route("/", authRoutes);
apiV1Routes.openapi(checkHealth, (c) => {
  return c.json({
    message: "version one is working",
  });
});

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

export { apiV1Routes };
