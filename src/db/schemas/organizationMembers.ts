import {
  snakeCase,
  uuid,
  pgEnum,
  unique,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-orm/zod";
import { organizations } from "./organizations";
import { user } from "../../../auth-schema";
import { z } from "@hono/zod-openapi";

const roleEnum = pgEnum("organization_roles", ["owner", "admin", "member"]);

type OrganizationMember = typeof organizationMembers.$inferSelect;
type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

const organizationMembers = snakeCase.table(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
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
    unique("organization_members_unique").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

const { createSelectSchema } = createSchemaFactory({
  zodInstance: z,
});
const selectOrganizationMemberSchema = createSelectSchema(organizationMembers);

export type { OrganizationMember, InsertOrganizationMember };
export { organizationMembers, roleEnum, selectOrganizationMemberSchema };
