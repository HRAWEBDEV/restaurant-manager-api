import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import { type Handler } from "hono";
import { selectUserSchema } from "../../../../../auth-schema";

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

const getUserInfo: Handler<{
  Variables: AuthContext;
}> = async (c) => {
  const user = getContextUser(c);
  return c.json(user, 200);
};

usersRoutes.openapi(userInfoRoute, getUserInfo);

export { usersRoutes };
