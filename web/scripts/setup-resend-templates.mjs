import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadEnv() {
  const cwd = process.cwd();
  const envFiles = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env.production.local"),
  ];

  const loaded = {};
  for (const envFile of envFiles) {
    Object.assign(loaded, readEnvFile(envFile));
  }

  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY || loaded.RESEND_API_KEY,
    RESEND_FROM_EMAIL:
      process.env.RESEND_FROM_EMAIL ||
      loaded.RESEND_FROM_EMAIL ||
      "WasGehtTüb <onboarding@resend.dev>",
    APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      loaded.NEXT_PUBLIC_APP_URL ||
      "https://was-gehtin-t-b.vercel.app",
  };
}

function getTemplates(from, appUrl) {
  return [
    {
      alias: "wasgehttueb-welcome",
      name: "WasGehtTüb Welcome",
      from,
      subject: "Willkommen bei WasGehtTüb 🎉",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fafafa;padding:24px;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #f0f0f0;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;color:#6366f1;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">WasGehtTüb</p>
            <h1 style="margin:0 0 12px;color:#111827;font-size:24px;letter-spacing:-0.01em;">Willkommen, {{{NAME}}}! 🎉</h1>
            <p style="margin:0 0 18px;color:#374151;line-height:1.6;">Dein Account wurde erfolgreich erstellt. Entdecke jetzt die nächsten WG-Partys in Tübingen.</p>
            <a href="{{{APP_URL}}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Jetzt starten</a>
          </div>
        </div>
      `,
      text: "Hi {{{NAME}}}, willkommen bei WasGehtTüb. Starte hier: {{{APP_URL}}}",
      variables: [
        { key: "NAME", type: "string", fallbackValue: "Studierende:r" },
        { key: "APP_URL", type: "string", fallbackValue: appUrl },
      ],
    },
    {
      alias: "wasgehttueb-password-reset",
      name: "WasGehtTüb Password Reset",
      from,
      subject: "Passwort zurücksetzen · WasGehtTüb",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fafafa;padding:24px;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #f0f0f0;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;color:#6366f1;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">WasGehtTüb</p>
            <h1 style="margin:0 0 12px;color:#111827;font-size:24px;letter-spacing:-0.01em;">Passwort zurücksetzen</h1>
            <p style="margin:0 0 18px;color:#374151;line-height:1.6;">Hi {{{NAME}}}, klicke auf den Button, um ein neues Passwort zu setzen.</p>
            <a href="{{{RESET_URL}}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Neues Passwort setzen</a>
          </div>
        </div>
      `,
      text: "Hi {{{NAME}}}, setze hier dein Passwort zurück: {{{RESET_URL}}}",
      variables: [
        { key: "NAME", type: "string", fallbackValue: "Studierende:r" },
        { key: "RESET_URL", type: "string", fallbackValue: `${appUrl}/reset-password` },
      ],
    },
    {
      alias: "wasgehttueb-email-confirmation",
      name: "WasGehtTüb Email Confirmation",
      from,
      subject: "Bestätige deinen Zugang · WasGehtTüb",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fafafa;padding:24px;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #f0f0f0;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;color:#6366f1;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">WasGehtTüb</p>
            <h1 style="margin:0 0 12px;color:#111827;font-size:24px;letter-spacing:-0.01em;">Bestätige deinen Zugang</h1>
            <p style="margin:0 0 18px;color:#374151;line-height:1.6;">Hi {{{NAME}}}, bestätige deine Uni-Mail, um den Party-Radar freizuschalten.</p>
            <a href="{{{CONFIRMATION_URL}}}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">E-Mail bestätigen</a>
          </div>
        </div>
      `,
      text: "Hi {{{NAME}}}, bestätige deine E-Mail hier: {{{CONFIRMATION_URL}}}",
      variables: [
        { key: "NAME", type: "string", fallbackValue: "Studierende:r" },
        { key: "CONFIRMATION_URL", type: "string", fallbackValue: appUrl },
      ],
    },
  ];
}

async function upsertTemplate(resend, payload) {
  const listResult = await resend.templates.list({ limit: 100 });
  if (listResult.error) {
    throw new Error(`Template-Liste konnte nicht geladen werden: ${listResult.error.message}`);
  }

  const existing = (listResult.data?.data || []).find((item) => item.alias === payload.alias);

  if (existing) {
    const updateResult = await resend.templates.update(existing.id, payload);
    if (updateResult.error) {
      throw new Error(`Template '${payload.alias}' konnte nicht aktualisiert werden: ${updateResult.error.message}`);
    }

    const publishResult = await resend.templates.publish(existing.id);
    if (publishResult.error) {
      throw new Error(`Template '${payload.alias}' konnte nicht veröffentlicht werden: ${publishResult.error.message}`);
    }

    return { alias: payload.alias, id: existing.id, action: "updated" };
  }

  const createResult = await resend.templates.create(payload);
  if (createResult.error || !createResult.data?.id) {
    throw new Error(`Template '${payload.alias}' konnte nicht erstellt werden: ${createResult.error?.message || "unbekannter Fehler"}`);
  }

  const publishResult = await resend.templates.publish(createResult.data.id);
  if (publishResult.error) {
    throw new Error(`Template '${payload.alias}' konnte nicht veröffentlicht werden: ${publishResult.error.message}`);
  }

  return { alias: payload.alias, id: createResult.data.id, action: "created" };
}

async function main() {
  const env = loadEnv();

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY fehlt (weder in process.env noch in .env.local/.env.production.local). ");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const templates = getTemplates(env.RESEND_FROM_EMAIL, env.APP_URL);

  const results = [];
  for (const template of templates) {
    const result = await upsertTemplate(resend, template);
    results.push(result);
  }

  console.log("Resend Templates bereit:");
  for (const result of results) {
    console.log(`- ${result.alias} (${result.action}) -> ${result.id}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
