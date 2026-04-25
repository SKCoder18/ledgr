// Edge function: parse expense from text, image, or SMS using Google Gemini Directly
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You extract financial transaction data from user input.
Return ONLY a JSON object representing the transaction.
Rules:
- amount: numeric value only
- currency: ISO code (INR, USD, etc.)
- transaction_type: "expense" | "income" | "transfer"
- category: One relevant category
- merchant: business name or null
- expense_date: YYYY-MM-DD
- confidence: 0.0-1.0`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, image_base64 } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY missing");

    const prompt = input || "Extract transaction from image";
    
    // Call Google Gemini API directly
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { text: prompt },
            ...(image_base64 ? [{ inline_data: { mime_type: "image/png", data: image_base64.split(",")[1] || image_base64 } }] : [])
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Gemini Error:", errorText);
      throw new Error(`Gemini API error: ${resp.status}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI");

    const expense = JSON.parse(text);
    return new Response(JSON.stringify({ expense }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-expense error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
