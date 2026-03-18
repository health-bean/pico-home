import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { createClient } from "@/lib/supabase/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { z } from "zod";

const BUCKET = "documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const documentTypeValues = [
  "warranty",
  "manual",
  "receipt",
  "inspection_report",
  "insurance",
  "permit",
  "photo",
  "other",
] as const;

/**
 * GET /api/documents?homeId=...
 * List documents for a home.
 */
export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId");

  if (!homeId) {
    return NextResponse.json(
      { error: "homeId is required" },
      { status: 400 }
    );
  }

  const home = await getUserHome(user.id, homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.homeId, homeId));

  return NextResponse.json({ documents: docs });
});

/**
 * POST /api/documents
 * Upload a document file to Supabase Storage and create a DB record.
 * Expects multipart/form-data with: file, homeId, name, type, notes (optional), applianceId (optional)
 */
export const POST = apiHandler(async ({ user, request }) => {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const homeId = formData.get("homeId") as string | null;
  const name = formData.get("name") as string | null;
  const docType = formData.get("type") as string | null;
  const notes = (formData.get("notes") as string) || null;
  const applianceId = (formData.get("applianceId") as string) || null;

  // Validate required fields
  if (!file || !homeId || !name) {
    return NextResponse.json(
      { error: "file, homeId, and name are required" },
      { status: 400 }
    );
  }

  // Validate document type
  const typeResult = z.enum(documentTypeValues).safeParse(docType);
  if (!typeResult.success) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${documentTypeValues.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Authorize: user must be member of the home
  const home = await getUserHome(user.id, homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  // Upload to Supabase Storage
  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `${homeId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Create DB record
  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      homeId,
      applianceId,
      name,
      type: typeResult.data,
      fileUrl: urlData.publicUrl,
      fileSizeBytes: file.size,
      mimeType: file.type,
      notes,
    })
    .returning();

  return NextResponse.json({ document: doc }, { status: 201 });
});

/**
 * DELETE /api/documents?id=...
 * Delete a document (DB record + storage file).
 */
export const DELETE = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("id");

  if (!docId) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  // Fetch the document
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId));

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Authorize: must be member of the home
  if (doc.homeId) {
    const home = await getUserHome(user.id, doc.homeId);
    if (!home) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  } else if (doc.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete from storage
  const supabase = await createClient();
  const urlParts = doc.fileUrl.split(`/${BUCKET}/`);
  if (urlParts[1]) {
    await supabase.storage.from(BUCKET).remove([urlParts[1]]);
  }

  // Delete DB record
  await db.delete(documents).where(eq(documents.id, docId));

  return NextResponse.json({ success: true });
});
