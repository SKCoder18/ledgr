// Smart spending insights generator — no external API keys needed. 100% self-contained.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Insight {
  title: string;
  body: string;
  tone: "positive" | "neutral" | "warning";
}

// The frontend sends a summary object like:
// { period, total, entries, by_category: {Food: 500, ...}, top_merchants: [{merchant, amount}] }
interface SpendingSummary {
  period?: string;
  total?: number;
  entries?: number;
  by_category?: Record<string, number>;
  top_merchants?: Array<{ merchant: string; amount: number }>;
}

function generateInsights(summary: SpendingSummary, currency: string, budget?: number | null, goal?: string | null): Insight[] {
  const insights: Insight[] = [];
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  const total = summary.total || 0;
  const entries = summary.entries || 0;
  const byCategory = summary.by_category || {};
  const merchants = summary.top_merchants || [];

  if (entries === 0 || total === 0) {
    return [
      { title: "No data yet", body: "Start logging expenses to get personalized spending insights.", tone: "neutral" },
      { title: "Track daily", body: "Even small purchases add up — log them to see where your money goes.", tone: "neutral" },
      { title: "Set a goal", body: "Having a monthly budget helps you stay on track and save more.", tone: "positive" },
    ];
  }

  // Sort categories by amount
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0];
  const categoryCount = sorted.length;

  // Insight 1: Top spending category
  if (topCategory) {
    const pct = Math.round((topCategory[1] / total) * 100);
    if (pct > 50) {
      insights.push({
        title: `${topCategory[0]} dominates`,
        body: `${pct}% of your spending (${sym}${Math.round(topCategory[1]).toLocaleString()}) went to ${topCategory[0]}. Consider setting a limit.`,
        tone: "warning",
      });
    } else {
      insights.push({
        title: `Top: ${topCategory[0]}`,
        body: `${topCategory[0]} accounts for ${pct}% of spending at ${sym}${Math.round(topCategory[1]).toLocaleString()} this month.`,
        tone: "neutral",
      });
    }
  }

  // Insight 2: Budget check or daily average
  if (budget && budget > 0) {
    const pct = Math.round((total / budget) * 100);
    if (pct > 100) {
      insights.push({
        title: "Over budget!",
        body: `You've spent ${sym}${Math.round(total).toLocaleString()} — that's ${pct - 100}% over your ${sym}${budget.toLocaleString()} budget.`,
        tone: "warning",
      });
    } else if (pct > 80) {
      insights.push({
        title: "Budget alert",
        body: `You've used ${pct}% of your ${sym}${budget.toLocaleString()} budget with ${sym}${Math.round(budget - total).toLocaleString()} remaining.`,
        tone: "warning",
      });
    } else {
      insights.push({
        title: "On track",
        body: `You've used ${pct}% of your ${sym}${budget.toLocaleString()} budget. ${sym}${Math.round(budget - total).toLocaleString()} remaining — nice pace!`,
        tone: "positive",
      });
    }
  } else {
    const today = new Date().getDate();
    const dailyAvg = Math.round(total / Math.max(today, 1));
    insights.push({
      title: "Daily average",
      body: `You're spending about ${sym}${dailyAvg.toLocaleString()} per day across ${entries} transactions this month.`,
      tone: dailyAvg > 2000 ? "warning" : "neutral",
    });
  }

  // Insight 3: Merchant insight or category diversity
  if (merchants.length > 0) {
    const topMerchant = merchants[0];
    const merchantPct = Math.round((topMerchant.amount / total) * 100);
    insights.push({
      title: `${topMerchant.merchant} fan`,
      body: `${sym}${Math.round(topMerchant.amount).toLocaleString()} (${merchantPct}%) of spending goes to ${topMerchant.merchant}. Worth reviewing?`,
      tone: merchantPct > 40 ? "warning" : "neutral",
    });
  } else if (sorted.length > 1) {
    const second = sorted[1];
    insights.push({
      title: `Watch ${second[0]}`,
      body: `${second[0]} is your second biggest spend at ${sym}${Math.round(second[1]).toLocaleString()}. Small cuts here add up fast.`,
      tone: "neutral",
    });
  } else {
    insights.push({
      title: "Total this month",
      body: `Total spending so far: ${sym}${Math.round(total).toLocaleString()} across ${categoryCount} ${categoryCount === 1 ? "category" : "categories"}.`,
      tone: "neutral",
    });
  }

  // Pad to 3 insights if needed
  while (insights.length < 3) {
    const extras: Insight[] = [
      { title: "Stay consistent", body: `You've logged ${entries} transactions. Consistency is key to financial awareness.`, tone: "positive" },
      { title: "Smart tracking", body: "Keep logging daily to build a complete picture of your spending habits.", tone: "positive" },
      { title: "Monthly total", body: `Total spending this month: ${sym}${Math.round(total).toLocaleString()} so far.`, tone: "neutral" },
    ];
    insights.push(extras[insights.length % extras.length]);
  }

  return insights.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { summary, currency, monthly_budget, goal } = body;
    const insights = generateInsights(summary || {}, currency || "INR", monthly_budget, goal);

    console.log("Generated insights:", JSON.stringify(insights));

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
