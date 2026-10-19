import { NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { AIRequestError, readAIRequest, boundedText } from "@/lib/ai-request";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

const GOAL_CATEGORIES = ["emotion", "engagement", "relationships", "meaning", "accomplishment"];

export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "estimate-goal-amount"), 20);
  if (limited) return limited;
  try {
    const { category, description, monthlyExpenses } = await readAIRequest(req, 4096);
    const safeCategory = boundedText(category, "category", 40);
    const safeDescription = boundedText(description, "description", 300);
    if (!GOAL_CATEGORIES.includes(safeCategory)) throw new AIRequestError("Unknown goal category");
    if (monthlyExpenses !== undefined && (typeof monthlyExpenses !== "number" || !Number.isFinite(monthlyExpenses) || monthlyExpenses < 0 || monthlyExpenses > 100_000_000)) {
      throw new AIRequestError("monthlyExpenses must be a valid non-negative amount");
    }
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: "Goal estimate is unavailable" }, { status: 503 });

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
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
      return NextResponse.json({ error: "Goal estimate provider failed" }, { status: 502 });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text) as { amount: number };
    const amount = Number(parsed.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Goal estimate provider failed" }, { status: 502 });
    }
    return NextResponse.json({ amount: Math.round(amount) });
  } catch (error) {
    if (error instanceof AIRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Goal estimate is unavailable" }, { status: 502 });
  }
}
