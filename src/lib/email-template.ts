export type OtpEmailPurpose = "signup" | "reset-password";

export function buildOtpEmailHtml({
  otp,
  purpose,
  expiresInMinutes = 10,
  recipientName,
}: {
  otp: string;
  purpose: OtpEmailPurpose;
  expiresInMinutes?: number;
  recipientName?: string;
}) {
  const title = purpose === "reset-password" ? "Reset your password" : "Verify your email";
  const heading = purpose === "reset-password" ? "Reset your password" : "Welcome to KnowledgeStream AI";
  const bodyCopy =
    purpose === "reset-password"
      ? "We received a request to reset the password for your KnowledgeStream AI account."
      : "Thanks for joining KnowledgeStream AI. Use the verification code below to continue creating your account.";

  return `
    <div style="font-family: Inter, Arial, sans-serif; background:#07111f; padding:24px; color:#f8fafc;">
      <div style="max-width:620px; margin:0 auto; background:linear-gradient(135deg, #0f172a 0%, #111827 100%); border:1px solid rgba(255,255,255,0.08); border-radius:24px; overflow:hidden; box-shadow:0 20px 60px rgba(8,15,30,0.35);">
        <div style="background:linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #06b6d4 100%); padding:24px 28px;">
          <div style="font-size:12px; letter-spacing:0.24em; text-transform:uppercase; color:rgba(248,250,252,0.8);">KnowledgeStream AI</div>
          <h1 style="margin:8px 0 0; font-size:28px; color:#ffffff;">${title}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 12px; font-size:16px; color:#e2e8f0;">Hi${recipientName ? ` ${recipientName}` : " there"},</p>
          <p style="margin:0 0 18px; font-size:15px; line-height:1.7; color:#cbd5e1;">${bodyCopy}</p>
          <div style="margin:24px 0; padding:20px 24px; border:1px solid rgba(34,211,238,0.25); border-radius:18px; background:rgba(6,182,212,0.12); text-align:center;">
            <div style="font-size:12px; letter-spacing:0.22em; text-transform:uppercase; color:#7dd3fc; margin-bottom:10px;">Your verification code</div>
            <div style="font-size:34px; font-weight:700; letter-spacing:0.35em; color:#ffffff;">${otp}</div>
          </div>
          <p style="margin:0 0 10px; font-size:14px; color:#94a3b8;">This code expires in ${expiresInMinutes} minutes for your security.</p>
          <p style="margin:0 0 6px; font-size:13px; color:#64748b;">Please do not share this code with anyone.</p>
        </div>
        <div style="padding:0 28px 28px; color:#64748b; font-size:12px; line-height:1.6;">
          <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
            <strong style="color:#94a3b8;">KnowledgeStream AI</strong><br />
            Secure learning, simplified.
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildOtpEmailText({
  otp,
  purpose,
  expiresInMinutes = 10,
}: {
  otp: string;
  purpose: OtpEmailPurpose;
  expiresInMinutes?: number;
}) {
  const title = purpose === "reset-password" ? "Reset your password" : "Verify your email";
  return `${title}\n\nUse the following verification code to continue: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes. Please do not share it with anyone.\n\nKnowledgeStream AI`;
}

export function getEmailDiagnostics() {
  const smtpHost = (process.env.SMTP_HOST || "mail.knowledgestreamai.com").trim().replace(/^["']|["']$/g, "");
  const smtpPortRaw = (process.env.SMTP_PORT || "").trim().replace(/^["']|["']$/g, "");
  const smtpPort = smtpPortRaw ? parseInt(smtpPortRaw, 10) : 465;
  const smtpSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" : smtpPort === 465;
  const smtpUser = (process.env.SMTP_USER || process.env.SMTP_USERNAME || "").trim().replace(/^["']|["']$/g, "");
  const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim().replace(/^["']|["']$/g, "");
  const smtpFrom = (process.env.SMTP_FROM || process.env.EMAIL_FROM || "").trim().replace(/^["']|["']$/g, "");

  const resendApiKey = (process.env.RESEND_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const resendFrom = (process.env.RESEND_FROM_EMAIL || "admin@knowledgestreamai.com").trim().replace(/^["']|["']$/g, "");

  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
  const resendConfigured = Boolean(resendApiKey);

  return {
    smtp: {
      configured: smtpConfigured,
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      userConfigured: Boolean(smtpUser),
      user: smtpUser ? (smtpUser.includes("@") ? smtpUser : `${smtpUser.slice(0, 3)}***`) : null,
      hasPassword: Boolean(smtpPass),
      passwordLength: smtpPass ? smtpPass.length : 0,
      from: smtpFrom || (smtpUser ? `KnowledgeStream AI <${smtpUser}>` : "KnowledgeStream AI <naveen@knowledgestreamai.com>"),
    },
    resend: {
      configured: resendConfigured,
      hasApiKey: resendConfigured,
      keyPrefix: resendApiKey ? `${resendApiKey.slice(0, 6)}...` : null,
      from: resendFrom,
    },
    activeProvider: smtpConfigured
      ? "SMTP (MilesWeb)"
      : resendConfigured
      ? "Resend API"
      : "NONE (Unconfigured)",
  };
}

export interface SendOtpEmailResult {
  ok: boolean;
  reason: "sent" | "missing-provider" | "send-failed";
  provider?: "smtp" | "resend" | "resend-fallback";
  errorDetail?: string;
}

export async function sendOtpEmail({
  to,
  otp,
  purpose,
}: {
  to: string;
  otp: string;
  purpose: OtpEmailPurpose;
}): Promise<SendOtpEmailResult> {
  const diagnostics = getEmailDiagnostics();
  const subject =
    purpose === "reset-password"
      ? "Reset your password – KnowledgeStream AI"
      : "Verify your email – KnowledgeStream AI";
  const html = buildOtpEmailHtml({ otp, purpose });
  const text = buildOtpEmailText({ otp, purpose });

  // ---------------------------------------------------------------------------
  // Priority 1: MilesWeb SMTP Transport (Nodemailer)
  // ---------------------------------------------------------------------------
  if (diagnostics.smtp.configured) {
    try {
      const nodemailer = await import("nodemailer");
      const dns = await import("dns");

      const smtpConfig = diagnostics.smtp;
      const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim().replace(/^["']|["']$/g, "");
      const smtpUser = (process.env.SMTP_USER || process.env.SMTP_USERNAME || "").trim().replace(/^["']|["']$/g, "");

      console.log(`[EMAIL] Attempting SMTP delivery via ${smtpConfig.host}:${smtpConfig.port} (secure=${smtpConfig.secure})`);

      const createTransporter = (port: number, secure: boolean) =>
        nodemailer.createTransport({
          host: smtpConfig.host,
          port,
          secure,
          // Force IPv4 lookup to prevent Node DNS resolution timeouts on Windows/Cloud
          lookup: (hostname: string, options: any, callback?: any) => {
            const cb = typeof options === "function" ? options : callback;
            dns.lookup(hostname, { family: 4 }, cb);
          },
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            servername: smtpConfig.host,
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        } as any);

      let transporter = createTransporter(smtpConfig.port, smtpConfig.secure);

      const mailOptions = {
        from: smtpConfig.from,
        to,
        subject,
        html,
        text,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] SMTP delivery SUCCESS [id=${info.messageId}]`);
        return { ok: true, reason: "sent", provider: "smtp" };
      } catch (primaryErr: any) {
        console.warn(`[EMAIL] Primary SMTP attempt failed on port ${smtpConfig.port}:`, {
          code: primaryErr?.code,
          command: primaryErr?.command,
          response: primaryErr?.response,
          message: primaryErr?.message,
        });

        // If port 465 failed with network/TLS error, try alternative port 587 (STARTTLS)
        if (smtpConfig.port === 465) {
          console.log(`[EMAIL] Attempting alternative SMTP fallback on port 587 (STARTTLS)...`);
          try {
            const altTransporter = createTransporter(587, false);
            const altInfo = await altTransporter.sendMail(mailOptions);
            console.log(`[EMAIL] Alternative port 587 SMTP delivery SUCCESS [id=${altInfo.messageId}]`);
            return { ok: true, reason: "sent", provider: "smtp" };
          } catch (altErr: any) {
            console.error(`[EMAIL] Port 587 SMTP attempt also failed:`, {
              code: altErr?.code,
              command: altErr?.command,
              response: altErr?.response,
              message: altErr?.message,
            });
          }
        }

        // If Resend API is configured as backup, attempt fallback
        if (diagnostics.resend.configured) {
          console.log(`[EMAIL] SMTP failed. Falling back to Resend API...`);
          const resendResult = await sendViaResend({
            to,
            subject,
            html,
            text,
            apiKey: (process.env.RESEND_API_KEY || "").trim().replace(/^["']|["']$/g, ""),
            from: diagnostics.resend.from,
          });

          if (resendResult.ok) {
            console.log(`[EMAIL] Resend fallback delivery SUCCESS`);
            return { ok: true, reason: "sent", provider: "resend-fallback" };
          }
        }

        return {
          ok: false,
          reason: "send-failed",
          errorDetail: primaryErr?.message || "SMTP delivery failure",
        };
      }
    } catch (err: any) {
      console.error("[EMAIL] Critical error during SMTP transport execution:", err?.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 2: Resend API Transport (Direct when SMTP not configured)
  // ---------------------------------------------------------------------------
  if (diagnostics.resend.configured) {
    const apiKey = (process.env.RESEND_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    const resendResult = await sendViaResend({
      to,
      subject,
      html,
      text,
      apiKey,
      from: diagnostics.resend.from,
    });

    if (resendResult.ok) {
      return { ok: true, reason: "sent", provider: "resend" };
    }

    return {
      ok: false,
      reason: "send-failed",
      errorDetail: resendResult.errorDetail,
    };
  }

  // ---------------------------------------------------------------------------
  // Unconfigured state
  // ---------------------------------------------------------------------------
  console.warn(`[EMAIL] Neither MilesWeb SMTP nor Resend is configured. Configure SMTP_USER and SMTP_PASS or RESEND_API_KEY.`);
  return { ok: false, reason: "missing-provider" };
}

async function sendViaResend({
  to,
  subject,
  html,
  text,
  apiKey,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
  from: string;
}): Promise<{ ok: boolean; errorDetail?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EMAIL] Resend API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return { ok: false, errorDetail: `Resend HTTP ${response.status}: ${errorText}` };
    }

    return { ok: true };
  } catch (fetchErr: any) {
    console.error("[EMAIL] Resend network fetch exception:", fetchErr?.message);
    return { ok: false, errorDetail: fetchErr?.message || "Resend connection error" };
  }
}
