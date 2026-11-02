import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import type { DBExecuter } from "../db/connect";
import {
  organizationMembers,
  ogMemberRoles,
} from "../db/schemas/organizationMembers";
import {
  type InsertOrganization,
  type Organization,
  organizations,
} from "../db/schemas/organizations";
import { z } from "@hono/zod-openapi";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";

function createOrganizationSlug(name: string) {
  return `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}_${nanoid(8)}`;
}

class OrganizationsService {
  constructor(private readonly db: DBExecuter) {}
  async getOrganizations({
    filters: { userId, organizationId },
  }: {
    filters: {
      userId: string;
      organizationId?: string;
    };
  }) {
    const filterConditions = [eq(organizationMembers.userId, userId)];
    if (organizationId) {
      filterConditions.push(eq(organizations.id, organizationId));
    }
    const organizationsResult = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logo: organizations.logo,
        slug: organizations.slug,
        description: organizations.description,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        userRole: organizationMembers.role,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, organizations.id),
          eq(organizationMembers.userId, userId),
        ),
      )
      .where(and(...filterConditions))
      .orderBy(organizations.createdAt);
    return {
      organizations: organizationsResult,
    };
  }
  async getOrganization({
    filters,
  }: {
    filters: {
      userId: string;
      organizationId: string;
    };
  }) {
    return (await this.getOrganizations({ filters })).organizations[0];
  }
  async createOrganization({
    name,
    logo,
  }: Pick<InsertOrganization, "name" | "logo">) {
    const slug = createOrganizationSlug(name);
    const result = await this.db
      .insert(organizations)
      .values({
        name,
        slug,
        logo,
      })
      .returning({
        id: organizations.id,
      });
    return result[0];
  }

  async updateOrganization({
    id,
    userId,
    name,
    logo,
    description,
  }: Pick<Organization, "id"> & { userId: string } & Partial<
      Pick<InsertOrganization, "name" | "logo" | "description">
    >) {
    let slug: string | undefined = undefined;
    const currentOrganization = await this.getOrganization({
      filters: { userId, organizationId: id },
    });
    if (
      !currentOrganization ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: currentOrganization.userRole,
        rolePermission: "organization:update",
      })
    )
      return undefined;
    if (name) {
      if (currentOrganization.name !== name) {
        slug = createOrganizationSlug(name);
      }
    }
    const [updatedOrganization] = await this.db
      .update(organizations)
      .set({
        name,
        logo,
        slug,
        description,
      })
      .where(eq(organizations.id, id))
      .returning({
        id: organizations.id,
      });
    return updatedOrganization;
  }
}

type GetOrganizationsResult = Awaited<
  ReturnType<OrganizationsService["getOrganizations"]>
>;
const getOrganizationsResultSchema: z.ZodType<GetOrganizationsResult> =
  z.object({
    organizations: z
      .object({
        id: z.string(),
        name: z.string(),
        logo: z.string().nullable(),
        slug: z.string(),
        description: z.string().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        userRole: z.enum(ogMemberRoles),
      })
      .array(),
  });

export { OrganizationsService, getOrganizationsResultSchema };
