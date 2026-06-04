import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/intake-prompt";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Message = { role: "user" | "assistant"; content: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await prisma.intakeSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.status === "COMPLETED") return NextResponse.json({ error: "Session completed" }, { status: 400 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  const messages = (session.messages as Message[]) || [];
  const files = (session.files as { name: string; extractedText?: string }[]) || [];

  // Добавляем контекст загруженных файлов в системный промпт
  let systemPrompt = INTAKE_SYSTEM_PROMPT;
  if (files.length > 0) {
    const fileContext = files
      .filter(f => f.extractedText)
      .map(f => `=== Файл: ${f.name} ===\n${f.extractedText}`)
      .join("\n\n");
    if (fileContext) systemPrompt += `\n\nЗАГРУЖЕННЫЕ ДОКУМЕНТЫ:\n${fileContext}`;
  }

  const updatedMessages: Message[] = [...messages, { role: "user", content }];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: updatedMessages,
  });

  const assistantContent = response.content[0].type === "text" ? response.content[0].text : "";
  const done = assistantContent.includes("INTERVIEW_COMPLETE");

  const finalMessages: Message[] = [...updatedMessages, { role: "assistant", content: assistantContent }];

  await prisma.intakeSession.update({
    where: { token },
    data: {
      messages: finalMessages,
      status: session.status === "PENDING" ? "IN_PROGRESS" : session.status,
    },
  });

  return NextResponse.json({ message: assistantContent, done });
}
