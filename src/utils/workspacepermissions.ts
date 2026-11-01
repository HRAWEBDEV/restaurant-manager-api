type WorkspacePermissions = typeof workspacePermissions;
type WorkspaceRole = keyof WorkspacePermissions;
type WorkspaceRolePermissions =
  WorkspacePermissions[keyof WorkspacePermissions][number];

const workspacePermissions = {
  admin: ["workspace:read", "workspace_member:read"],
  member: ["workspace:read", "workspace_member:read"],
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
