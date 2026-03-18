import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { createClient } from "@/lib/supabase/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { z } from "zod";
import { fileTypeFromBuffer } from "file-type";

const BUCKET = "documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

// Map validated MIME types to safe file extensions
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
};

// Text-based formats that file-type can't detect via magic bytes
const TEXT_BASED_MIMES = new Set(["text/csv"]);

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

const uuidSchema = z.string().uuid();
const nameSchema = z.string().min(1).max(255);
const notesSchema = z.string().max(2000).optional();

/**
 * GET /api/documents?homeId=...
 * List documents for a home. Returns signed URLs (1 hour expiry).
 */
export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = uuidSchema.safeParse(searchParams.get("homeId"));

  if (!homeId.success) {
    return NextResponse.json(
      { error: "Valid homeId is required" },
      { status: 400 }
    );
  }

  const home = await getUserHome(user.id, homeId.data);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.homeId, home.id));

  // Generate signed URLs for each document
  const supabase = await createClient();
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.fileUrl, 3600); // 1 hour
      return { ...doc, signedUrl: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ documents: docsWithUrls });
});

/**
 * POST /api/documents
 * Upload a document file to Supabase Storage and create a DB record.
 */
export const POST = apiHandler(async ({ user, request }) => {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const homeId = formData.get("homeId") as string | null;
  const rawName = formData.get("name") as string | null;
  const docType = formData.get("type") as string | null;
  const rawNotes = (formData.get("notes") as string) || undefined;
  const applianceId = (formData.get("applianceId") as string) || null;

  // Validate required fields
  if (!file || !homeId || !rawName) {
    return NextResponse.json(
      { error: "file, homeId, and name are required" },
      { status: 400 }
    );
  }

  // Validate homeId UUID format
  if (!uuidSchema.safeParse(homeId).success) {
    return NextResponse.json({ error: "Invalid homeId" }, { status: 400 });
  }

  // Validate name length
  const nameResult = nameSchema.safeParse(rawName);
  if (!nameResult.success) {
    return NextResponse.json({ error: "Name must be 1-255 characters" }, { status: 400 });
  }

  // Validate notes length
  if (rawNotes) {
    const notesResult = notesSchema.safeParse(rawNotes);
    if (!notesResult.success) {
      return NextResponse.json({ error: "Notes must be under 2000 characters" }, { status: 400 });
    }
  }

  // Validate applianceId if provided
  if (applianceId && !uuidSchema.safeParse(applianceId).success) {
    return NextResponse.json({ error: "Invalid applianceId" }, { status: 400 });
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

  // Validate MIME type via magic bytes (not trusting client-provided type)
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  let validatedMime: string;

  if (detected) {
    // Binary file — trust magic byte detection
    if (!ALLOWED_MIMES.has(detected.mime)) {
      return NextResponse.json(
        { error: "File type not allowed based on content inspection" },
        { status: 400 }
      );
    }
    validatedMime = detected.mime;
  } else if (TEXT_BASED_MIMES.has(file.type)) {
    // Text-based files can't be detected by magic bytes — trust client type
    // but verify it's in our allowed list
    validatedMime = file.type;
  } else {
    return NextResponse.json(
      { error: "Could not verify file type" },
      { status: 400 }
    );
  }

  // Derive safe extension from validated MIME (never from user filename)
  const ext = MIME_TO_EXT[validatedMime] || "bin";

  // Authorize: user must be member of the home
  const home = await getUserHome(user.id, homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  // Upload to Supabase Storage
  const supabase = await createClient();
  const storagePath = `${home.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: validatedMime,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Store the storage path (NOT public URL) — we generate signed URLs on demand
  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      homeId: home.id,
      applianceId,
      name: nameResult.data,
      type: typeResult.data,
      fileUrl: storagePath,
      fileSizeBytes: file.size,
      mimeType: validatedMime,
      notes: rawNotes ?? null,
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
  const docId = uuidSchema.safeParse(searchParams.get("id"));

  if (!docId.success) {
    return NextResponse.json(
      { error: "Valid document id is required" },
      { status: 400 }
    );
  }

  // Fetch the document
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId.data));

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

  // Delete from storage (fileUrl now stores the path, not a full URL)
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([doc.fileUrl]);

  // Delete DB record
  await db.delete(documents).where(eq(documents.id, docId.data));

  return NextResponse.json({ success: true });
});
