import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and, or, sql, isNotNull } from "drizzle-orm";
import type { DBExecuter } from "../db/connect";
import {
  workspaces,
  type InsertWorkspace,
  type Workspace,
} from "../db/schemas/workspaces";
import { organizations } from "../db/schemas/organizations";
import { organizationMembers } from "../db/schemas/organizationMembers";
import { workspaceMembers } from "../db/schemas/workspaceMembers";
import { OrganizationsService } from "./organizationsService";
import { hasPermission as hasOrganizationPermission } from "../utils/permissions/organizationPermissions";
import { z } from "@hono/zod-openapi";
import { ogMemberRoles } from "../db/schemas/organizationMembers";

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
  }) {
    let baseQuery = this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        createdBy: workspaces.createdBy,
        organizationId: workspaces.organizationId,
        organizationName: organizations.name,
        organizationRole: organizationMembers.role,
        organizationSlug: organizations.slug,
        workspaceMemberRole: sql<string>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
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
  }) {
    const organizationService = new OrganizationsService(this.db);
    const organization = await organizationService.getOrganization({
      filters: {
        userId: createdBy,
        organizationId,
      },
    });
    if (
      !organization ||
      !hasOrganizationPermission(organization.userRole, "workspace:create")
    )
      return undefined;
    const slug = `${slugify(name, {
      trim: true,
      strict: true,
      lower: true,
    })}_${nanoid(8)}`;
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
    return createdWorkspace;
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
    organizationId,
  }: Pick<Workspace, "id" | "organizationId"> & { userId: string } & Partial<
      Pick<InsertWorkspace, "name" | "description">
    >) {
    let slug: string | undefined = undefined;
    const currentWorkspace = await this.getWorkspace({
      filters: { userId, workspaceId: id },
    });
    if (
      !currentWorkspace ||
      !hasOrganizationPermission(
        currentWorkspace.organizationRole,
        "workspace:create",
      )
    )
      return undefined;
    if (name) {
      if (currentWorkspace && currentWorkspace.name !== name) {
        slug = `${slugify(name, {
          trim: true,
          strict: true,
          lower: true,
        })}_${nanoid(8)}`;
      }
    }
    const [updatedWorkspace] = await this.db
      .update(workspaces)
      .set({
        name,
        slug,
        description,
      })
      .where(
        and(
          eq(workspaces.id, id),
          eq(workspaces.organizationId, organizationId),
        ),
      )
      .returning({
        id: workspaces.id,
      });
    return updatedWorkspace;
  }
  async deleteWorkspace({
    id,
    organizationId,
    userId,
  }: Pick<Workspace, "id" | "organizationId"> & {
    userId: string;
  }) {
    const organizationService = new OrganizationsService(this.db);
    const organization = await organizationService.getOrganization({
      filters: {
        organizationId,
        userId,
      },
    });
    if (
      !organization ||
      !hasOrganizationPermission(organization.userRole, "workspace:delete")
    )
      return;
    const [deletedWorkspace] = await this.db
      .delete(workspaces)
      .where(
        and(
          eq(workspaces.id, id),
          eq(workspaces.organizationId, organizationId),
        ),
      )
      .returning({
        id: workspaces.id,
      });
    return deletedWorkspace;
  }
}

type GetWorkspacesResult = Awaited<
  ReturnType<WorkspacesService["getWorkspaces"]>
>;

const getWorkspacesResultSchema: z.ZodType<GetWorkspacesResult> = z.object({
  workspaces: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      createdBy: z.string().nullable(),
      organizationId: z.string(),
      organizationName: z.string(),
      organizationRole: z.enum(ogMemberRoles),
      organizationSlug: z.string(),
      workspaceMemberRole: z.string(),
    })
    .array(),
});

export { WorkspacesService, getWorkspacesResultSchema };
