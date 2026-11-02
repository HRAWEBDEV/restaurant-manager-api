import { createRoute, OpenAPIHono, type RouteHandler } from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import {
  WorkspacesService,
  getWorkspacesResultSchema,
} from "../../../../services/workspacesService";
import { db } from "../../../../db/connect";

const workspacesRoutes = new OpenAPIHono<{
  Variables: AuthContext;
}>().basePath("/workspaces");

const getWorkspacesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workspaces"],
  description: "user workspaces",
  request: {},
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getWorkspacesResultSchema,
        },
      },
    },
  },
});

const handleGetWorkspaces: RouteHandler<
  typeof getWorkspacesRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  const workspaceService = new WorkspacesService(db);
  const result = await workspaceService.getWorkspaces({
    filters: {
      userId: user.id,
    },
  });
  return c.json(result, 200);
};

workspacesRoutes.openapi(getWorkspacesRoute, handleGetWorkspaces);

export { workspacesRoutes };
