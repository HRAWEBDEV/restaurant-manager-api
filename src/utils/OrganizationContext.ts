import { Context } from "hono";
import { type OrganizationMember } from "../db/schemas/organizationMembers";

const HEADER_ORGANIZARION_ID = "organization-id";
const CONTEXT_USER_ORGANIZATION_MEMBER = "userOrganizationMember";

function getHeaderOrganizationID(c: Context) {
  return c.req.header(HEADER_ORGANIZARION_ID);
}

function getContextUserOrganizationMember(c: Context) {
  const member = c.get(CONTEXT_USER_ORGANIZATION_MEMBER);
  if (!member) throw new Error("member context is not defined");
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
