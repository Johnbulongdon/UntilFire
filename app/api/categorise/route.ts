import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
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
        : "food, transport, housing, travel, subscriptions, healthcare, entertainment, shopping, other";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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
    });

    const text = (msg.content[0] as { type: "text"; text: string }).text.trim();
    const result = JSON.parse(text) as { category: string; tags: string[] };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ category: "other", tags: [] });
  }
}
