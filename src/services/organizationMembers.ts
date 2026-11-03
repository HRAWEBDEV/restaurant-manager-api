import { and, eq, not, type SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  selectOrganizationMemberSchema,
  organizationMembers,
  type InsertOrganizationMember,
  type OrganizationMember,
  ogMemberRoles,
} from "../db/schemas/organizationMembers";
import type { DBExecuter } from "../db/connect";
import { organizations } from "../db/schemas/organizations";
import { user } from "../../auth-schema";
import { checkUserPermissions } from "../middlewares/checkUserPermissionsMiddleware";
import { z } from "@hono/zod-openapi";
import {
  getModifyDataResult,
  type ModifyData,
} from "../utils/servicesGenericTypes";

const getOrganizationMembersSchema = z.object({
  members: selectOrganizationMemberSchema
    .extend({
      username: z.string().nullable(),
      userFirstName: z.string(),
      userLastName: z.string(),
      userEmail: z.string(),
      userAvatar: z.string().nullable(),
      userPhoneNumber: z.string().nullable(),
      organizationName: z.string(),
      role: z.enum(ogMemberRoles),
      addedByUsername: z.string().nullable(),
      addedByFirstName: z.string().nullable(),
      addedByLastName: z.string().nullable(),
    })
    .array(),
  permissionDenied: z.boolean(),
});

type GetOrganizationMembersResult = z.infer<
  typeof getOrganizationMembersSchema
>;
interface GetOrganizationMembersProps {
  filters: {
    userId?: string;
    organizationId: string;
    selectorUserId: string;
  };
}
interface GetOrganizationMemberProps {
  filters: {
    userId: string;
    organizationId: string;
    selectorUserId: string;
  };
}

type ModifyOrganizationMemberResult = ModifyData<{ id: string }>;

class OrganizationMembersService {
  constructor(private readonly db: DBExecuter) {}
  private async getOrganizationMembersNP({
    filters,
  }: GetOrganizationMembersProps): Promise<GetOrganizationMembersResult> {
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
    return { members, permissionDenied: false };
  }

  async getOrganizationMembers(
    props: GetOrganizationMembersProps,
  ): Promise<GetOrganizationMembersResult> {
    const selector = await this.getOrganizationMemberNP({
      filters: {
        userId: props.filters.selectorUserId,
        organizationId: props.filters.organizationId,
        selectorUserId: props.filters.selectorUserId,
      },
    });
    if (
      !selector ||
      !checkUserPermissions({
        type: "organization",
        organizationRole: selector.role,
        rolePermission: "organization_member:read",
      })
    )
      return {
        members: [],
        permissionDenied: true,
      };

    return this.getOrganizationMembersNP(props);
  }

  private async getOrganizationMemberNP({
    filters,
  }: GetOrganizationMemberProps) {
    return (
      await this.getOrganizationMembersNP({
        filters,
      })
    ).members[0];
  }

  async getOrganizationMember({ filters }: GetOrganizationMemberProps) {
    return (
      await this.getOrganizationMembers({
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
  }): Promise<ModifyOrganizationMemberResult> {
    const organizationMember = await this.getOrganizationMemberNP({
      filters: {
        userId: updatedBy,
        selectorUserId: updatedBy,
        organizationId,
      },
    });
    if (!organizationMember)
      return getModifyDataResult({
        notFound: true,
      });
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: organizationMember.role,
        rolePermission: "organization_member:update",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
    const filtersConditions: (SQLWrapper | undefined)[] = [
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.id, id),
    ];
    if (organizationMember.role === "owner") {
    } else if (organizationMember.role === "admin") {
      if (role === "owner")
        return getModifyDataResult({
          permissionDenied: true,
        });
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
    return getModifyDataResult({
      data: updatedMember,
    });
  }

  async deleteOrganizationMember({
    organizationId,
    id,
    updatedBy,
  }: Pick<OrganizationMember, "organizationId" | "id"> & {
    updatedBy: string;
  }): Promise<ModifyOrganizationMemberResult> {
    const organizationMember = await this.getOrganizationMemberNP({
      filters: {
        organizationId,
        userId: updatedBy,
        selectorUserId: updatedBy,
      },
    });
    if (!organizationMember)
      return getModifyDataResult({
        notFound: true,
      });
    if (
      !checkUserPermissions({
        type: "organization",
        organizationRole: organizationMember.role,
        rolePermission: "organization_member:delete",
      })
    )
      return getModifyDataResult({
        permissionDenied: true,
      });
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
    return getModifyDataResult({
      data: deleteOrganizationMember,
    });
  }
}

export { OrganizationMembersService, getOrganizationMembersSchema };
