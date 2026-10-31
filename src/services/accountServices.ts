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
    await this.db.transaction(async (tx) => {
      const organizationsService = new OrganizationsService(tx);
      const organizationMembersService = new OrganizationMembersService(tx);
      const workspacesService = new WorkspacesService(tx);
      const workspaceMembersService = new WorkspaceMembersService(tx);
      const createdOrganization =
        await organizationsService.createOrganization(organization);
      const createOrganizationMember =
        await organizationMembersService.createMember({
          userId,
          organizationId: createdOrganization!.id,
          role: "owner",
        });
      const createdWorkspace = await workspacesService.createPublicWorkspace({
        createdBy: userId,
        organizationId: createdOrganization!.id,
      });
      await workspaceMembersService.createWorkspaceMember({
        organizationMemberId: createOrganizationMember!.id,
        workspaceId: createdWorkspace!.id,
      });
    });
    return {
      message: "account created successfully",
    };
  }
}

export { AccountServices };
