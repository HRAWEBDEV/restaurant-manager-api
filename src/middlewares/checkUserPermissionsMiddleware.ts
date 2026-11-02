import { createMiddleware } from "hono/factory";
import {
  type OrganizationRolePermissions,
  hasPermission,
} from "../utils/permissions/organizationPermissions";
import {
  type WorkspaceRolePermissions,
  hasPermission as hasWorkspacePermission,
} from "../utils/permissions/workspacepermissions";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";
import { getContextUserOrganizationMember } from "../utils/OrganizationContext";
import { getContextUserWorkspaceMemberRole } from "../utils/WorkspaceContext";
import { ogMemberRoles } from "../db/schemas/organizationMembers";
import { workspaceRoles } from "../db/schemas/workspaceMembers";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type CheckPermissionsProps =
  | {
      type: "organization";
      rolePermission: OrganizationRolePermissions;
      organizationRole: (typeof ogMemberRoles)[number];
    }
  | {
      type: "workspace";
      rolePermission: WorkspaceRolePermissions;
      workspaceRole: (typeof workspaceRoles)[number];
    }
  | {
      type: "organizationAndWorkspace";
      rolePermission: Extract<
        OrganizationRolePermissions,
        WorkspaceRolePermissions
      >;
      organizationRole: (typeof ogMemberRoles)[number];
      workspaceRole: (typeof workspaceRoles)[number];
    };

const checkUserPermissions = (props: CheckPermissionsProps) => {
  let memeberHasPermission = false;
  if (
    props.type === "organization" ||
    props.type === "organizationAndWorkspace"
  ) {
    memeberHasPermission = hasPermission(
      props.organizationRole,
      props.rolePermission,
    );
  }
  if (
    !memeberHasPermission &&
    (props.type === "workspace" || props.type === "organizationAndWorkspace")
  ) {
    memeberHasPermission = hasWorkspacePermission(
      props.workspaceRole,
      props.rolePermission,
    );
  }
  return memeberHasPermission;
};

const checkUserPermissionsMiddleware = ({
  type,
  rolePermission,
}: DistributiveOmit<
  CheckPermissionsProps,
  "organizationRole" | "workspaceRole"
>) => {
  return createMiddleware(async (c, next) => {
    const organizationRole = getContextUserOrganizationMember(c).role;
    const workspaceRole =
      type === "organization" ? "member" : getContextUserWorkspaceMemberRole(c);
    let memeberHasPermission = checkUserPermissions({
      organizationRole,
      workspaceRole,
      type: type,
      rolePermission: rolePermission as WorkspaceRolePermissions,
    });
    if (!memeberHasPermission) {
      return c.json(
        getApiErrorShape({
          success: false,
          statusCode: StatusCodes.FORBIDDEN,
          message: ReasonPhrases.FORBIDDEN,
        }),
        {
          status: StatusCodes.FORBIDDEN,
        },
      );
    }
    await next();
  });
};

export { checkUserPermissions, checkUserPermissionsMiddleware };
