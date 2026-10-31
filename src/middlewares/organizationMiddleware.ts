import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import { type AuthContext } from "../utils/AuthContext";
import { getContextUser } from "../utils/AuthContext";
import {
  getHeaderOrganizationID,
  setContextUserOrganizationMember,
} from "../utils/OrganizationContext";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";
import { OrganizationMembersService } from "../services/organizationMembers";
import { db } from "../db/connect";

export const organizationMiddleware: MiddlewareHandler<{
  Variables: AuthContext;
}> = createMiddleware(async (c, next) => {
  const user = getContextUser(c);
  const organizationId = getHeaderOrganizationID(c);
  if (!organizationId) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `Header organization id is required`,
      }),
    );
  }
  const organizationMember = new OrganizationMembersService(db);
  const member = await organizationMember.getOrganizationMember(
    organizationId,
    user.id,
  );
  if (!member) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.FORBIDDEN,
        message: `You are not a member of the organization ${organizationId}`,
      }),
    );
  }
  setContextUserOrganizationMember(c, member);
  await next();
});
