// Shared HTML email builders — white background, brand green design system
// All HTML is table-based for email client compatibility.

const SITE = "https://www.untilfire.com";

// Logo: icon squircle + wordmark text (better at small email sizes than the SVG wordmark)
const LOGO = `
  <table cellpadding="0" cellspacing="0" style="margin:0 auto">
    <tr>
      <td style="vertical-align:middle;padding-right:10px">
        <img src="${SITE}/logo/horizon-color.svg" alt="" width="36" height="36" style="display:block;border-radius:8px;border:0" />
      </td>
      <td style="vertical-align:middle">
        <span style="font-size:20px;font-weight:900;color:#059669;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Until</span><span style="font-size:20px;font-weight:900;color:#003527;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Fire</span>
      </td>
    </tr>
  </table>`;

function base(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F0F4F1;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0F4F1;padding:32px 16px 48px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px">

        <!-- Logo header -->
        <tr><td style="padding:0 0 28px;text-align:center">${LOGO}</td></tr>

        ${body}

        <!-- Footer -->
        <tr><td style="padding:32px 0 0;text-align:center;border-top:1px solid #D1FAE5">
          <p style="margin:0 0 6px;font-size:12px;color:#6B7280;line-height:1.6">
            UntilFire &mdash; Personal finance that sets you free.
          </p>
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6">
            Based on 4% safe withdrawal rate and 10% nominal return. Past returns do not guarantee future results.<br>
            <a href="${SITE}" style="color:#9CA3AF;text-decoration:none">${SITE.replace("https://", "")}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared section blocks ────────────────────────────────────────────────────

function heroCard(eyebrow: string, headline: string, subtext: string): string {
  return `
  <tr><td style="background:linear-gradient(155deg,#059669 0%,#003527 100%);border-radius:20px;padding:40px 36px 36px">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#22D3A5">${eyebrow}</p>
    <h1 style="margin:0 0 14px;font-size:38px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${headline}</h1>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.72);line-height:1.7">${subtext}</p>
  </td></tr>`;
}

function sectionCard(content: string): string {
  return `
  <tr><td style="padding:16px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;padding:28px 28px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <tr><td>${content}</td></tr>
    </table>
  </td></tr>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 20px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1.5px">${text}</p>`;
}

function numberedStep(n: number, title: string, desc: string, last = false): string {
  return `
  <tr>
    <td style="vertical-align:top;padding-bottom:${last ? "0" : "20px"};width:36px">
      <div style="width:28px;height:28px;border-radius:50%;background:#D1FAE5;color:#059669;font-size:13px;font-weight:800;text-align:center;line-height:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${n}</div>
    </td>
    <td style="vertical-align:top;padding-left:14px;padding-bottom:${last ? "0" : "20px"}">
      <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#003527;line-height:1.4">${title}</p>
      <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.55">${desc}</p>
    </td>
  </tr>`;
}

function ctaBlock(href: string, label: string, note?: string): string {
  return `
  <tr><td style="padding:20px 0 0;text-align:center">
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
      <tr>
        <td style="border-radius:12px;background:#059669">
          <a href="${href}" style="display:inline-block;padding:15px 40px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${label} &rarr;</a>
        </td>
      </tr>
    </table>
    ${note ? `<p style="margin:10px 0 0;font-size:12px;color:#9CA3AF">${note}</p>` : ""}
  </td></tr>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export function buildWelcomeEmail(): string {
  const hero = heroCard(
    "You&#39;re in",
    "Your journey to financial freedom starts now.",
    "You&#39;ve done what most people never do &#8212; you mapped out a real path. The next step is to connect it to your actual money so your plan reflects reality, not estimates."
  );

  const steps = sectionCard(`
    ${sectionLabel("3 moves to make your plan real")}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${numberedStep(1, "Connect your bank accounts", "See exactly where your money goes each month. Most people find spending they can redirect toward their plan on the first look.")}
      ${numberedStep(2, "Review your spending breakdown", "UntilFire separates needs from wants automatically. Knowing the split is the clearest signal for what to change.")}
      ${numberedStep(3, "Watch your freedom date move", "Every dollar redirected toward savings updates your timeline. Make it visible and it becomes a habit.", true)}
    </table>
  `);

  const cta = ctaBlock(
    `${SITE}/dashboard?source=welcome-email`,
    "Open your dashboard",
    "Free to start &mdash; no credit card required"
  );

  return base(
    "Your plan is saved. Here are 3 moves to make it real.",
    hero + steps + cta
  );
}

// ─── Retention email (day 7) ──────────────────────────────────────────────────

export function buildRetentionEmail(): string {
  const hero = heroCard(
    "Your plan is still here",
    "Real numbers make your plan real.",
    "A plan built on estimates gives you a rough target. A plan built on your actual spending shows you exactly what to change &#8212; and by how much."
  );

  const why = sectionCard(`
    ${sectionLabel("Why it matters")}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${numberedStep(1, "Your savings rate is the biggest lever", "Raising it by 5% can move your freedom date forward by 2&#8211;4 years. You can&#39;t see it clearly without real spending data.")}
      ${numberedStep(2, "Connect once, track automatically", "Link a bank account or card and UntilFire categorises your spending automatically. No spreadsheets, no manual entry.")}
      ${numberedStep(3, "Your plan updates every month", "Once connected, your freedom date reflects your real trajectory &#8212; not a guess. Check in monthly and watch it get sharper.", true)}
    </table>
  `);

  const cta = ctaBlock(
    `${SITE}/dashboard?source=retention-email`,
    "Continue your plan"
  );

  return base(
    "Your plan needs real numbers to work. Here&#39;s how to finish it.",
    hero + why + cta
  );
}
