type OrganizationPermissions = typeof organizationPermissions;
type OrganizationRole = keyof OrganizationPermissions;
type OrganizationRolePermissions =
  OrganizationPermissions[keyof OrganizationPermissions][number];

const organizationPermissions = {
  owner: [
    "organization:read",
    "organization:update",
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "organization_invitation:read",
    "organization_invitation:create",
    "organization_invitation:delete",
    "organization_member:read",
    "organization_member:update",
    "organization_member:delete",
    "workspace_member:read",
    "workspace_member:create",
    "workspace_member:update",
    "workspace_member:delete",
  ],
  admin: [
    "organization:read",
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "organization_invitation:read",
    "organization_invitation:create",
    "organization_invitation:delete",
    "organization_member:read",
    "workspace_member:read",
    "workspace_member:create",
    "workspace_member:update",
    "workspace_member:delete",
  ],
  member: ["organization:read", , "organization_member:read"],
} as const;

function hasPermission(
  role: OrganizationRole,
  permission: OrganizationRolePermissions,
): boolean {
  return (
    organizationPermissions[role] as readonly OrganizationRolePermissions[]
  ).includes(permission);
}

export type {
  OrganizationPermissions,
  OrganizationRole,
  OrganizationRolePermissions,
};
export { organizationPermissions, hasPermission };
