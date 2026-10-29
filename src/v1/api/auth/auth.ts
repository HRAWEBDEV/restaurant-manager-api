import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "../../../auth";
const authRoutes = new OpenAPIHono().basePath("/auth");

const signUpPropsSchema = z.object({
  name: z.string().min(1).openapi({
    example: "john",
  }),
  username: z.string().min(1).openapi({
    example: "john",
    description: "must be unique",
  }),
  email: z.email().min(1).openapi({
    example: "john@gmail.com",
    description: "must be unique",
  }),
  password: z.string().min(1).openapi({
    example: "johnTest@1",
  }),
});

const signUpRoute = createRoute({
  method: "post",
  path: "/sign-up",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: signUpPropsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "if sign up is successful",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

authRoutes.openapi(signUpRoute, async (c) => {
  await auth.api.signUpEmail({
    headers: c.req.raw.headers,
    returnHeaders: true,
    body: c.req.valid("json"),
  });
  return c.json(
    {
      message: "you are signed up",
    },
    200,
  );
});

export { authRoutes };
