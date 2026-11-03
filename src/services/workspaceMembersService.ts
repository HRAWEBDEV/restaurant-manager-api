import { eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type DBExecuter } from "../db/connect";
import { user } from "../../auth-schema";
import {
  workspaceMembers,
  type InsertWorkspaceMember,
  type WorkspaceMember,
  selectWorkspaceMemberSchema,
} from "../db/schemas/workspaceMembers";
import { OrganizationMembersService } from "./organizationMembers";
import { workspaces } from "../db/schemas/workspaces";
import {
  ogMemberRoles,
  organizationMembers,
} from "../db/schemas/organizationMembers";
import { organizations } from "../db/schemas/organizations";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";
import { workspaceRoles } from "../db/schemas/workspaceMembers";
import { WorkspacesService } from "./workspacesService";
import { z } from "@hono/zod-openapi";
import {
  getModifyDataResult,
  type ModifyData,
} from "../utils/servicesGenericTypes";

const getWorkspaceMembersSchema = z.object({
  permissionDenied: z.boolean(),
  members: selectWorkspaceMemberSchema
    .extend({
      role: z.enum(workspaceRoles),
      workspaceName: z.string(),
      userId: z.string(),
      userAvatar: z.string().nullable(),
      username: z.string().nullable(),
      userFirstName: z.string(),
      userLastName: z.string(),
      userEmail: z.string(),
      userPhoneNumber: z.string().nullable(),
      addedByUsername: z.string().nullable(),
      addedByFirstName: z.string().nullable(),
      addedByLastName: z.string().nullable(),
      organizationId: z.string(),
      organizationName: z.string(),
      organizationRole: z.enum(ogMemberRoles),
    })
    .array(),
});

type GetWorkspaceMembers = z.infer<typeof getWorkspaceMembersSchema>;
interface GetWorkspaceMembersProps {
  filters: {
    userId?: string;
    selectorUserId: string;
    workspaceId: string;
  };
}
interface GetWorkspaceMember {
  filters: {
    userId: string;
    workspaceId: string;
    selectorUserId: string;
  };
}

type ModifyWorkspaceMemberResult = ModifyData<{ id: string }>;

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  private async getWorkspaceMembersNP({
    filters,
  }: GetWorkspaceMembersProps): Promise<GetWorkspaceMembers> {
    const addedByUsers = alias(user, "addedByUsers");
    let baseQuery = this.db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        organizationMemberId: organizationMembers.id,
        role: sql<(typeof workspaceRoles)[number]>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
        userId: user.id,
        userAvatar: user.image,
        username: user.username,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        userPhoneNumber: user.phoneNumber,
        joinedAt: workspaceMembers.joinedAt,
        addedBy: workspaceMembers.addedBy,
        addedByUsername: addedByUsers.username,
        addedByFirstName: addedByUsers.firstName,
        addedByLastName: addedByUsers.lastName,
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
      permissionDenied: false,
    };
  }
  async getWorkspaceMembers(
    props: GetWorkspaceMembersProps,
  ): Promise<GetWorkspaceMembers> {
    const workspaceService = new WorkspacesService(this.db);
    const workspace = await workspaceService.getWorkspace({
      filters: {
        userId: props.filters.selectorUserId,
        workspaceId: props.filters.workspaceId,
      },
    });
    if (
      !workspace ||
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: workspace.organizationRole,
        rolePermission: "workspace_member:read",
        workspaceRole: workspace.role,
      })
    ) {
      return {
        members: [],
        permissionDenied: true,
      };
    }
    return this.getWorkspaceMembersNP(props);
  }
  private async getWorkspaceMemberNP(props: GetWorkspaceMember) {
    return (
      await this.getWorkspaceMembersNP({
        filters: props.filters,
      })
    ).members[0];
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
  }): Promise<ModifyWorkspaceMemberResult> {
    const actorMember = await this.getWorkspaceMemberNP({
      filters: {
        workspaceId,
        selectorUserId: addedBy,
        userId: addedBy,
      },
    });
    if (!actorMember) {
      return getModifyDataResult({
        notFound: true,
      });
    }
    if (
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: actorMember.organizationRole,
        workspaceRole: actorMember.role,
        rolePermission: "workspace_member:create",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    const organizationMemberService = new OrganizationMembersService(this.db);
    const targetOrganizationMember =
      await organizationMemberService.getOrganizationMember({
        filters: {
          userId: newMemberUserId,
          selectorUserId: addedBy,
          organizationId: actorMember.organizationId,
        },
      });
    if (!targetOrganizationMember)
      return getModifyDataResult({
        notFound: true,
      });
    const [createdWorkspaceMember] = await this.db
      .insert(workspaceMembers)
      .values({
        organizationMemberId: targetOrganizationMember.id,
        workspaceId,
        role,
        addedBy,
      })
      .returning({ id: workspaceMembers.id });
    return getModifyDataResult({
      data: createdWorkspaceMember,
    });
  }
  async updateWorkspaceMember({
    memberUserId,
    role,
    workspaceId,
    updatedBy,
  }: Pick<WorkspaceMember, "role" | "workspaceId"> & {
    memberUserId: string;
    updatedBy: string;
  }): Promise<ModifyWorkspaceMemberResult> {
    const actorMember = await this.getWorkspaceMemberNP({
      filters: {
        workspaceId,
        selectorUserId: updatedBy,
        userId: updatedBy,
      },
    });
    if (!actorMember) return getModifyDataResult({ notFound: true });
    if (
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: actorMember.organizationRole,
        workspaceRole: actorMember.role,
        rolePermission: "workspace_member:update",
      })
    )
      return getModifyDataResult({ permissionDenied: true });
    const targetWorkspaceMember = await this.getWorkspaceMemberNP({
      filters: {
        selectorUserId: updatedBy,
        userId: memberUserId,
        workspaceId,
      },
    });
    if (!targetWorkspaceMember) return getModifyDataResult({ notFound: true });
    const [updatedMember] = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.id, targetWorkspaceMember.id)))
      .returning({ id: workspaceMembers.id, role: workspaceMembers.role });
    return getModifyDataResult({ data: updatedMember });
  }

  async deleteWorkspaceMember({
    memberUserId,
    workspaceId,
    deletedBy,
  }: Pick<WorkspaceMember, "workspaceId"> & {
    memberUserId: string;
    deletedBy: string;
  }): Promise<ModifyWorkspaceMemberResult> {
    const actorMember = await this.getWorkspaceMemberNP({
      filters: {
        workspaceId,
        selectorUserId: deletedBy,
        userId: deletedBy,
      },
    });
    if (!actorMember)
      return getModifyDataResult({
        notFound: true,
      });

    if (
      !checkUserPermissions({
        type: "organizationAndWorkspace",
        organizationRole: actorMember.organizationRole,
        workspaceRole: actorMember.role,
        rolePermission: "workspace_member:delete",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    const targetWorkspaceMember = await this.getWorkspaceMemberNP({
      filters: {
        selectorUserId: deletedBy,
        userId: memberUserId,
        workspaceId,
      },
    });
    if (!targetWorkspaceMember)
      return getModifyDataResult({
        notFound: true,
      });
    const [deletedMember] = await this.db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.id, targetWorkspaceMember.id)))
      .returning({
        id: workspaceMembers.id,
      });
    return getModifyDataResult({
      data: deletedMember,
    });
  }
}

export { WorkspaceMembersService };
