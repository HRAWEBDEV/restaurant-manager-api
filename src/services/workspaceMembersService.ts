import { eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DBExecuter } from "../db/connect";
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

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaceMembers({
    filters,
  }: {
    filters: {
      workspaceId: string;
      organizationMemberId?: string;
    };
  }) {
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
    if (filters.organizationMemberId) {
      filterConditions.push(
        eq(workspaceMembers.organizationMemberId, filters.organizationMemberId),
      );
    }
    baseQuery = baseQuery
      .where(and(...filterConditions))
      .orderBy(workspaceMembers.joinedAt);

    if (filters.organizationMemberId) {
      baseQuery = baseQuery.limit(1);
    }
    const result = await baseQuery;
    return {
      members: result,
    };
  }
  async getWorkspaceMember(props: {
    filters: {
      workspaceId: string;
      organizationMemberId: string;
    };
  }) {
    return (
      await this.getWorkspaceMembers({
        filters: props.filters,
      })
    ).members[0];
  }

  async createWorkspaceMember({
    organizationMemberId,
    workspaceId,
    role,
    addedBy,
    organizationId,
  }: Pick<
    InsertWorkspaceMember,
    "organizationMemberId" | "workspaceId" | "role"
  > & {
    organizationId: string;
    addedBy: string;
  }) {
    const organizationMemberSerive = new OrganizationMembersService(db);
    const organizationMember =
      await organizationMemberSerive.getOrganizationMember(
        organizationId,
        addedBy,
      );
    if (
      !organizationMember ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: organizationMember.role,
        rolePermission: "workspace_member:create",
      })
    )
      return;
    const [createdWorkspaceMember] = await this.db
      .insert(workspaceMembers)
      .values({
        organizationMemberId,
        workspaceId,
        role,
        addedBy,
      })
      .returning({ id: workspaceMembers.id });
    return createdWorkspaceMember;
  }
  async updateWorkspaceMember({
    id,
    role,
    workspaceId,
  }: Pick<WorkspaceMember, "id" | "role" | "workspaceId">) {
    const [updatedMember] = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.id, id),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .returning({ id: workspaceMembers.id, role: workspaceMembers.role });
    return updatedMember;
  }

  async deleteWorkspaceMember(workspaceId: string, id: string) {
    const [deletedMember] = await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, id),
        ),
      )
      .returning({
        id: workspaceMembers.id,
      });
    return deletedMember;
  }
}

export { WorkspaceMembersService };
