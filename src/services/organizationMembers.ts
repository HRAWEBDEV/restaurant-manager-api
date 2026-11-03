import { and, eq, not, type SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  organizationMembers,
  type InsertOrganizationMember,
  type OrganizationMember,
} from "../db/schemas/organizationMembers";
import type { DBExecuter } from "../db/connect";
import { organizations } from "../db/schemas/organizations";
import { user } from "../../auth-schema";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";

class OrganizationMembersService {
  constructor(private readonly db: DBExecuter) {}
  async getOrganizationsMembers({
    filters,
  }: {
    filters: { organizationId: string };
  }) {
    const addedByUsers = alias(user, "addedByUsers");
    const members = await this.db
      .select({
        id: organizationMembers.id,
        userId: user.id,
        username: user.username,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        userAvatar: user.image,
        userPhoneNumber: user.phoneNumber,
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        addedBy: organizationMembers.addedBy,
        addedByUsername: addedByUsers.username,
        addedByFirstName: addedByUsers.firstName,
        addedByLastName: addedByUsers.lastName,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .innerJoin(user, eq(user.id, organizationMembers.userId))
      .leftJoin(addedByUsers, eq(addedByUsers.id, organizationMembers.addedBy))
      .where(eq(organizationMembers.organizationId, filters.organizationId))
      .orderBy(organizationMembers.joinedAt);
    return members;
  }
  async getOrganizationMember(organizationId: string, userId: string) {
    const [member] = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1);
    return member || null;
  }
  async createMember({
    userId,
    organizationId,
    role,
    addedBy,
  }: Pick<
    InsertOrganizationMember,
    "organizationId" | "role" | "userId" | "addedBy"
  >) {
    const result = await this.db
      .insert(organizationMembers)
      .values({ userId, organizationId, role, addedBy })
      .returning({
        id: organizationMembers.id,
      });
    return result[0];
  }
  async updateOrganizationMemberRole({
    organizationId,
    id,
    role,
    updatorId,
  }: Pick<OrganizationMember, "organizationId" | "id" | "role"> & {
    updatorId: string;
  }) {
    const organizationMember = await this.getOrganizationMember(
      organizationId,
      updatorId,
    );
    if (
      !organizationMember ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: organizationMember.role,
        rolePermission: "organization_member:update",
      })
    )
      return;
    const filtersConditions: (SQLWrapper | undefined)[] = [
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.id, id),
    ];
    if (organizationMember.role === "owner") {
    } else if (organizationMember.role === "admin") {
      filtersConditions.push(
        and(
          not(eq(organizationMembers.role, "owner")),
          not(eq(organizationMembers.role, "admin")),
        ),
      );
    }
    const [updatedMember] = await this.db
      .update(organizationMembers)
      .set({ role })
      .where(and(...filtersConditions))
      .returning({
        id: organizationMembers.id,
        role: organizationMembers.role,
      });
    return updatedMember;
  }

  async deleteOrganizationMember({
    organizationId,
    id,
    updatorId,
  }: Pick<OrganizationMember, "organizationId" | "id"> & {
    updatorId: string;
  }) {
    const organizationMember = await this.getOrganizationMember(
      organizationId,
      updatorId,
    );
    if (
      !organizationMember ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: organizationMember.role,
        rolePermission: "organization_member:delete",
      })
    )
      return;
    const filtersConditions: (SQLWrapper | undefined)[] = [
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.id, id),
    ];
    if (organizationMember.role === "owner") {
      filtersConditions.push(not(eq(organizationMembers.role, "owner")));
    } else if (organizationMember.role === "admin") {
      filtersConditions.push(
        and(
          not(eq(organizationMembers.role, "owner")),
          not(eq(organizationMembers.role, "admin")),
        ),
      );
    }
    const [deleteOrganizationMember] = await this.db
      .delete(organizationMembers)
      .where(and(...filtersConditions))
      .returning({
        id: organizationMembers.id,
      });
    return deleteOrganizationMember;
  }
}

export { OrganizationMembersService };
