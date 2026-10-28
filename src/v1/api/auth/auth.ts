import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "../../../auth";

const authRoutes = new OpenAPIHono().basePath("/auth");

export { authRoutes };
