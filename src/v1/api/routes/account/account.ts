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
import { handleInternalError } from "../../../../utils/InternalError";
import { apiErrorShapeSchema } from "../../../../utils/apiTypes";

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
    500: {
      content: {
        "application/json": {
          schema: apiErrorShapeSchema,
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
  const result = await accountService.createAccount({
    organization: data["organization"],
    userId: user.id,
  });
  if (!result.success) {
    return handleInternalError(c);
  }
  return c.json(result, 200);
};

accountRoutes.openapi(createAccountRoute, handleCreateAccount);

export { accountRoutes };
