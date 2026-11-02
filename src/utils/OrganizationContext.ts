import { Context } from "hono";
import { type OrganizationMember } from "../db/schemas/organizationMembers";
import {
  type AuthContext,
  CONTEXT_USER_ORGANIZATION_MEMBER,
} from "./AuthContext";

const HEADER_ORGANIZARION_ID = "organization-id";

function getHeaderOrganizationID(c: Context) {
  return c.req.header(HEADER_ORGANIZARION_ID);
}

function getContextUserOrganizationMember(
  c: Context<{
    Variables: AuthContext;
  }>,
) {
  const member = c.get(CONTEXT_USER_ORGANIZATION_MEMBER);
  if (!member) throw new Error("member context is not defined");
  return member;
}

function setContextUserOrganizationMember(
  c: Context,
  member: OrganizationMember,
) {
  c.set(CONTEXT_USER_ORGANIZATION_MEMBER, member);
}

export {
  HEADER_ORGANIZARION_ID,
  CONTEXT_USER_ORGANIZATION_MEMBER,
  getHeaderOrganizationID,
  getContextUserOrganizationMember,
  setContextUserOrganizationMember,
};
