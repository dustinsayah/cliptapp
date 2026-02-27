/**
 * Clipt Email Service — powered by Resend
 *
 * Set up:
 *   1. Create a free account at https://resend.com
 *   2. Get your API key from resend.com/api-keys
 *   3. Add RESEND_API_KEY=re_... to .env.local (and Vercel environment variables)
 *   4. Verify your sending domain in Resend → Domains
 *
 * Until a domain is verified, Resend sends from onboarding@resend.dev (test only).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = "Clipt <noreply@cliptapp.com>";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://cliptapp.com";

function buildCompleteEmail(firstName: string, jerseyNumber: number, clipCount: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Clipt highlight reel is ready</title>
</head>
<body style="margin:0;padding:0;background:#050A14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050A14;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header / Logo -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <span style="font-size:28px;font-weight:900;letter-spacing:0.1em;color:#00A3FF;">CLIPT</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#0A1628;border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:48px 40px;">

            <!-- Top accent stripe -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:28px;">
                  <div style="width:48px;height:4px;background:linear-gradient(90deg,#0055EE,#00A3FF);border-radius:2px;"></div>
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">
              Your highlights are ready, ${firstName}!
            </h1>
            <p style="margin:0 0 28px;font-size:16px;color:#94a3b8;line-height:1.6;">
              Our AI scanned your game film and found <strong style="color:#ffffff;">${clipCount} highlight clip${clipCount !== 1 ? "s" : ""}</strong>
              featuring jersey <strong style="color:#00A3FF;">#${jerseyNumber}</strong> — sorted by quality score.
            </p>

            <!-- Stats row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
              <tr>
                <td width="50%" style="padding-right:8px;">
                  <div style="background:rgba(0,163,255,0.08);border:1px solid rgba(0,163,255,0.2);border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:32px;font-weight:900;color:#00A3FF;">${clipCount}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Clips Found</div>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;">
                  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:32px;font-weight:900;color:#ffffff;">#${jerseyNumber}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Jersey Number</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/customize"
                     style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0055EE,#00A3FF);color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:0.02em;box-shadow:0 0 32px rgba(0,120,255,0.4);">
                    View Your Clips →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Sub-text -->
            <p style="margin:0 0 0;font-size:13px;color:#475569;text-align:center;line-height:1.6;">
              Your clips are loaded and ready to build into a highlight reel.<br />
              Customize music, colors, and stats — then download your MP4 in minutes.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334155;line-height:1.8;">
              CLIPT · AI-Powered Recruiting Highlight Reels<br />
              You received this because you submitted a video for AI processing.<br />
              <a href="${APP_URL}" style="color:#475569;text-decoration:underline;">cliptapp.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildFailedEmail(firstName: string, jerseyNumber: number, errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Processing issue with your Clipt reel</title>
</head>
<body style="margin:0;padding:0;background:#050A14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050A14;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <span style="font-size:28px;font-weight:900;letter-spacing:0.1em;color:#00A3FF;">CLIPT</span>
          </td>
        </tr>
        <tr>
          <td style="background:#0A1628;border-radius:20px;border:1px solid rgba(239,68,68,0.2);padding:48px 40px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;">
              We hit a snag, ${firstName}
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;line-height:1.6;">
              Something went wrong while processing your game film for jersey <strong style="color:#00A3FF;">#${jerseyNumber}</strong>.
            </p>
            <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;margin-bottom:28px;">
              <p style="margin:0;font-size:13px;color:#94a3b8;font-family:monospace;">${errorMessage}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/process"
                     style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0055EE,#00A3FF);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:800;">
                    Try Again →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-size:13px;color:#475569;text-align:center;">
              Or <a href="${APP_URL}/upload" style="color:#00A3FF;">upload your clips manually</a> to build your reel right away.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334155;">
              CLIPT · AI-Powered Recruiting Highlight Reels<br />
              <a href="${APP_URL}" style="color:#475569;">cliptapp.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendProcessingCompleteEmail(
  email: string,
  firstName: string,
  jerseyNumber: number,
  clipCount: number
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[emailService] RESEND_API_KEY not set — skipping email to", email);
    console.warn("[emailService] Get your key at https://resend.com/api-keys and add RESEND_API_KEY=re_... to .env.local");
    return;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `Your Clipt highlight reel is ready 🎬`,
      html: buildCompleteEmail(firstName, jerseyNumber, clipCount),
    });
    if (error) {
      console.error("[emailService] Resend error (complete):", error);
    } else {
      console.log(`[emailService] Sent complete email to ${email} — ${clipCount} clips, #${jerseyNumber}`);
    }
  } catch (err) {
    console.error("[emailService] Unexpected error sending complete email:", err);
  }
}

export async function sendProcessingFailedEmail(
  email: string,
  firstName: string,
  jerseyNumber: number,
  errorMessage: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[emailService] RESEND_API_KEY not set — skipping failure email to", email);
    return;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `Issue processing your Clipt highlight reel`,
      html: buildFailedEmail(firstName, jerseyNumber, errorMessage),
    });
    if (error) {
      console.error("[emailService] Resend error (failed):", error);
    } else {
      console.log(`[emailService] Sent failure email to ${email}`);
    }
  } catch (err) {
    console.error("[emailService] Unexpected error sending failure email:", err);
  }
}
