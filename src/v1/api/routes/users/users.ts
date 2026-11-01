import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import { type Handler } from "hono";
import { selectUserSchema, updateUserSchema } from "../../../../../auth-schema";
import { type RouteHandler } from "@hono/zod-openapi";
import { auth } from "../../../../auth";
import { StatusCodes } from "http-status-codes";
import {
  apiErrorShapeSchema,
  getApiErrorShape,
} from "../../../../utils/apiTypes";
import { UploadUserImageService } from "../../../../utils/uploadUserImageService";
import {
  InvalidFileTypeError,
  FileTooLargeError,
} from "../../../../utils/uploadFileService";

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

const uploadUserAvatarRoute = createRoute({
  method: "post",
  path: "/avatar",
  tags: ["Users"],
  description: "Upload user avatar",
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            avatar: z.any().openapi({
              type: "string",
              format: "binary",
            }),
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
            avatarUrl: z.string(),
          }),
        },
      },
    },
    400: {
      description: "invalid image file",
      content: {
        "application/json": {
          schema: apiErrorShapeSchema,
        },
      },
    },
  },
});

const handleUploadUserAvatar: RouteHandler<
  typeof uploadUserAvatarRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const data = c.req.valid("form");
  const avatar = data["avatar"];
  if (!(avatar instanceof File)) {
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Image is not a file",
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  const user = getContextUser(c);
  const uploadUserAvatar = new UploadUserImageService();
  try {
    const avatarUrl = await uploadUserAvatar.saveStaticImage(avatar);
    await auth.api.updateUser({
      headers: c.req.raw.headers,
      body: {
        image: avatarUrl,
      },
    });
    if (user.image) {
      await uploadUserAvatar.deleteStaticImage(user.image);
    }
    return c.json(
      {
        avatarUrl,
      },
      StatusCodes.OK,
    );
  } catch (err) {
    if (
      err instanceof InvalidFileTypeError ||
      err instanceof FileTooLargeError
    ) {
      return c.json(
        getApiErrorShape({
          success: false,
          statusCode: StatusCodes.BAD_REQUEST,
          message: err.message,
        }),
        StatusCodes.BAD_REQUEST,
      );
    }
    throw err;
  }
};

usersRoutes.openapi(uploadUserAvatarRoute, handleUploadUserAvatar);

const deleteUserAvatarRoute = createRoute({
  method: "delete",
  path: "/avatar",
  tags: ["Users"],
  description: "delete user avatar",
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

const handleDeleteUserAvatar: RouteHandler<
  typeof deleteUserAvatarRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  if (user.image) {
    const uploadUserAvatar = new UploadUserImageService();
    await uploadUserAvatar.deleteStaticImage(user.image);
  }
  return c.json(
    {
      success: true,
    },
    200,
  );
};

usersRoutes.openapi(deleteUserAvatarRoute, handleDeleteUserAvatar);

export { usersRoutes };
