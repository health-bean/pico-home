/**
 * Document upload limits, shared by the API route and the upload UI so the
 * advertised limit, client-side check and server enforcement never drift.
 *
 * Vercel caps function request bodies at 4.5 MB, so files are capped at
 * 4 MiB with headroom for the multipart envelope and text fields.
 */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_LABEL = "4 MB";
/** Whole multipart body: the file plus boundary/field overhead. */
export const MAX_DOCUMENT_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 64 * 1024;
