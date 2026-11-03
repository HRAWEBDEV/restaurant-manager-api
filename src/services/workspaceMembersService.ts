import { eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type DBExecuter } from "../db/connect";
import { user } from "../../auth-schema";
import {
  workspaceMembers,
  type InsertWorkspaceMember,
  type WorkspaceMember,
} from "../db/schemas/workspaceMembers";
import { OrganizationMembersService } from "./organizationMembers";
import { workspaces } from "../db/schemas/workspaces";
import { organizationMembers } from "../db/schemas/organizationMembers";
import { organizations } from "../db/schemas/organizations";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";
import { workspaceRoles } from "../db/schemas/workspaceMembers";
import { WorkspacesService } from "./workspacesService";

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaceMembers({
    filters,
  }: {
    filters: {
      userId?: string;
      workspaceId: string;
      selectorUserId: string;
    };
  }) {
    const workspaceService = new WorkspacesService(this.db);
    const workspace = await workspaceService.getWorkspace({
      filters: {
        userId: filters.selectorUserId,
        workspaceId: filters.workspaceId,
      },
    });
    if (
      !workspace ||
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: workspace.organizationRole,
        workspaceRole: workspace.workspaceMemberRole,
        rolePermission: "workspace_member:read",
      })
    )
      return {
        members: [],
      };
    const addedByUsers = alias(user, "addedByUsers");
    let baseQuery = this.db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaces.id,
        organizationMemberId: organizationMembers.id,
        role: sql<(typeof workspaceRoles)[number]>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
        joinedAt: workspaceMembers.joinedAt,
        addedBy: workspaceMembers.addedBy,
        addedByUsername: addedByUsers.username,
        addedByFirstName: addedByUsers.firstName,
        addedByLastName: addedByUsers.lastName,
        workspaceName: workspaces.name,
        userId: user.id,
        userAvatar: user.image,
        username: user.username,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        userPhoneNumber: user.phoneNumber,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationRole: organizationMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .innerJoin(
        organizationMembers,
        eq(workspaceMembers.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .innerJoin(user, eq(organizationMembers.userId, user.id))
      .leftJoin(addedByUsers, eq(workspaceMembers.addedBy, addedByUsers.id))
      .$dynamic();
    const filterConditions = [
      eq(workspaceMembers.workspaceId, filters.workspaceId),
    ];
    if (filters.userId) {
      filterConditions.push(eq(user.id, filters.userId));
    }
    baseQuery = baseQuery
      .where(and(...filterConditions))
      .orderBy(workspaceMembers.joinedAt);

    if (filters.userId) {
      baseQuery = baseQuery.limit(1);
    }
    const result = await baseQuery;
    return {
      members: result,
    };
  }
  async getWorkspaceMember(props: {
    filters: {
      userId: string;
      workspaceId: string;
      selectorUserId: string;
    };
  }) {
    return (
      await this.getWorkspaceMembers({
        filters: props.filters,
      })
    ).members[0];
  }

  async createWorkspaceMember({
    newMemberUserId,
    workspaceId,
    role,
    addedBy,
  }: Pick<InsertWorkspaceMember, "workspaceId" | "role"> & {
    newMemberUserId: string;
    organizationId: string;
    addedBy: string;
  }) {
    const workspaceService = new WorkspacesService(this.db);
    const workspace = await workspaceService.getWorkspace({
      filters: {
        workspaceId,
        userId: addedBy,
      },
    });
    if (
      !workspace ||
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: workspace.organizationRole,
        workspaceRole: workspace.workspaceMemberRole,
        rolePermission: "workspace_member:create",
      })
    )
      return;
    const organizationMemberService = new OrganizationMembersService(this.db);
    const targetOrganizationMember =
      await organizationMemberService.getOrganizationMember({
        filters: {
          userId: newMemberUserId,
          selectorUserId: addedBy,
          organizationId: workspace.organizationId,
        },
      });
    if (!targetOrganizationMember) return;
    const [createdWorkspaceMember] = await this.db
      .insert(workspaceMembers)
      .values({
        organizationMemberId: targetOrganizationMember.id,
        workspaceId,
        role,
        addedBy,
      })
      .returning({ id: workspaceMembers.id });
    return createdWorkspaceMember;
  }
  async updateWorkspaceMember({
    memberUserId,
    role,
    workspaceId,
    updatedBy,
  }: Pick<WorkspaceMember, "role" | "workspaceId"> & {
    memberUserId: string;
    updatedBy: string;
  }) {
    const workspaceService = new WorkspacesService(this.db);
    const workspace = await workspaceService.getWorkspace({
      filters: {
        workspaceId,
        userId: updatedBy,
      },
    });
    if (
      !workspace ||
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: workspace.organizationRole,
        workspaceRole: workspace.workspaceMemberRole,
        rolePermission: "workspace_member:update",
      })
    )
      return;
    const targetWorkspaceMember = await this.getWorkspaceMember({
      filters: {
        selectorUserId: updatedBy,
        userId: memberUserId,
        workspaceId,
      },
    });
    if (!targetWorkspaceMember) return;
    const [updatedMember] = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.id, targetWorkspaceMember.id)))
      .returning({ id: workspaceMembers.id, role: workspaceMembers.role });
    return updatedMember;
  }

  async deleteWorkspaceMember({
    memberUserId,
    workspaceId,
    deletedBy,
  }: Pick<WorkspaceMember, "workspaceId"> & {
    memberUserId: string;
    deletedBy: string;
  }) {
    const workspaceService = new WorkspacesService(this.db);
    const workspace = await workspaceService.getWorkspace({
      filters: {
        workspaceId,
        userId: deletedBy,
      },
    });
    if (
      !workspace ||
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: workspace.organizationRole,
        workspaceRole: workspace.workspaceMemberRole,
        rolePermission: "workspace_member:delete",
      })
    )
      return;
    const targetWorkspaceMember = await this.getWorkspaceMember({
      filters: {
        selectorUserId: deletedBy,
        userId: memberUserId,
        workspaceId,
      },
    });
    if (!targetWorkspaceMember) return;
    const [deletedMember] = await this.db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.id, targetWorkspaceMember.id)))
      .returning({
        id: workspaceMembers.id,
      });
    return deletedMember;
  }
}

export { WorkspaceMembersService };
