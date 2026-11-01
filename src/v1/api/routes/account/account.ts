import {
  createRoute,
  z,
  OpenAPIHono,
  type RouteHandler,
} from "@hono/zod-openapi";
import { insertOrganizationSchema } from "../../../../db/schemas/organizations";
import { AccountServices } from "../../../../services/accountServices";
import { db } from "../../../../db/connect";
import {
  type AuthContext,
  getContextUser,
} from "../../../../utils/AuthContext";

const accountRoutes = new OpenAPIHono<{
  Variables: AuthContext;
}>().basePath("/account");

const createAccountRoute = createRoute({
  method: "post",
  description: "Create account",
  path: "/",
  tags: ["Account"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            organization: insertOrganizationSchema,
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
  },
});

const handleCreateAccount: RouteHandler<
  typeof createAccountRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const data = c.req.valid("json");
  const user = getContextUser(c);
  const accountService = new AccountServices(db);
  await accountService.createAccount({
    organization: data["organization"],
    userId: user.id,
  });
  return c.json(
    {
      success: true,
    },
    200,
  );
};

accountRoutes.openapi(createAccountRoute, handleCreateAccount);

export { accountRoutes };
