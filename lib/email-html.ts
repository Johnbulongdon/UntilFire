// Shared HTML email builders — white background, brand green design system
// All HTML is table-based for email client compatibility.

const SITE = "https://www.untilfire.com";
const TWITTER_URL = "https://twitter.com/untilfire";
const LINKEDIN_URL = "https://www.linkedin.com/company/untilfire";

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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0F4F1;padding:32px 16px 48px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px">
        <tr><td style="padding:0 0 28px;text-align:center">${LOGO}</td></tr>
        ${body}
        <tr><td style="padding:32px 0 0;text-align:center;border-top:1px solid #D1FAE5">
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280;line-height:1.6">UntilFire &mdash; Personal finance that sets you free.</p>
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6">
            <a href="${SITE}" style="color:#9CA3AF;text-decoration:none">untilfire.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heroCard(eyebrow: string, headline: string, subtext: string): string {
  return `
  <tr><td style="background:linear-gradient(155deg,#059669 0%,#003527 100%);border-radius:20px;padding:40px 36px 36px">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#22D3A5">${eyebrow}</p>
    <h1 style="margin:0 0 14px;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${headline}</h1>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7">${subtext}</p>
  </td></tr>`;
}

function sectionCard(content: string): string {
  return `
  <tr><td style="padding:16px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;padding:28px 28px 24px">
      <tr><td>${content}</td></tr>
    </table>
  </td></tr>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1.5px">${text}</p>`;
}

function bulletRow(title: string, desc: string, last = false): string {
  return `
  <tr>
    <td style="vertical-align:top;padding-bottom:${last ? "0" : "18px"};width:10px">
      <div style="width:6px;height:6px;border-radius:50%;background:#22D3A5;margin-top:7px"></div>
    </td>
    <td style="vertical-align:top;padding-left:14px;padding-bottom:${last ? "0" : "18px"}">
      <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#003527;line-height:1.4">${title}</p>
      <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6">${desc}</p>
    </td>
  </tr>`;
}

function ctaBlock(href: string, label: string): string {
  return `
  <tr><td style="padding:22px 0 0;text-align:center">
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
      <tr>
        <td style="border-radius:12px;background:#059669">
          <a href="${href}" style="display:inline-block;padding:15px 44px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${label} &rarr;</a>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export function buildWelcomeEmail(): string {
  const hero = heroCard(
    "Welcome",
    "Three things I want you to know.",
    "Before you dive in, here&#39;s what I&#39;d tell a friend sitting across from me."
  );

  const points = sectionCard(`
    ${sectionLabel("From the founder")}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${bulletRow(
        "Connect your bank once and never look back",
        "When you link your accounts, UntilFire can see your full transaction history automatically. No manual entry, no spreadsheets &#8212; your real numbers are already there waiting."
      )}
      ${bulletRow(
        "The core features are free. Forever.",
        "I built this because I needed it myself and couldn&#39;t find anything that didn&#39;t want a subscription on day one. The essentials &#8212; your plan, your tracking, your freedom date &#8212; will always be free. No pressure, no bait and switch."
      )}
      ${bulletRow(
        "This is a long journey. That&#39;s the point.",
        "Financial freedom isn&#39;t a weekend project. But neither is the life you&#39;re building toward. Let&#39;s help you get there with better pace and confidence, one month at a time.",
        true
      )}
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#6B7280;line-height:1.7;border-top:1px solid #F0F4F1;padding-top:20px">
      I hope what worked for me works for you.<br>
      <span style="font-weight:700;color:#003527">&#8212; John, founder of UntilFire</span>
    </p>
  `);

  const cta = ctaBlock(`${SITE}/dashboard?source=welcome-email`, "Open your dashboard");

  return base(
    "Three things I want you to know before you start.",
    hero + points + cta
  );
}

// ─── Retention email (day 7) ──────────────────────────────────────────────────

export function buildRetentionEmail(): string {
  const hero = heroCard(
    "One week in",
    "How are you feeling?",
    "Genuinely asking. Not a prompt from a playbook &#8212; I&#39;m curious how the first week landed for you."
  );

  const checkin = sectionCard(`
    ${sectionLabel("A few things worth reflecting on")}
    <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.75">
      Are you more aware of your spending than you were last week? More aware of what you earn, what you owe, and the time you trade for it every day?
    </p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.75">
      Even just noticing the numbers more clearly is progress. That awareness is what compounds &#8212; not just the savings.
    </p>
  `);

  const building = sectionCard(`
    ${sectionLabel("What we&#39;re building next")}
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.75">
      We&#39;re adding more tools &#8212; better spending breakdowns, smarter projections, and ways to model big life decisions against your timeline. Your feedback is what shapes what gets built next.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.75">
      If there&#39;s something you wish UntilFire did, or something that confused you, just reply to this email. I read every one.
    </p>
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#003527">Follow along as we build:</p>
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:10px">
          <a href="${TWITTER_URL}" style="display:inline-block;padding:9px 18px;border-radius:8px;background:#000000;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">&#120143; Follow on X</a>
        </td>
        <td>
          <a href="${LINKEDIN_URL}" style="display:inline-block;padding:9px 18px;border-radius:8px;background:#0A66C2;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">in Follow on LinkedIn</a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;color:#6B7280;line-height:1.7;border-top:1px solid #F0F4F1;padding-top:20px">
      &#8212; John, founder of UntilFire
    </p>
  `);

  return base(
    "One week in &#8212; how are you feeling? We want to hear from you.",
    hero + checkin + building
  );
}
