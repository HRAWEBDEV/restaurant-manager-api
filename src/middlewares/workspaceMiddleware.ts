import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import { type AuthContext } from "../utils/AuthContext";
import { getContextUser } from "../utils/AuthContext";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";
import { WorkspaceMembersService } from "../services/workspaceMembersService";
import {
  getHeaderWorkspaceID,
  setContextUserWorkspaceMemberRole,
} from "../utils/WorkspaceContext";
import { getContextUserOrganizationMember } from "../utils/OrganizationContext";
import { db } from "../db/connect";

export const workspaceMiddleware: MiddlewareHandler<{
  Variables: AuthContext;
}> = createMiddleware(async (c, next) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderWorkspaceID(c);
  if (!workspaceId) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `Header workspace id is required`,
      }),
    );
  }
  if (organizationMember.role) {
    setContextUserWorkspaceMemberRole(c, "admin");
  } else {
    const worksapceMemberService = new WorkspaceMembersService(db);
    const member = await worksapceMemberService.getWorkspaceMember(
      workspaceId,
      organizationMember.id,
    );
    if (!member) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json(
        getApiErrorShape({
          success: false,
          statusCode: StatusCodes.FORBIDDEN,
          message: `You are not a member of the workspace ${workspaceId}`,
        }),
      );
    }
    setContextUserWorkspaceMemberRole(c, member.role);
  }
  await next();
});
