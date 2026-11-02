import {
  OpenAPIHono,
  createRoute,
  z,
  type RouteHandler,
} from "@hono/zod-openapi";
import {
  getContextUser,
  type AuthContext,
} from "../../../../utils/AuthContext";
import {
  getOrganizationsResultSchema,
  OrganizationsService,
} from "../../../../services/organizationsService";
import { db } from "../../../../db/connect";
import {
  apiErrorShapeSchema,
  getApiErrorShape,
} from "../../../../utils/apiTypes";
import { StatusCodes } from "http-status-codes";
import { UploadOrganizationAvatar } from "../../../../utils/uploadOrganizationAvatar";
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from "../../../../utils/uploadFileService";

const organizationsRoutes = new OpenAPIHono<{
  Variables: AuthContext;
}>().basePath("/organizations");

const uploadOrganizationLogoRoute = createRoute({
  method: "patch",
  path: "/{id}/logo",
  tags: ["Organizations"],
  description: "Upload organization logo",
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
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            logo: z.any().openapi({
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
            logoUrl: z.string(),
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

const handleUploadOrganizationLogoRoute: RouteHandler<
  typeof uploadOrganizationLogoRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  const { id } = c.req.valid("param");
  const data = c.req.valid("form");
  const logo = data["logo"];
  if (!(logo instanceof File)) {
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "logo is not a file",
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  const organizationService = new OrganizationsService(db);
  const uploadOrganizationLogo = new UploadOrganizationAvatar();
  const organization = await organizationService.getOrganization({
    filters: {
      organizationId: id,
      userId: user.id,
    },
  });
  if (!organization) {
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Organization not found",
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  try {
    const logoUrl = await uploadOrganizationLogo.saveStaticImage(logo);
    await organizationService.updateOrganization({
      id,
      userId: user.id,
      logo: logoUrl,
    });
    if (organization.logo) {
      await uploadOrganizationLogo.deleteStaticImage(organization.logo);
    }
    return c.json(
      {
        logoUrl,
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

organizationsRoutes.openapi(
  uploadOrganizationLogoRoute,
  handleUploadOrganizationLogoRoute,
);

const getOrganizationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Organizations"],
  description: "user organizations",
  request: {},
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getOrganizationsResultSchema,
        },
      },
    },
  },
});

const handleGetOrganizations: RouteHandler<
  typeof getOrganizationsRoute,
  {
    Variables: AuthContext;
  }
> = async (c) => {
  const user = getContextUser(c);
  const organizationService = new OrganizationsService(db);
  const result = await organizationService.getOrganizations({
    filters: {
      userId: user.id,
    },
  });
  return c.json(result, 200);
};

organizationsRoutes.openapi(getOrganizationsRoute, handleGetOrganizations);

export { organizationsRoutes };
