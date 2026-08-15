/**
 * Transactional email via Resend (recommended for Vercel).
 * From: info@compessential.com (must be a verified domain in Resend).
 *
 * Env:
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM=info@compessential.com   (optional override)
 *   EMAIL_FROM_NAME=MWD Pro             (optional)
 */

const getEnv = (key: string, fallback = ""): string => {
  let val = process.env[key] || fallback;
  if (!val) return "";
  val = val.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return val;
};

export type EmailResult = {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(getEnv("RESEND_API_KEY"));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}

function displayName(name?: string | null, fallback = "there"): { raw: string; html: string } {
  const raw = (name || "").trim() || fallback;
  return { raw, html: escapeHtml(raw) };
}

function fromAddress(): string {
  const email = getEnv("EMAIL_FROM", "info@compessential.com");
  const name = getEnv("EMAIL_FROM_NAME", "MWD Pro");
  return `${name} <${email}>`;
}

function appBaseUrl(): string {
  return (
    getEnv("APP_URL") ||
    getEnv("VITE_APP_URL") ||
    "https://compessential.com"
  ).replace(/\/$/, "");
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  const apiKey = getEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email skipped:", params.subject);
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: getEnv("EMAIL_FROM", "info@compessential.com"),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      const err =
        data.message || data.name || `Resend HTTP ${res.status}`;
      console.error("[email] Resend error:", err, data);
      return { ok: false, error: err };
    }

    console.log("[email] sent:", params.subject, "→", params.to, data.id);
    return { ok: true, id: data.id };
  } catch (e: any) {
    console.error("[email] send failed:", e?.message || e);
    return { ok: false, error: e?.message || "send failed" };
  }
}

function baseLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="display:inline-block;background:#10b981;color:#052e1c;font-weight:700;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;padding:6px 10px;border-radius:8px;">MWD Pro</div>
          <h1 style="margin:20px 0 8px;font-size:22px;line-height:1.25;color:#fafafa;font-weight:600;">${title}</h1>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-size:15px;line-height:1.6;color:#a1a1aa;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#71717a;">
          Comp Essential · <a href="${appBaseUrl()}" style="color:#34d399;text-decoration:none;">compessential.com</a><br/>
          Questions? Reply to this email or write <a href="mailto:info@compessential.com" style="color:#34d399;text-decoration:none;">info@compessential.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<EmailResult> {
  const name = displayName(opts.name, "there");
  const url = appBaseUrl();
  const subject = "Welcome to MWD Pro — your training starts here";
  const text = `Hi ${name.raw},

Welcome to MWD Pro by Comp Essential.

You now have access to free modules that cover core Measurement While Drilling fundamentals. Complete quizzes, practice with interactive simulators, and unlock the full 15-module certification path when you're ready.

Open the app: ${url}

— The MWD Pro team
info@compessential.com`;

  const html = baseLayout(
    `Welcome, ${name.html}`,
    `<p>You're in. MWD Pro is built for field techs who want clear, practical Measurement While Drilling training—not dense manuals.</p>
     <p style="margin:20px 0 8px;color:#fafafa;font-weight:600;">What you can do right now</p>
     <ul style="padding-left:18px;margin:0 0 20px;">
       <li>Start free foundational modules</li>
       <li>Run interactive toolface, mud pulse, and survey sims</li>
       <li>Track quiz scores toward certification</li>
     </ul>
     <p style="margin:24px 0;">
       <a href="${url}" style="display:inline-block;background:#10b981;color:#052e1c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px;">
         Continue training
       </a>
     </p>
     <p style="margin:0;font-size:13px;">If you didn't create this account, you can ignore this message.</p>`
  );

  return sendViaResend({ to: opts.to, subject, html, text });
}

export async function sendPurchaseEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<EmailResult> {
  const name = displayName(opts.name, "there");
  const url = appBaseUrl();
  const subject = "You're unlocked — full MWD Pro access";
  const text = `Hi ${name.raw},

Your MWD Pro full-access purchase is confirmed.

You now have lifetime access to all 15 modules, interactive simulators, and the professional certification path.

Open the app: ${url}

Thank you for training with Comp Essential.
info@compessential.com`;

  const html = baseLayout(
    "Full access unlocked",
    `<p>Hi ${name.html}, your payment went through. You now have <strong style="color:#fafafa;">lifetime access</strong> to the complete MWD Pro curriculum.</p>
     <p style="margin:20px 0 8px;color:#fafafa;font-weight:600;">Included</p>
     <ul style="padding-left:18px;margin:0 0 20px;">
       <li>All 15 training modules</li>
       <li>Interactive simulators &amp; labs</li>
       <li>Quizzes and professional certification track</li>
     </ul>
     <p style="margin:24px 0;">
       <a href="${url}" style="display:inline-block;background:#10b981;color:#052e1c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px;">
         Open MWD Pro
       </a>
     </p>
     <p style="margin:0;font-size:13px;">Need a receipt or help? Reply to this email anytime.</p>`
  );

  return sendViaResend({ to: opts.to, subject, html, text });
}

export async function sendCertificateEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<EmailResult> {
  const name = displayName(opts.name, "Trainee");
  const url = appBaseUrl();
  const subject = "Certificate earned — MWD Professional";
  const text = `Congratulations ${name.raw},

You completed the MWD Pro certification path. Open your profile in the app to view your certificate.

${url}

— Comp Essential / MWD Pro
info@compessential.com`;

  const html = baseLayout(
    "Certificate earned",
    `<p>Congratulations, <strong style="color:#fafafa;">${name.html}</strong>.</p>
     <p>You demonstrated mastery across the MWD Pro curriculum. Open the app to view and share your certificate.</p>
     <p style="margin:24px 0;">
       <a href="${url}" style="display:inline-block;background:#10b981;color:#052e1c;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:10px;">
         View certificate
       </a>
     </p>`
  );

  return sendViaResend({ to: opts.to, subject, html, text });
}
