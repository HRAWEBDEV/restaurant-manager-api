import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "../../../auth";

const authRoutes = new OpenAPIHono().basePath("/auth");

const signUp = createRoute({
  method: "post",
  path: "/sign-up",
  tags: ["Auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).openapi({
              description: "name must be unique",
            }),
            email: z.email(),
            password: z.string().min(8),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Account created and signed in",
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().openapi({
              example: "test",
            }),
          }),
        },
      },
    },
    400: {
      description: "when props are wrong",
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().openapi({
              example: "test",
            }),
          }),
        },
      },
    },
  },
});

authRoutes.openapi(signUp, async (c) => {
  const body = c.req.valid("json");
  try {
    const { response } = await auth.api.signUpEmail({
      body,
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    console.log(response);
  } catch (e) {
    console.log(e);
  }
  return c.json(
    {
      name: "test",
    },
    200,
  );
});

export { authRoutes };
