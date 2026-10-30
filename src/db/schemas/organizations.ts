import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { trackChanges } from "../utils/trackChanges";

type Organization = typeof organizations.$inferSelect;
type InsertOrganization = typeof organizations.$inferInsert;

const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  logo: text("logo"),
  description: text("description"),
  ...trackChanges,
});

const { createInsertSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
});
const insertOrganizationSchema = createInsertSchema(organizations);
const updateOrganizationSchema = createUpdateSchema(organizations);

export type { Organization, InsertOrganization };
export { organizations, insertOrganizationSchema, updateOrganizationSchema };
