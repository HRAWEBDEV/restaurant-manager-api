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
        userAvatar: user.avatar,
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
    updatorRole,
  }: Pick<OrganizationMember, "organizationId" | "id" | "role"> & {
    updatorRole: OrganizationMember["role"];
  }) {
    const filtersConditions: (SQLWrapper | undefined)[] = [
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.id, id),
    ];
    if (updatorRole === "owner") {
      filtersConditions.push(not(eq(organizationMembers.role, "owner")));
    } else if (updatorRole === "admin") {
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
    role,
  }: Pick<OrganizationMember, "organizationId" | "id" | "role">) {
    const filtersConditions: (SQLWrapper | undefined)[] = [
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.id, id),
    ];
    if (role === "owner") {
      filtersConditions.push(not(eq(organizationMembers.role, "owner")));
    } else if (role === "admin") {
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
