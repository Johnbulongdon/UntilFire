import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "mistralai/mistral-7b-instruct";

export type ParsedStatementTransaction = {
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
};

export type ParsedStatement = {
  bank: string;
  period: string;
  transactions: ParsedStatementTransaction[];
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const { text: rawText } = await pdfParse(buffer);

    // Truncate to ~6000 chars to stay within token budget for cheap models
    const statementText = rawText.slice(0, 6000);

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `Extract transactions from this bank statement text. Return ONLY valid JSON, no markdown fences.

SKIP these rows entirely:
- "Opening balance" or "Closing balance" rows
- Internal transfers: "Transfer to Savings Pot", "Transfer from Savings Pot", "Transfer to Savings", "Transfer from Savings"

CURRENCY: Each section starts with a header like "HKD Savings" (= HKD), "CNY" (= CNY), "USD" (= USD).
Apply the current section's currency to all transactions in that section. Default to HKD if unclear.

AMOUNT: positive number always. Deposits = type "income". Withdrawals = type "expense".

DATE: convert "07 Apr 2026" to "2026-04-07".

DESCRIPTION: first English line only, skip Chinese characters and reference numbers.

Output format (JSON only):
{"bank":"ZA Bank","period":"2026-04","transactions":[{"date":"2026-04-16","description":"Inward fund transfer - Wise","amount":20027.01,"currency":"HKD","type":"income"}]}

STATEMENT TEXT:
${statementText}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Model request failed: ${errText}` }, { status: 502 });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const raw = (data.choices[0]?.message?.content ?? "").trim();

    // Strip markdown code fences if the model wraps output
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: ParsedStatement;
    try {
      parsed = JSON.parse(clean) as ParsedStatement;
    } catch {
      return NextResponse.json({ error: "Failed to parse model response", raw }, { status: 422 });
    }

    // Validate and normalise
    parsed.transactions = (parsed.transactions ?? []).filter(
      (t) => t.date && t.amount > 0 && (t.type === "income" || t.type === "expense")
    );

    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
