import { NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { AIRequestError, readAIRequest, classificationItems } from "@/lib/ai-request";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "classify-needs-wants"), 20);
  if (limited) return limited;
  try {
    const body = await readAIRequest(req);
    const items = classificationItems(body.items);
    if (!items.length) return NextResponse.json({ results: [] });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: "Classification is unavailable" }, { status: 503 });

    const unique = [...new Map(items.map((i) => [i.description.toLowerCase(), i])).values()];
    const lines = unique.map((i) => `${i.description} | ${i.category}`).join("\n");

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // Bounded by 50 items; allow room to echo the longest descriptions.
        max_tokens: Math.min(unique.length * 160 + 100, 8100),
        messages: [
          {
            role: "user",
            content: `Classify each transaction as "need" or "want".
Needs = essential: groceries, rent, mortgage, utilities, phone bill, insurance, medicine, doctor, transit, gas for commute.
Wants = discretionary: restaurants, coffee shops, bars, streaming, entertainment, travel, clothing, hobbies, gifts, gaming.
When unsure, lean toward "want".

Transactions (description | category):
${lines}

Respond ONLY with valid JSON array, no markdown:
[{"description": "...", "needOrWant": "need"}, ...]`,
          },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "Classification provider failed" }, { status: 502 });
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    let results: { description: string; needOrWant: string }[];
    try {
      results = JSON.parse(text) as { description: string; needOrWant: string }[];
    } catch {
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 502 });
    }
    const descriptions = new Set(unique.map(item => item.description.toLowerCase()));
    if (!Array.isArray(results) || results.length !== unique.length || results.some(item =>
      !item || typeof item.description !== "string" || !descriptions.has(item.description.toLowerCase()) ||
      (item.needOrWant !== "need" && item.needOrWant !== "want"))) {
      return NextResponse.json({ error: "Invalid classification response" }, { status: 502 });
    }
    if (new Set(results.map(item => item.description.toLowerCase())).size !== unique.length) {
      return NextResponse.json({ error: "Incomplete classification response" }, { status: 502 });
    }
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof AIRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Classification is unavailable" }, { status: 502 });
  }
}
