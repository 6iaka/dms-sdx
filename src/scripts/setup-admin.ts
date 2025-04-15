import { prisma } from "~/server/db";
import { Role } from "@prisma/client";

async function main() {
  const adminUserId = process.argv[2];
  if (!adminUserId) {
    console.error("Please provide a user ID as an argument");
    process.exit(1);
  }

  try {
    await prisma.userRole.upsert({
      where: { userId: adminUserId },
      update: { role: Role.ADMINISTRATOR },
      create: { userId: adminUserId, role: Role.ADMINISTRATOR },
    });
    console.log(`Successfully set user ${adminUserId} as administrator`);
  } catch (error) {
    console.error("Error setting user as administrator:", error);
    process.exit(1);
  }
}

main(); 