import { prisma } from "~/server/db";

async function setupAdmin() {
  const adminUserId = process.env.ADMIN_USER_ID;
  
  if (!adminUserId) {
    console.error("ADMIN_USER_ID environment variable is not set");
    process.exit(1);
  }

  try {
    await prisma.userRole.upsert({
      where: { userId: adminUserId },
      update: { role: "admin" },
      create: { userId: adminUserId, role: "admin" },
    });
    
    console.log("Admin user setup completed successfully");
  } catch (error) {
    console.error("Failed to setup admin user:", error);
    process.exit(1);
  }
}

setupAdmin(); 