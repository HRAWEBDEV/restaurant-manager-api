import type { Context } from "hono";
import { auth } from "../auth";

type Session = typeof auth.$Infer.Session;

const USER_CONTEXT = "USER";
const SESSION_CONTEXT = "SESSION";

interface AuthContext {
  [USER_CONTEXT]: Session["user"];
  [SESSION_CONTEXT]: Session["session"];
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
  if (!user) throw new Error("user is not set");
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
export { setContextSession, setContextUser, getContextSession, getContextUser };
