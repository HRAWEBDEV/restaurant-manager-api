import type { Context } from "hono";
import { auth } from "../auth";
import { type OrganizationMember } from "../db/schemas/organizationMembers";
import { workspaceRoles } from "../db/schemas/workspaceMembers";

type Session = typeof auth.$Infer.Session;

const USER_CONTEXT = "USER";
const SESSION_CONTEXT = "SESSION";
const CONTEXT_USER_ORGANIZATION_MEMBER = "userOrganizationMember";
const CONTEXT_USER_WORKSPACE_MEMBER_ROLE = "userWorkspaceMemberRole";

interface AuthContext {
  [USER_CONTEXT]: Session["user"];
  [SESSION_CONTEXT]: Session["session"];
  [CONTEXT_USER_ORGANIZATION_MEMBER]: OrganizationMember;
  [CONTEXT_USER_WORKSPACE_MEMBER_ROLE]: (typeof workspaceRoles)[number];
}

function setContextUser(c: Context, user: Session["user"]) {
  c.set(USER_CONTEXT, user);
}

function setContextSession(c: Context, session: Session["session"]) {
  c.set(SESSION_CONTEXT, session);
}

function getContextUser(
  c: Context<{
    Variables: AuthContext;
  }>,
) {
  const user = c.get(USER_CONTEXT);
  if (!user) throw new Error("user context is not set");
  return user;
}

function getContextSession(
  c: Context<{
    Variables: AuthContext;
  }>,
) {
  const session = c.get(SESSION_CONTEXT);
  if (!session) throw new Error("session is not set");
  return session;
}

export type { Session, AuthContext };
export {
  CONTEXT_USER_ORGANIZATION_MEMBER,
  CONTEXT_USER_WORKSPACE_MEMBER_ROLE,
  setContextSession,
  setContextUser,
  getContextSession,
  getContextUser,
};
