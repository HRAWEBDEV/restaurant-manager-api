type WorkspacePermissions = typeof workspacePermissions;
type WorkspaceRole = keyof WorkspacePermissions;
type WorkspaceRolePermissions =
  WorkspacePermissions[keyof WorkspacePermissions][number];

const workspacePermissions = {
  admin: [
    "organization:read",
    "workspace:read",
    "workspace_member:read",
    "workspace_member:create",
    "workspace_member:update",
    "workspace_member:delete",
  ],
  member: ["organization:read", "workspace:read", "workspace_member:read"],
} as const;

function hasPermission(
  role: WorkspaceRole,
  permission: WorkspaceRolePermissions,
): boolean {
  return (
    workspacePermissions[role] as readonly WorkspaceRolePermissions[]
  ).includes(permission);
}

export type { WorkspacePermissions, WorkspaceRole, WorkspaceRolePermissions };
export { workspacePermissions, hasPermission };
