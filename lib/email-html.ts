const LOGO = `<img src="https://www.untilfire.com/logo/horizon-wordmark-horizontal.svg" alt="UntilFire" width="160" height="46" style="display:inline-block;border:0;max-width:160px" />`

function base(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F1;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
        <tr><td style="padding-bottom:24px;text-align:center">${LOGO}</td></tr>
        ${body}
        <tr><td style="padding:28px 4px 0">
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.7;text-align:center">
            UntilFire &mdash; Personal finance that sets you free.<br>
            <a href="https://www.untilfire.com" style="color:#9CA3AF;text-decoration:none">untilfire.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function heroCard(content: string): string {
  return `<tr><td style="background:linear-gradient(160deg,#059669 0%,#003527 100%);border-radius:20px;padding:36px 32px 32px">${content}</td></tr>`
}

function whiteCard(content: string): string {
  return `<tr><td style="padding:20px 0 0"><table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:24px"><tr><td>${content}</td></tr></table></td></tr>`
}

function ctaRow(href: string, label: string): string {
  return `<tr><td style="padding:20px 0 0;text-align:center">
    <a href="${href}" style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:800;padding:16px 36px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px">${label} &#8594;</a>
  </td></tr>`
}

function stepList(steps: Array<{ icon: string; title: string; desc: string }>): string {
  return steps.map((s, i) => `
    <tr>
      <td style="padding:${i === 0 ? "0" : "12px"} 0 0;vertical-align:top;width:32px;font-size:20px">${s.icon}</td>
      <td style="padding:${i === 0 ? "0" : "12px"} 0 0 14px;vertical-align:top">
        <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#003527">${s.title}</p>
        <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5">${s.desc}</p>
      </td>
    </tr>`).join("")
}

export function buildWelcomeEmail(): string {
  const hero = heroCard(`
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#22D3A5">Welcome to UntilFire</p>
    <h1 style="margin:0 0 12px;font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-2px;line-height:1">Your path starts here.</h1>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.65">
      You now have a plan. The next step is to make it real by connecting it to your actual numbers.
    </p>
  `)

  const steps = whiteCard(`
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#003527;text-transform:uppercase;letter-spacing:1px">Your 3 next moves</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${stepList([
        { icon: "&#127974;", title: "Connect your bank accounts", desc: "See exactly where your money goes each month — the clearest signal for bringing your freedom date closer." },
        { icon: "&#128202;", title: "Review your spending breakdown", desc: "Know your needs vs wants. Most people find 10&#37; they can redirect toward their plan on the first review." },
        { icon: "&#127919;", title: "Set your monthly savings target", desc: "Your dashboard shows how each extra dollar saved moves your freedom date. Make it visible." },
      ])}
    </table>
  `)

  const cta = ctaRow("https://www.untilfire.com/dashboard?source=welcome-email", "Go to your dashboard")

  return base(hero + steps + cta)
}

export function buildRetentionEmail(): string {
  const hero = heroCard(`
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#22D3A5">Your plan is still here</p>
    <h1 style="margin:0 0 12px;font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-2px;line-height:1">Pick up where you left off.</h1>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.65">
      The fastest way to bring your freedom date closer is to see where your money is actually going.
      It takes less than 5 minutes to connect an account and get your real spending picture.
    </p>
  `)

  const nudge = whiteCard(`
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#003527;text-transform:uppercase;letter-spacing:1px">Why it matters</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${stepList([
        { icon: "&#128200;", title: "Your savings rate is the biggest lever", desc: "Raising it by just 5&#37; can pull your freedom date forward by 2&#8211;4 years. Knowing where your money goes is step one." },
        { icon: "&#127974;", title: "Connect once, track automatically", desc: "Link your bank or card and UntilFire categorizes your spending automatically &#8212; no manual entry needed." },
        { icon: "&#9989;", title: "Watch your path update in real time", desc: "Every logged month updates your freedom date. Make it a habit and your plan gets sharper every week." },
      ])}
    </table>
  `)

  const cta = ctaRow("https://www.untilfire.com/dashboard?source=retention-email", "Continue your plan")

  return base(hero + nudge + cta)
}
