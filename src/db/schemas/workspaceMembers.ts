import {
  uuid,
  pgEnum,
  unique,
  timestamp,
  snakeCase,
  text,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { organizationMembers } from "./organizationMembers";
import { workspaces } from "./workspaces";
import { user } from "../../../auth-schema";

export const roleEnum = pgEnum("workspace_roles", ["dmin", "member"]);

type WorkspaceMember = typeof workspaceMembers.$inferSelect;
type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;

const workspaceMembers = snakeCase.table(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),
    organizationMemberId: uuid("organization_member_id")
      .notNull()
      .references(() => organizationMembers.id, {
        onDelete: "cascade",
      }),
    role: roleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    addedBy: text("added_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("workspace_members_unique").on(
      table.organizationMemberId,
      table.workspaceId,
    ),
  ],
);

const { createInsertSchema, createSelectSchema } = createSchemaFactory({
  zodInstance: z,
});
const selectWorkspaceMemberSchema = createSelectSchema(workspaceMembers);
const insertWorkspaceMember = createInsertSchema(workspaceMembers);

export type { WorkspaceMember, InsertWorkspaceMember };
export { workspaceMembers, selectWorkspaceMemberSchema, insertWorkspaceMember };
