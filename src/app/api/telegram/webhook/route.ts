import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/intake-prompt";
import { confirmIntakeSession } from "@/lib/intake-confirm";
import mammoth from "mammoth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Message = { role: "user" | "assistant"; content: string };
type IntakeFile = { name: string; url: string; type: string; extractedText?: string };

async function sendMessage(chatId: number | string, text: string, extra?: object) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...extra }),
  });
}

async function editMessageReplyMarkup(chatId: number | string, messageId: number) {
  await fetch(`${TG_API}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  });
}

async function askClaude(messages: Message[], fileContext: string): Promise<string> {
  let systemPrompt = INTAKE_SYSTEM_PROMPT;
  if (fileContext) systemPrompt += `\n\nЗАГРУЖЕННЫЕ ДОКУМЕНТЫ:\n${fileContext}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function requestTranscription(chatId: number, messageId: number): Promise<void> {
  await fetch(`${TG_API}/transcribeAudio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

async function handleVoiceTranscriptionResult(chatId: number, messageId: number, voiceText: string) {
  const session = await prisma.intakeSession.findFirst({
    where: { telegramChatId: String(chatId), status: "IN_PROGRESS" },
  });
  if (!session) return;

  const messages = (session.messages as Message[]) || [];
  const pendingKey = `__PENDING_VOICE__:${messageId}`;
  const hasPending = messages.some((m) => m.role === "user" && m.content === pendingKey);
  if (!hasPending) return;

  const cleanedMessages = messages.filter((m) => !(m.role === "user" && m.content === pendingKey));
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { messages: cleanedMessages },
  });

  await sendMessage(chatId, `_Распознано:_ "${voiceText}"`);
  await handleText(chatId, voiceText);
}

function buildFileContext(files: IntakeFile[]): string {
  return files
    .filter((f) => f.extractedText)
    .map((f) => `=== Файл: ${f.name} ===\n${f.extractedText}`)
    .join("\n\n");
}

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
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

async function handleStart(chatId: number, fromName: string, token: string) {
  const session = await prisma.intakeSession.findUnique({ where: { token } });

  if (!session) {
    await sendMessage(chatId, "❌ Ссылка недействительна или устарела. Обратитесь к рекрутеру.");
    return;
  }
  if (session.status === "COMPLETED") {
    await sendMessage(chatId, "✅ Этот брифинг уже завершён и вакансия создана.");
    return;
  }

  await prisma.intakeSession.update({
    where: { token },
    data: {
      channel: "TELEGRAM",
      telegramChatId: String(chatId),
      contactName: fromName,
      status: "IN_PROGRESS",
    },
  });

  const greeting = await askClaude([], "");
  const finalMessages: Message[] = [{ role: "assistant", content: greeting }];

  await prisma.intakeSession.update({
    where: { token },
    data: { messages: finalMessages },
  });

  await sendMessage(chatId, greeting);
}

async function handleText(chatId: number, text: string) {
  const session = await prisma.intakeSession.findFirst({
    where: { telegramChatId: String(chatId), status: "IN_PROGRESS" },
  });

  if (!session) {
    await sendMessage(chatId, "Сначала перейдите по ссылке от рекрутера, чтобы начать брифинг.");
    return;
  }

  const messages = (session.messages as Message[]) || [];
  const files = (session.files as IntakeFile[]) || [];
  const fileContext = buildFileContext(files);

  const updatedMessages: Message[] = [...messages, { role: "user", content: text }];
  const assistantText = await askClaude(updatedMessages, fileContext);
  const done = assistantText.includes("INTERVIEW_COMPLETE");

  const finalMessages: Message[] = [...updatedMessages, { role: "assistant", content: assistantText }];
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { messages: finalMessages },
  });

  if (done) {
    const preview = assistantText.replace("INTERVIEW_COMPLETE", "").trim();
    await sendMessage(chatId, preview, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Подтвердить и создать вакансию", callback_data: "confirm" },
          { text: "✏️ Хочу кое-что изменить", callback_data: "edit" },
        ]],
      },
    });
  } else {
    await sendMessage(chatId, assistantText);
  }
}

async function handleDocument(chatId: number, fileId: string, fileName: string, mimeType: string) {
  const session = await prisma.intakeSession.findFirst({
    where: { telegramChatId: String(chatId), status: "IN_PROGRESS" },
  });
  if (!session) {
    await sendMessage(chatId, "Сначала перейдите по ссылке от рекрутера.");
    return;
  }

  // Получить file_path от Telegram
  const fileRes = await fetch(`${TG_API}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json() as { ok: boolean; result: { file_path: string } };
  if (!fileData.ok) {
    await sendMessage(chatId, "❌ Не удалось получить файл.");
    return;
  }

  const filePath = fileData.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const fileResponse = await fetch(fileUrl);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Загрузить в Supabase Storage
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const storagePath = `intake/${session.token}/${Date.now()}.${ext}`;
  await supabase.storage
    .from("intake-files")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  const { data: urlData } = supabase.storage.from("intake-files").getPublicUrl(storagePath);

  const extractedText = await extractTextFromBuffer(buffer, mimeType);

  const newFile: IntakeFile = {
    name: fileName,
    url: urlData.publicUrl,
    type: mimeType,
    extractedText: extractedText || undefined,
  };

  const files = [...((session.files as IntakeFile[]) || []), newFile];
  const messages = (session.messages as Message[]) || [];

  // Добавить сообщение от пользователя о документе
  const docMessage: Message = {
    role: "user",
    content: `Заказчик загрузил документ «${fileName}».${extractedText ? ` Содержимое:\n${extractedText}` : ""}`,
  };
  const updatedMessages: Message[] = [...messages, docMessage];
  const fileContext = buildFileContext([...((session.files as IntakeFile[]) || []), newFile]);
  const assistantText = await askClaude(updatedMessages, fileContext);
  const finalMessages: Message[] = [...updatedMessages, { role: "assistant", content: assistantText }];

  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { files, messages: finalMessages },
  });

  await sendMessage(chatId, assistantText);
}

async function handleCallback(chatId: number, messageId: number, data: string) {
  const session = await prisma.intakeSession.findFirst({
    where: { telegramChatId: String(chatId) },
    orderBy: { createdAt: "desc" },
  });

  if (!session) return;

  // Убрать кнопки
  await editMessageReplyMarkup(chatId, messageId);

  if (data === "confirm") {
    if (session.status === "COMPLETED") {
      await sendMessage(chatId, "✅ Вакансия уже была создана ранее.");
      return;
    }
    try {
      await confirmIntakeSession(session.token);
      await sendMessage(chatId, "✅ Вакансия создана! Рекрутер уже получил уведомление. Спасибо за брифинг!");
    } catch {
      await sendMessage(chatId, "❌ Произошла ошибка при создании вакансии. Обратитесь к рекрутеру.");
    }
  } else if (data === "edit") {
    await sendMessage(chatId, "Хорошо, что хотите уточнить или изменить?");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Callback query (нажатие кнопки)
    if (body.callback_query) {
      const { id, message, data, from } = body.callback_query;
      // Ответить на callback чтобы убрать loader
      await fetch(`${TG_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: id }),
      });
      if (message && data) {
        await handleCallback(message.chat.id, message.message_id, data);
      }
      return NextResponse.json({ ok: true });
    }

    // Edited message — Telegram delivers voice transcription result this way
    if (body.edited_message) {
      const em = body.edited_message;
      const voiceText = em.voice?.text ?? em.text;
      if (em.chat?.id && voiceText && em.message_id) {
        await handleVoiceTranscriptionResult(em.chat.id, em.message_id, voiceText);
      }
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const from = message.from;
    const fromName: string = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || "Заказчик";

    // /start TOKEN
    if (message.text?.startsWith("/start")) {
      const parts = message.text.split(" ");
      const token = parts[1]?.trim();
      if (token) {
        await handleStart(chatId, fromName, token);
      } else {
        await sendMessage(chatId, "Привет! Перейдите по ссылке от рекрутера, чтобы начать брифинг вакансии.");
      }
      return NextResponse.json({ ok: true });
    }

    // Голосовое
    if (message.voice) {
      const isPremium = !!from?.is_premium;
      if (!isPremium) {
        await sendMessage(chatId, "🎤 Голосовые сообщения доступны только для Telegram Premium подписчиков. Пожалуйста, напишите текстом.");
        return NextResponse.json({ ok: true });
      }

      const session = await prisma.intakeSession.findFirst({
        where: { telegramChatId: String(chatId), status: "IN_PROGRESS" },
      });
      if (!session) {
        await sendMessage(chatId, "Сначала перейдите по ссылке от рекрутера, чтобы начать брифинг.");
        return NextResponse.json({ ok: true });
      }

      // Store pending marker and kick off async transcription
      const pendingMarker: Message = { role: "user", content: `__PENDING_VOICE__:${message.message_id}` };
      const existingMessages = (session.messages as Message[]) || [];
      await prisma.intakeSession.update({
        where: { id: session.id },
        data: { messages: [...existingMessages, pendingMarker] },
      });
      await sendMessage(chatId, "🎤 Обрабатываю голосовое сообщение...");
      await requestTranscription(chatId, message.message_id);
      return NextResponse.json({ ok: true });
    }

    // Документ
    if (message.document) {
      const doc = message.document;
      const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      if (!allowed.includes(doc.mime_type)) {
        await sendMessage(chatId, "📎 Поддерживаются только файлы PDF, DOCX и TXT.");
      } else {
        await handleDocument(chatId, doc.file_id, doc.file_name || "document", doc.mime_type);
      }
      return NextResponse.json({ ok: true });
    }

    // Обычный текст
    if (message.text) {
      await handleText(chatId, message.text);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true }); // всегда 200 для Telegram
  }
}
