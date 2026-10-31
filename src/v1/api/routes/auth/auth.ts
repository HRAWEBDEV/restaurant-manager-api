import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "../../../../auth";
import { insertOrganizationSchema } from "../../../../db/schemas/organizations";
import { AccountServices } from "../../../../services/accountServices";
import { db } from "../../../../db/connect";

const authRoutes = new OpenAPIHono().basePath("/auth");

const signUpPropsSchema = z.object({
  user: z.object({
    firstName: z.string().min(1).openapi({
      example: "john",
    }),
    lastName: z.string().min(1).openapi({
      example: "doe",
    }),
    username: z.string().min(1).openapi({
      example: "john",
      description: "must be unique",
    }),
    phoneNumber: z.string().openapi({
      example: "09....",
      description: "must be unique",
    }),
    email: z.email().min(1).openapi({
      example: "john@gmail.com",
      description: "must be unique",
    }),
    password: z.string().min(1).openapi({
      example: "johnTest@1",
    }),
  }),
  organization: insertOrganizationSchema,
});

const signUpRoute = createRoute({
  method: "post",
  description: "Sign up",
  path: "/sign-up",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: signUpPropsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "signed up",
    },
  },
});

authRoutes.openapi(signUpRoute, async (c) => {
  const props = c.req.valid("json");
  const result = await auth.api.signUpEmail({
    headers: c.req.raw.headers,
    body: {
      ...props["user"],
      name: `${props["user"].firstName} ${props["user"].lastName}`.trim(),
    },
    asResponse: true,
  });
  const body = (await result.clone().json()) as {
    user: {
      id: string;
    };
  };
  const userId = body?.user?.id;
  const accountService = new AccountServices(db);
  accountService.createAccount({
    organization: props["organization"],
    userId,
  });
  return result;
});

const signInWithPasswordPropsSchema = z
  .object({
    username: z.string().openapi({
      example: "john",
      description: "username or email is required",
    }),
    email: z.email().openapi({
      example: "john@gmail.com",
      description: "username or email is required",
    }),
    password: z.string().min(1).openapi({
      example: "johnTest@1",
    }),
  })
  .superRefine((props, ctx) => {
    if (!props.email && !props.username) {
      ctx.addIssue({
        code: "custom",
        message: "username or email is required",
      });
    }
  });

const signInWithPasswordRoute = createRoute({
  method: "post",
  description: "Sign in",
  path: "sign-in/with-password",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: signInWithPasswordPropsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "signed in",
    },
  },
});

authRoutes.openapi(signInWithPasswordRoute, async (c) => {
  const result = await auth.api.signInEmail({
    headers: c.req.raw.headers,
    body: c.req.valid("json"),
    asResponse: true,
  });
  return result;
});

export { authRoutes };
