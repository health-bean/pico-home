const FROM_FALLBACK = "noreply@healthbean.io";

/**
 * Send a plain-text email via Resend. Returns false (never throws) when the
 * key is missing or the send fails, so callers can degrade honestly.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || FROM_FALLBACK;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Pico Home <${from}>`,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
