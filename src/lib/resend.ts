import { Resend } from "resend";

let resendSingleton: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendSingleton) {
    resendSingleton = new Resend(apiKey);
  }

  return resendSingleton;
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL || "WasGehtTüb <onboarding@resend.dev>";
}

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(payload: MailPayload) {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false as const, error: "RESEND_API_KEY fehlt." };
  }

  const result = await resend.emails.send({
    from: getFromAddress(),
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (result.error) {
    return { ok: false as const, error: result.error.message || "Mailversand fehlgeschlagen." };
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export async function sendWelcomeMail(email: string, displayName: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const safeName = displayName.trim().length > 0 ? displayName.trim() : email.split("@")[0];

  return sendMail({
    to: email,
    subject: "Willkommen bei WasGehtTüb 🎉",
    text: `Hi ${safeName}, willkommen bei WasGehtTüb. Dein Account wurde erstellt. Starte hier: ${appUrl}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h1 style="margin:0 0 12px;color:#111827;font-size:24px;">Willkommen bei WasGehtTüb 🎉</h1>
        <p style="margin:0 0 16px;color:#374151;line-height:1.6;">Hi ${safeName}, dein Account wurde erfolgreich erstellt. Viel Spaß beim Entdecken der nächsten WG-Partys in Tübingen.</p>
        <a href="${appUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Jetzt starten</a>
      </div>
    `,
  });
}
