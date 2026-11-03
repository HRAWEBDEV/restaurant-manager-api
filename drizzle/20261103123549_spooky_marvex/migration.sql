ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "workspace_roles";--> statement-breakpoint
CREATE TYPE "workspace_roles" AS ENUM('admin', 'member');--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DATA TYPE "workspace_roles" USING "role"::"workspace_roles";--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'member'::"workspace_roles";