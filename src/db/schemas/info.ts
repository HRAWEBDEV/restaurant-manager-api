import { varchar, snakeCase } from "drizzle-orm/pg-core";

const info = snakeCase.table("info", {
  title: varchar("title", { length: 50 }).default("restaurant manager app"),
});

export { info };
