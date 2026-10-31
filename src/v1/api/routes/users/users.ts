import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import { type Handler } from "hono";
import { selectUserSchema, updateUserSchema } from "../../../../../auth-schema";
import { type RouteHandler } from "@hono/zod-openapi";
import { auth } from "../../../../auth";

const usersRoutes = new OpenAPIHono<{
  Variables: AuthContext;
}>().basePath("/users");

const userInfoRoute = createRoute({
  method: "get",
  path: "/info",
  description: "User info",
  tags: ["Users"],
  responses: {
    200: {
      content: {
        "application/json": {
          description: "user info",
          schema: selectUserSchema,
        },
      },
    },
  },
});

const handleGetUserInfo: Handler<{
  Variables: AuthContext;
}> = async (c) => {
  const user = getContextUser(c);
  return c.json(user, 200);
};

usersRoutes.openapi(userInfoRoute, handleGetUserInfo);

const updateUserRoute = createRoute({
  method: "patch",
  path: "/",
  description: "Update user",
  tags: ["Users"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.boolean(),
          }),
        },
      },
    },
  },
});

const handleUpdateUser: RouteHandler<
  typeof updateUserRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const props = c.req.valid("json");
  const user = getContextUser(c);
  const firstname = props.firstName || user.firstName;
  const lastName = props.lastName || user.lastName;
  const result = await auth.api.updateUser({
    headers: c.req.raw.headers,
    body: {
      ...props,
      name: `${firstname} ${lastName}`.trim(),
    },
  });
  return c.json(result, 200);
};

usersRoutes.openapi(updateUserRoute, handleUpdateUser);

export { usersRoutes };
