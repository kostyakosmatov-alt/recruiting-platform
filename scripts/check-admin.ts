import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "admin@ctb.agency" } });
  console.log("User found:", !!user);
  if (user) {
    console.log("isActive:", user.isActive);
    console.log("role:", user.role);
    console.log("password is bcrypt:", user.password.startsWith("$2"));
    const valid = await bcrypt.compare("admin123", user.password);
    console.log("bcrypt.compare('admin123', hash):", valid);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
