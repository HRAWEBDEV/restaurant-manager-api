import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import type { DBExecuter } from "../db/connect";
import {
  ogMemberRoles,
  organizationMembers,
} from "../db/schemas/organizationMembers";
import {
  insertOrganizationSchema,
  selectOrganizationSchema,
  updateOrganizationSchema as defaultUpdateOrganizationSchema,
  organizations,
} from "../db/schemas/organizations";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";
import {
  type ModifyData,
  getModifyDataResult,
} from "../utils/servicesGenericTypes";
import { z } from "@hono/zod-openapi";

function createOrganizationSlug(name: string) {
  return `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}_${nanoid(8)}`;
}

const getOrganizationsSchema = z.object({
  organizations: selectOrganizationSchema
    .extend({
      role: z.enum(ogMemberRoles),
    })
    .array(),
});
const updateOrganizationSchema = defaultUpdateOrganizationSchema.extend({
  id: z.string(),
  userId: z.string(),
});

type GetOrganizationsResult = z.infer<typeof getOrganizationsSchema>;
type ModifyOrganizationResult = ModifyData<{ id: string }>;

class OrganizationsService {
  constructor(private readonly db: DBExecuter) {}
  async getOrganizations({
    filters: { userId, organizationId },
  }: {
    filters: {
      userId: string;
      organizationId?: string;
    };
  }): Promise<GetOrganizationsResult> {
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
        role: organizationMembers.role,
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
    description,
  }: z.infer<
    typeof insertOrganizationSchema
  >): Promise<ModifyOrganizationResult> {
    const slug = createOrganizationSlug(name);
    const result = await this.db
      .insert(organizations)
      .values({
        name,
        slug,
        logo,
        description,
      })
      .returning({
        id: organizations.id,
      });
    return getModifyDataResult({
      data: result[0],
    });
  }

  async updateOrganization({
    id,
    userId,
    name,
    logo,
    description,
  }: z.infer<
    typeof updateOrganizationSchema
  >): Promise<ModifyOrganizationResult> {
    let slug: string | undefined = undefined;
    const currentOrganization = await this.getOrganization({
      filters: { userId, organizationId: id },
    });
    if (!currentOrganization) {
      return getModifyDataResult({
        notFound: true,
      });
    }
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: currentOrganization.role,
        rolePermission: "organization:update",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });

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
    return getModifyDataResult({
      data: updatedOrganization,
    });
  }
}

export type { GetOrganizationsResult };
export { OrganizationsService, getOrganizationsSchema };
