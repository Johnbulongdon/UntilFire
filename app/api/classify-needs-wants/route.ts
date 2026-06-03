import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }
  try {
    const { items } = await req.json() as { items: { description: string; category: string }[] };
    if (!items?.length) return NextResponse.json({ results: [] });

    const unique = [...new Map(items.map((i) => [i.description.toLowerCase(), i])).values()];
    const lines = unique.map((i) => `${i.description} | ${i.category}`).join("\n");

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: unique.length * 30 + 100,
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

    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    let results: { description: string; needOrWant: string }[];
    try {
      results = JSON.parse(text) as { description: string; needOrWant: string }[];
    } catch {
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 500 });
    }
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
