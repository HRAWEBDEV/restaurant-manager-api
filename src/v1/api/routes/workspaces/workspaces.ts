import {
  createRoute,
  OpenAPIHono,
  z,
  type RouteHandler,
} from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import {
  WorkspacesService,
  getWorkspacesResultSchema,
} from "../../../../services/workspacesService";
import {
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../../db/schemas/workspaces";
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

const createWorkspacesRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Workspaces"],
  description: "create user workspaces",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertWorkspaceSchema,
        },
      },
    },
  },
  responses: {
    200: {},
  },
});

const handleCreateWorkspaces: RouteHandler<
  typeof createWorkspacesRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  const data = c.req.valid("json");
  const workspacesService = new WorkspacesService(db);
  const newWorkspace = await workspacesService.createWorkspace({
    ...data,
    createdBy: user.id,
  });
  return c.json(newWorkspace, 200);
};

workspacesRoutes.openapi(createWorkspacesRoute, handleCreateWorkspaces);

const updateWorkspacesRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Workspaces"],
  description: "update user workspaces",
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: "id",
          in: "path",
        },
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateWorkspaceSchema,
        },
      },
    },
  },
  responses: {
    200: {},
  },
});

const handleUpdateWorkspaces: RouteHandler<
  typeof updateWorkspacesRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const workspacesService = new WorkspacesService(db);
  const updatedWorkspace = await workspacesService.updateWorkspace({
    ...data,
    userId: user.id,
    id,
  });
  return c.json(updatedWorkspace, 200);
};

workspacesRoutes.openapi(updateWorkspacesRoute, handleUpdateWorkspaces);

export { workspacesRoutes };
