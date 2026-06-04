import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Message = { role: "user" | "assistant"; content: string };

export async function confirmIntakeSession(token: string): Promise<{ vacancyId: string }> {
  const session = await prisma.intakeSession.findUnique({
    where: { token },
    include: { client: true },
  });
  if (!session) throw new Error("Session not found");

  const messages = (session.messages as Message[]) || [];
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Заказчик" : "HR"}: ${m.content}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `На основе следующего интервью с заказчиком верни ТОЛЬКО валидный JSON (без markdown, без пояснений) для создания вакансии:

${transcript}

JSON должен иметь структуру:
{
  "title": string,
  "description": string,
  "requirements": string,
  "salaryFrom": number | null,
  "salaryTo": number | null,
  "location": string | null,
  "remote": boolean
}`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  const vacancyData = JSON.parse(jsonMatch[0]) as {
    title: string; description: string; requirements: string;
    salaryFrom: number | null; salaryTo: number | null;
    location: string | null; remote: boolean;
  };

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) throw new Error("No admin user found");

  const vacancy = await prisma.vacancy.create({
    data: {
      title: vacancyData.title || "Вакансия из брифинга",
      description: vacancyData.description || null,
      requirements: vacancyData.requirements || null,
      salaryFrom: vacancyData.salaryFrom ? Math.round(vacancyData.salaryFrom) : null,
      salaryTo: vacancyData.salaryTo ? Math.round(vacancyData.salaryTo) : null,
      location: vacancyData.location || null,
      remote: vacancyData.remote ?? false,
      status: "DRAFT",
      clientId: session.clientId,
      recruiterId: adminUser.id,
      teamRecruiters: { connect: { id: adminUser.id } },
    },
  });

  await prisma.intakeSession.update({
    where: { token },
    data: { status: "COMPLETED", vacancyId: vacancy.id },
  });

  return { vacancyId: vacancy.id };
}
