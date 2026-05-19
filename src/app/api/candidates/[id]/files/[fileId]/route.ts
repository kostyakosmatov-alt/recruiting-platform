import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer, BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: candidateId, fileId } = await params;

  const file = await prisma.candidateFile.findUnique({ where: { id: fileId } });
  if (!file || file.candidateId !== candidateId) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  // extract storage path from public URL
  const url = new URL(file.fileUrl);
  const storagePath = url.pathname.replace(
    `/storage/v1/object/public/${BUCKET}/`,
    ""
  );

  const supabase = getSupabaseServer();
  await supabase.storage.from(BUCKET).remove([storagePath]);

  await prisma.candidateFile.delete({ where: { id: fileId } });

  return NextResponse.json({ ok: true });
}
