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
import { OrganizationsService } from "./organizationsService";

class OrganizationMembersService {
  constructor(private readonly db: DBExecuter) {}
  async getOrganizationsMembers({
    filters,
  }: {
    filters: {
      userId?: string;
      organizationId: string;
      selectorUserId: string;
    };
  }) {
    const organizationService = new OrganizationsService(this.db);
    const organization = await organizationService.getOrganization({
      filters: {
        userId: filters.selectorUserId,
        organizationId: filters.organizationId,
      },
    });
    if (
      !organization ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: organization.userRole,
        rolePermission: "organization_member:read",
      })
    )
      return {
        members: [],
      };
    const addedByUsers = alias(user, "addedByUsers");
    const filterConditions = [
      eq(organizationMembers.organizationId, filters.organizationId),
    ];
    if (filters.userId) {
      filterConditions.push(eq(organizationMembers.userId, filters.userId));
    }
    let baseQuery = this.db
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
      .$dynamic();
    baseQuery = baseQuery
      .where(and(...filterConditions))
      .orderBy(organizationMembers.joinedAt);
    if (filters.userId) {
      baseQuery.limit(1);
    }
    const members = await baseQuery;
    return { members };
  }
  async getOrganizationMember({
    filters,
  }: {
    filters: {
      userId: string;
      organizationId: string;
      selectorUserId: string;
    };
  }) {
    return (
      await this.getOrganizationsMembers({
        filters,
      })
    ).members[0];
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
    id,
    organizationId,
    role,
    updatedBy,
  }: Pick<OrganizationMember, "organizationId" | "id" | "role"> & {
    updatedBy: string;
  }) {
    const organizationMember = await this.getOrganizationMember({
      filters: {
        userId: updatedBy,
        selectorUserId: updatedBy,
        organizationId,
      },
    });
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
      if (role === "owner") return;
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
    updatedBy,
  }: Pick<OrganizationMember, "organizationId" | "id"> & {
    updatedBy: string;
  }) {
    const organizationMember = await this.getOrganizationMember({
      filters: {
        organizationId,
        userId: updatedBy,
        selectorUserId: updatedBy,
      },
    });
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
