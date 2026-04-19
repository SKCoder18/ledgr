// Generate AI spending insights from a summary of recent expenses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { summary, currency, monthly_budget, goal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are a sharp, encouraging personal finance analyst. Given a summary of a user's recent spending, return 3 short, specific insights. Each insight = 1 sentence (max 22 words). Mention concrete numbers/categories. Tone: clear, calm, useful — never preachy. Currency: ${currency || "USD"}.${monthly_budget ? ` Monthly budget: ${monthly_budget}.` : ""}${goal ? ` User goal: ${goal}.` : ""}`;

    const tool = {
      type: "function",
      function: {
        name: "return_insights",
        description: "Return 3 spending insights",
        parameters: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "3-5 word headline" },
                  body: { type: "string", description: "One sentence, max 22 words" },
                  tone: { type: "string", enum: ["positive", "neutral", "warning"] },
                },
                required: ["title", "body", "tone"],
                additionalProperties: false,
              },
            },
          },
          required: ["insights"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Recent spending summary (JSON):\n${JSON.stringify(summary)}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return new Response(JSON.stringify({ insights: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(call.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
