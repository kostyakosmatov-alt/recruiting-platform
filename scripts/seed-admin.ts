import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@ctb.agency";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", password: hashed, isActive: true, name },
    });
    console.log(`Updated existing user ${email} → ADMIN`);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, password: hashed, name, role: "ADMIN", isActive: true },
    });
    console.log(`Created admin user ${email}`);
  }

  console.log(`\nLogin: ${email}\nPassword: ${password}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
