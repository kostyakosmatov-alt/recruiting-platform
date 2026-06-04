import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type IntakeFile = { name: string; url: string; type: string; extractedText?: string };
type Message = { role: "user" | "assistant"; content: string };

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await pdf(buffer);
    return data.text.slice(0, 8000);
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, 8000);
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8").slice(0, 8000);
  }
  return "";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await prisma.intakeSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `intake/${token}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("intake-files")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("intake-files").getPublicUrl(path);
  const extractedText = await extractText(buffer, file.type);

  const newFile: IntakeFile = {
    name: file.name,
    url: urlData.publicUrl,
    type: file.type,
    extractedText: extractedText || undefined,
  };

  const files = [...((session.files as IntakeFile[]) || []), newFile];
  const systemMsg: Message = {
    role: "assistant",
    content: `📎 Файл **${file.name}** успешно загружен${extractedText ? " и прочитан" : ""}. ${extractedText ? "Я ознакомился с его содержимым и учту при составлении брифа." : ""}`,
  };
  const messages = [...((session.messages as Message[]) || []), systemMsg];

  await prisma.intakeSession.update({ where: { token }, data: { files, messages } });

  return NextResponse.json({ file: newFile });
}
