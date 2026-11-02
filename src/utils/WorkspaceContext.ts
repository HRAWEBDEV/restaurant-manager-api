import { Context } from "hono";
import {
  workspaceRoles,
  type WorkspaceMember,
} from "../db/schemas/workspaceMembers";
import {
  type AuthContext,
  CONTEXT_USER_WORKSPACE_MEMBER_ROLE,
} from "./AuthContext";

const HEADER_WORKSPACE_ID = "workspace-id";

function getHeaderWorkspaceID(c: Context) {
  return c.req.header(HEADER_WORKSPACE_ID);
}

function getContextUserWorkspaceMemberRole(
  c: Context<{
    Variables: AuthContext;
  }>,
) {
  const role = c.get(CONTEXT_USER_WORKSPACE_MEMBER_ROLE);
  if (!role) throw new Error("workspace role context is not defined");
  return role;
}

function setContextUserWorkspaceMemberRole(
  c: Context,
  role: (typeof workspaceRoles)[number],
) {
  c.set(CONTEXT_USER_WORKSPACE_MEMBER_ROLE, role);
}

export {
  HEADER_WORKSPACE_ID,
  CONTEXT_USER_WORKSPACE_MEMBER_ROLE,
  getHeaderWorkspaceID,
  getContextUserWorkspaceMemberRole,
  setContextUserWorkspaceMemberRole,
};
