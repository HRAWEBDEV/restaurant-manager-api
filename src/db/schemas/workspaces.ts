import { uuid, varchar, text, snakeCase } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-orm/zod";
import { organizations } from "./organizations";
import { trackChanges } from "../utils/trackChanges";
import { user } from "../../../auth-schema";
import { z } from "@hono/zod-openapi";

type Workspace = typeof workspaces.$inferSelect;
type InsertWorkspace = typeof workspaces.$inferInsert;

const workspaces = snakeCase.table("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, {
      onDelete: "cascade",
    }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  description: text("description"),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...trackChanges,
});

const { createInsertSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
});
const insertWorkspaceSchema = createInsertSchema(workspaces);
const updateWorkspaceSchema = createUpdateSchema(workspaces);

export type { Workspace, InsertWorkspace };
export { workspaces, insertWorkspaceSchema, updateWorkspaceSchema };
