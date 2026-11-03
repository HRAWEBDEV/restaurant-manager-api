import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and, or, sql, isNotNull } from "drizzle-orm";
import type { DBExecuter } from "../db/connect";
import {
  type InsertWorkspace,
  type Workspace,
  selectWorkspaceSchema,
  workspaces,
} from "../db/schemas/workspaces";
import { organizations } from "../db/schemas/organizations";
import { organizationMembers } from "../db/schemas/organizationMembers";
import { workspaceMembers } from "../db/schemas/workspaceMembers";
import { OrganizationsService } from "./organizationsService";
import { z } from "@hono/zod-openapi";
import { ogMemberRoles } from "../db/schemas/organizationMembers";
import { workspaceRoles } from "../db/schemas/workspaceMembers";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";
import {
  getModifyDataResult,
  type ModifyData,
} from "../utils/servicesGenericTypes";

function createWorkspaceSlug(name: string) {
  return `${slugify(name, {
    trim: true,
    strict: true,
    lower: true,
  })}_${nanoid(8)}`;
}

const getWorkspacesSchema = z.object({
  workspaces: selectWorkspaceSchema
    .extend({
      role: z.enum(workspaceRoles),
      organizationId: z.string(),
      organizationName: z.string(),
      organizationRole: z.enum(ogMemberRoles),
      organizationSlug: z.string(),
    })
    .array(),
});

type GetWorkspacesResult = z.infer<typeof getWorkspacesSchema>;
type ModifyWorkspaceResult = ModifyData<{ id: string }>;

class WorkspacesService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaces({
    filters,
  }: {
    filters: {
      userId: string;
      organizationId?: string;
      workspaceId?: string;
    };
  }): Promise<GetWorkspacesResult> {
    let baseQuery = this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        createdBy: workspaces.createdBy,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: sql<(typeof workspaceRoles)[number]>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
        organizationId: workspaces.organizationId,
        organizationName: organizations.name,
        organizationRole: organizationMembers.role,
        organizationSlug: organizations.slug,
      })
      .from(workspaces)
      .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, workspaces.organizationId),
          eq(organizationMembers.userId, filters.userId),
        ),
      )
      .leftJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, workspaces.id),
          eq(workspaceMembers.organizationMemberId, organizationMembers.id),
        ),
      )
      .$dynamic();
    const filterConditions = [
      or(
        isNotNull(workspaceMembers.organizationMemberId),
        eq(organizationMembers.role, "owner"),
        eq(organizationMembers.role, "admin"),
      ),
    ];
    if (filters.organizationId) {
      filterConditions.push(
        eq(workspaces.organizationId, filters.organizationId),
      );
    }
    if (filters.workspaceId) {
      filterConditions.push(eq(workspaces.id, filters.workspaceId));
    }
    baseQuery = baseQuery
      .where(and(...filterConditions))
      .orderBy(workspaces.createdAt);
    if (filters.workspaceId) {
      baseQuery = baseQuery.limit(1);
    }
    const workspacesResult = await baseQuery;
    return {
      workspaces: workspacesResult,
    };
  }
  async getWorkspace({
    filters,
  }: {
    filters: {
      userId: string;
      workspaceId: string;
    };
  }) {
    return (await this.getWorkspaces({ filters })).workspaces[0];
  }
  async createWorkspace({
    name,
    organizationId,
    description,
    createdBy,
  }: Pick<InsertWorkspace, "name" | "organizationId" | "description"> & {
    createdBy: string;
  }): Promise<ModifyWorkspaceResult> {
    const organizationService = new OrganizationsService(this.db);
    const organization = await organizationService.getOrganization({
      filters: {
        userId: createdBy,
        organizationId,
      },
    });
    if (!organization) {
      return getModifyDataResult({
        notFound: true,
      });
    }
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: organization.role,
        rolePermission: "workspace:create",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    const slug = createWorkspaceSlug(name);
    const [createdWorkspace] = await this.db
      .insert(workspaces)
      .values({
        name,
        slug,
        organizationId,
        description,
        createdBy,
      })
      .returning({ id: workspaces.id });
    return getModifyDataResult({
      data: createdWorkspace,
    });
  }
  async createPublicWorkspace({
    organizationId,
    createdBy,
  }: Pick<InsertWorkspace, "organizationId"> & {
    createdBy: string;
  }) {
    return this.createWorkspace({
      organizationId,
      createdBy,
      name: "public",
      description: "default public workspace",
    });
  }
  async updateWorkspace({
    id,
    userId,
    name,
    description,
  }: Pick<Workspace, "id"> & { userId: string } & Partial<
      Pick<InsertWorkspace, "name" | "description">
    >): Promise<ModifyWorkspaceResult> {
    let slug: string | undefined = undefined;
    const currentWorkspace = await this.getWorkspace({
      filters: { userId, workspaceId: id },
    });
    if (!currentWorkspace) {
      return getModifyDataResult({
        notFound: true,
      });
    }
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: currentWorkspace.organizationRole,
        rolePermission: "workspace:update",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    if (name) {
      if (currentWorkspace && currentWorkspace.name !== name) {
        slug = createWorkspaceSlug(name);
      }
    }
    const [updatedWorkspace] = await this.db
      .update(workspaces)
      .set({
        name,
        slug,
        description,
      })
      .where(and(eq(workspaces.id, id)))
      .returning({
        id: workspaces.id,
      });
    return getModifyDataResult({
      data: updatedWorkspace,
    });
  }
  async deleteWorkspace({
    id,
    userId,
  }: Pick<Workspace, "id"> & {
    userId: string;
  }): Promise<ModifyWorkspaceResult> {
    const currentWorkspace = await this.getWorkspace({
      filters: { userId, workspaceId: id },
    });
    if (!currentWorkspace) {
      return getModifyDataResult({
        notFound: true,
      });
    }
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: currentWorkspace.organizationRole,
        rolePermission: "workspace:delete",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    const [deletedWorkspace] = await this.db
      .delete(workspaces)
      .where(and(eq(workspaces.id, id)))
      .returning({
        id: workspaces.id,
      });
    return getModifyDataResult({
      data: deletedWorkspace,
    });
  }
}

export { WorkspacesService, getWorkspacesSchema };
