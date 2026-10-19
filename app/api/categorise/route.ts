import { NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { AIRequestError, readAIRequest, boundedText } from "@/lib/ai-request";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "categorise"), 20);
  if (limited) return limited;
  try {
    const { description, type } = await readAIRequest(req, 4096);
    if (type !== "expense" && type !== "income") {
      throw new AIRequestError("type must be expense or income");
    }
    const safeDescription = boundedText(description, "description", 500);
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: "Categorisation is unavailable" }, { status: 503 });

    const categories =
      type === "income"
        ? "salary, freelance, investment, gift, other_income"
        : "food, transport, housing, utilities, healthcare, shopping, entertainment, travel, education, subscriptions, personal_care, pets, work, other";

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
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
      return NextResponse.json({ error: "Categorisation provider failed" }, { status: 502 });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    const result = JSON.parse(text) as { category: string; tags: string[] };
    if (!result || !categories.split(", ").includes(result.category) || !Array.isArray(result.tags) ||
      result.tags.length > 5 || result.tags.some(tag => typeof tag !== "string" || tag.length > 40)) {
      return NextResponse.json({ error: "Invalid categorisation response" }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Categorisation is unavailable" }, { status: 502 });
  }
}
