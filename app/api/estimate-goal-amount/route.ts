import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

// Same rough defaults GoalsPageTab's PERMA prompts used to seed by hand —
// kept as the fallback so the flow still works with no API key (dev/sandbox)
// or if the model call fails, matching app/api/categorise/route.ts's pattern.
const FALLBACK_BY_CATEGORY: Record<string, number> = {
  emotion: 15000,
  engagement: 15000,
  relationships: 8000,
  meaning: 20000,
  accomplishment: 500000,
};

export async function POST(req: NextRequest) {
  const { category, description, monthlyExpenses } = await req.json() as {
    category?: string;
    description?: string;
    monthlyExpenses?: number;
  };
  const safeCategory = String(category ?? "");
  const safeDescription = String(description ?? "").slice(0, 300);
  const fallback = FALLBACK_BY_CATEGORY[safeCategory] ?? 15000;

  if (!process.env.OPENROUTER_API_KEY || !safeDescription.trim()) {
    return NextResponse.json({ amount: fallback });
  }

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content: `A user is setting a savings goal on their way to financial independence. Category: "${safeCategory}". In their own words, what it's for: "${safeDescription}".${monthlyExpenses ? ` Their current monthly expenses are about $${Math.round(monthlyExpenses)}.` : ""}
Estimate a reasonable one-time dollar amount (USD) they'd need saved to achieve this. Respond ONLY with valid JSON, no markdown.
Format: {"amount": <number>}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ amount: fallback });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text) as { amount: number };
    const amount = Number(parsed.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ amount: fallback });
    }
    return NextResponse.json({ amount: Math.round(amount) });
  } catch {
    return NextResponse.json({ amount: fallback });
  }
}
