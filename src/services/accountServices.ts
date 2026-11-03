import type { DBExecuter } from "../db/connect";
import type { InsertOrganization } from "../db/schemas/organizations";
import { OrganizationMembersService } from "./organizationMembers";
import { OrganizationsService } from "./organizationsService";
import { WorkspaceMembersService } from "./workspaceMembersService";
import { WorkspacesService } from "./workspacesService";

class AccountServices {
  constructor(private readonly db: DBExecuter) {}
  async createAccount({
    organization,
    userId,
  }: {
    organization: Omit<
      InsertOrganization,
      "id" | "createdAt" | "updatedAt" | "slug"
    >;
    userId: string;
  }) {
    const createdWorkspaceMember = await this.db.transaction(async (tx) => {
      const organizationsService = new OrganizationsService(tx);
      const organizationMembersService = new OrganizationMembersService(tx);
      const workspacesService = new WorkspacesService(tx);
      const workspaceMemberService = new WorkspaceMembersService(tx);
      const createdOrganization =
        await organizationsService.createOrganization(organization);
      const createdMember = await organizationMembersService.createMember({
        userId,
        organizationId: createdOrganization!.data!.id,
        role: "owner",
      });
      const createdWorkspace = await workspacesService.createPublicWorkspace({
        createdBy: userId,
        organizationId: createdOrganization!.data!.id,
      });
      const createdWorkspaceMember =
        await workspaceMemberService.createWorkspaceMember({
          newMemberUserId: userId,
          workspaceId: createdWorkspace.data!.id!,
          type: "systematic",
          role: "admin",
          organizationMemberId: createdMember!.id,
        });
      return createdWorkspaceMember;
    });
    return {
      success: !!createdWorkspaceMember.data?.id,
    };
  }
}

export { AccountServices };
