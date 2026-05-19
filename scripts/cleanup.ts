import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const voksisClient = await prisma.client.findFirst({
    where: { name: { contains: "Воксис" } },
  });

  if (!voksisClient) {
    console.log("❌ Клиент Воксис не найден");
    process.exit(1);
  }
  console.log(`✓ Сохраняем клиента: ${voksisClient.name} [${voksisClient.id}]`);

  // Delete in dependency order
  const notes     = await prisma.note.deleteMany();
  console.log(`✓ Удалено заметок: ${notes.count}`);

  const files     = await prisma.candidateFile.deleteMany();
  console.log(`✓ Удалено файлов: ${files.count}`);

  const apps      = await prisma.application.deleteMany();
  console.log(`✓ Удалено заявок: ${apps.count}`);

  const vacancies = await prisma.vacancy.deleteMany();
  console.log(`✓ Удалено вакансий: ${vacancies.count}`);

  const candidates = await prisma.candidate.deleteMany();
  console.log(`✓ Удалено кандидатов: ${candidates.count}`);

  const clients = await prisma.client.deleteMany({
    where: { id: { not: voksisClient.id } },
  });
  console.log(`✓ Удалено других клиентов: ${clients.count}`);

  console.log("\n✅ База очищена. Остался клиент:", voksisClient.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
