import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ category: "other", tags: [] }, { status: 200 });
  }
  try {
    const { description, type } = await req.json() as { description: string; type: "expense" | "income" };
    if (type !== "expense" && type !== "income") {
      return NextResponse.json({ category: "other", tags: [] });
    }
    const safeDescription = String(description ?? "").slice(0, 500);

    const categories =
      type === "income"
        ? "salary, freelance, investment, gift, other_income"
        : "food, transport, housing, utilities, travel, subscriptions, healthcare, entertainment, shopping, work, other";

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Categorize this ${type} transaction. Respond ONLY with valid JSON, no markdown.
Description: "${safeDescription}"
Categories: ${categories}
Format: {"category": "...", "tags": ["tag1", "tag2"]}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ category: "other", tags: [] });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    const result = JSON.parse(text) as { category: string; tags: string[] };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ category: "other", tags: [] });
  }
}
