-- Add isShortcut column to Folder table
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "isShortcut" BOOLEAN NOT NULL DEFAULT false;

-- Create Role enum type
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('VIEWER', 'EDITOR', 'ADMINISTRATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- First, add a temporary column with the new type
ALTER TABLE "UserRole" ADD COLUMN "role_new" "Role";

-- Update the temporary column with converted values
UPDATE "UserRole" 
SET "role_new" = CASE 
    WHEN LOWER("role") = 'admin' THEN 'ADMINISTRATOR'::"Role"
    WHEN LOWER("role") = 'editor' THEN 'EDITOR'::"Role"
    ELSE 'VIEWER'::"Role"
END;

-- Drop the old column and rename the new one
ALTER TABLE "UserRole" DROP COLUMN "role";
ALTER TABLE "UserRole" RENAME COLUMN "role_new" TO "role";

-- Add NOT NULL constraint
ALTER TABLE "UserRole" ALTER COLUMN "role" SET NOT NULL; 