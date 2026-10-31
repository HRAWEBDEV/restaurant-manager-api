import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import type { DBExecuter } from "../db/connect";
import { organizationMembers } from "../db/schemas/organizationMembers";
import {
  type InsertOrganization,
  type Organization,
  organizations,
} from "../db/schemas/organizations";

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
    return organizationsResult;
  }
  async getOrganization({
    filters,
  }: {
    filters: {
      userId: string;
      organizationId: string;
    };
  }) {
    return (await this.getOrganizations({ filters }))[0];
  }
  async createOrganization({
    name,
    logo,
  }: Pick<InsertOrganization, "name" | "logo">) {
    const slug = `${slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    })}_${nanoid(8)}`;
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
    if (name) {
      const currentOrganization = await this.getOrganization({
        filters: { userId, organizationId: id },
      });
      if (currentOrganization && currentOrganization.name !== name) {
        slug = `${slugify(name, {
          lower: true,
          strict: true,
          trim: true,
        })}_${nanoid(8)}`;
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

export { OrganizationsService };
