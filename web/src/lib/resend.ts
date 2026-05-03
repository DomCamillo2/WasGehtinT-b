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

function getTemplateAlias(name: "welcome" | "password-reset" | "email-confirmation") {
  if (name === "welcome") {
    return process.env.RESEND_TEMPLATE_WELCOME || "wasgehttueb-welcome";
  }
  if (name === "password-reset") {
    return process.env.RESEND_TEMPLATE_PASSWORD_RESET || "wasgehttueb-password-reset";
  }
  return process.env.RESEND_TEMPLATE_EMAIL_CONFIRMATION || "wasgehttueb-email-confirmation";
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

type TemplateMailPayload = {
  to: string;
  templateIdOrAlias: string;
  variables: Record<string, string | number>;
  subject?: string;
};

async function sendTemplateMail(payload: TemplateMailPayload) {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false as const, error: "RESEND_API_KEY fehlt." };
  }

  const result = await resend.emails.send({
    from: getFromAddress(),
    to: payload.to,
    subject: payload.subject,
    template: {
      id: payload.templateIdOrAlias,
      variables: payload.variables,
    },
  });

  if (result.error) {
    return { ok: false as const, error: result.error.message || "Template-Mailversand fehlgeschlagen." };
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export async function sendWelcomeMail(email: string, displayName: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const safeName = displayName.trim().length > 0 ? displayName.trim() : email.split("@")[0];

  const templateResult = await sendTemplateMail({
    to: email,
    templateIdOrAlias: getTemplateAlias("welcome"),
    variables: {
      NAME: safeName,
      APP_URL: appUrl,
    },
    subject: "Willkommen bei WasGehtTüb 🎉",
  });

  if (templateResult.ok) {
    return templateResult;
  }

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

export async function sendPasswordResetMail(email: string, resetUrl: string, displayName = "") {
  const safeName = displayName.trim().length > 0 ? displayName.trim() : email.split("@")[0];

  const templateResult = await sendTemplateMail({
    to: email,
    templateIdOrAlias: getTemplateAlias("password-reset"),
    variables: {
      NAME: safeName,
      RESET_URL: resetUrl,
    },
    subject: "Passwort zurücksetzen · WasGehtTüb",
  });

  if (templateResult.ok) {
    return templateResult;
  }

  return sendMail({
    to: email,
    subject: "Passwort zurücksetzen · WasGehtTüb",
    text: `Hi ${safeName}, setze hier dein Passwort zurück: ${resetUrl}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h1 style="margin:0 0 12px;color:#111827;font-size:24px;">Passwort zurücksetzen</h1>
        <p style="margin:0 0 16px;color:#374151;line-height:1.6;">Hi ${safeName}, klicke auf den Button, um ein neues Passwort zu setzen.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Neues Passwort setzen</a>
      </div>
    `,
  });
}

export async function sendEmailConfirmationMail(
  email: string,
  confirmationUrl: string,
  displayName = "",
) {
  const safeName = displayName.trim().length > 0 ? displayName.trim() : email.split("@")[0];

  const templateResult = await sendTemplateMail({
    to: email,
    templateIdOrAlias: getTemplateAlias("email-confirmation"),
    variables: {
      NAME: safeName,
      CONFIRMATION_URL: confirmationUrl,
    },
    subject: "Bestätige deine E-Mail · WasGehtTüb",
  });

  if (templateResult.ok) {
    return templateResult;
  }

  return sendMail({
    to: email,
    subject: "Bestätige deine E-Mail · WasGehtTüb",
    text: `Hi ${safeName}, bestätige hier deine E-Mail: ${confirmationUrl}`,
    html: `
      <div style="font-family:sans-serif;background-color:#f9fafb;padding:40px;text-align:center;">
        <div style="max-width:450px;margin:auto;background:white;padding:30px;border-radius:24px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">
          <h1 style="color:#6366f1;font-size:24px;margin-bottom:10px;">WasGehtTüb? 🪩</h1>
          <p style="color:#4b5563;font-size:16px;line-height:1.5;">
            Willkommen in Tübingen! Bestätige kurz deine E-Mail, um die Map und alle WG-Partys freizuschalten.
          </p>
          <a href="${confirmationUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;border-radius:14px;text-decoration:none;font-weight:bold;margin-top:20px;">
            Jetzt verifizieren
          </a>
          <p style="font-size:12px;color:#9ca3af;margin-top:30px;">
            Nur für Studierende der Uni Tübingen.
          </p>
        </div>
      </div>
    `,
  });
}
