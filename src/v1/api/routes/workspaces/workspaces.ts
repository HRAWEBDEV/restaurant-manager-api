import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthContext } from "../../../../utils/AuthContext";

const workspacesRoutes = new OpenAPIHono<{
  Variables: AuthContext;
}>().basePath("/workspaces");

export { workspacesRoutes };
