// Edge function: parse expense from text, image, or SMS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You extract financial transaction data from user input. Input may be:
- Free text: "coffee 4.50 yesterday" or "got salary 50000 today"
- Bank/payment SMS: "Rs.250 debited at SWIGGY" or "Rs.5000 credited from REFUND"
- Receipt image

CRITICAL: Determine transaction_type:
- "income" → money received: keywords like credited, received, salary, refund, cashback, deposited, income, reward, bonus, payment received
- "expense" → money spent: keywords like debited, paid, purchased, spent, withdrawn, charged
- "transfer" → unclear, moving money between own accounts

Return ONE transaction via function call. Rules:
- amount: numeric value only (no currency symbol), always positive
- currency: ISO code (INR for ₹/Rs, USD for $, EUR for €, GBP for £). Default USD.
- transaction_type: "expense" | "income" | "transfer"
- category: 
  - If expense: one of [Food & Dining, Groceries, Transport, Shopping, Entertainment, Bills & Utilities, Health, Travel, Subscriptions, Education, Other]
  - If income: one of [Salary, Freelance, Refund, Investment, Gift, Other Income]
- merchant: business/sender name if detected, else null
- expense_date: ISO date YYYY-MM-DD. "yesterday"/"today" relative to ${new Date().toISOString().slice(0, 10)}. Default today.
- notes: short context max 80 chars, or null
- confidence: 0.0–1.0`;

const tool = {
  type: "function",
  function: {
    name: "extract_transaction",
    description: "Extract a single financial transaction from the input",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
        transaction_type: { type: "string", enum: ["expense", "income", "transfer"] },
        category: { type: "string" },
        merchant: { type: ["string", "null"] },
        expense_date: { type: "string", description: "YYYY-MM-DD" },
        notes: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["amount", "currency", "transaction_type", "category", "expense_date", "confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, image_base64, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    if (!input && !image_base64) {
      return new Response(JSON.stringify({ error: "Provide input or image_base64" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [];
    if (input) userContent.push({ type: "text", text: `Mode: ${mode || "text"}\nInput: ${input}` });
    if (image_base64) {
      userContent.push({ type: "text", text: "Extract the transaction from this receipt image:" });
      userContent.push({ type: "image_url", image_url: { url: image_base64 } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_transaction" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Could not extract transaction" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const expense = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ expense }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-expense error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
