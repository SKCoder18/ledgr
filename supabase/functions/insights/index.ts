// Smart spending insights generator — no external API keys needed. 100% self-contained.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Expense {
  amount: number;
  category: string;
  merchant?: string;
  expense_date: string;
  transaction_type?: string;
}

interface Insight {
  title: string;
  body: string;
  tone: "positive" | "neutral" | "warning";
}

function generateInsights(expenses: Expense[], currency: string): Insight[] {
  const insights: Insight[] = [];
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;

  if (!expenses || expenses.length === 0) {
    return [
      { title: "No data yet", body: "Start logging expenses to get personalized spending insights.", tone: "neutral" },
      { title: "Track daily", body: "Even small purchases add up — log them to see where your money goes.", tone: "neutral" },
      { title: "Set a goal", body: "Having a monthly budget helps you stay on track and save more.", tone: "positive" },
    ];
  }

  // Calculate totals by category
  const byCategory: Record<string, number> = {};
  let totalSpent = 0;
  let totalIncome = 0;
  const dailySpending: Record<string, number> = {};

  for (const e of expenses) {
    const type = e.transaction_type || "expense";
    if (type === "income") {
      totalIncome += e.amount;
      continue;
    }
    totalSpent += e.amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    const day = e.expense_date?.slice(0, 10) || "unknown";
    dailySpending[day] = (dailySpending[day] || 0) + e.amount;
  }

  // Sort categories by amount
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0];
  const days = Object.keys(dailySpending).length || 1;
  const dailyAvg = Math.round(totalSpent / days);

  // Insight 1: Top spending category
  if (topCategory) {
    const pct = Math.round((topCategory[1] / totalSpent) * 100);
    if (pct > 50) {
      insights.push({
        title: `${topCategory[0]} dominates`,
        body: `${pct}% of your spending (${sym}${topCategory[1].toLocaleString()}) went to ${topCategory[0]}. Consider setting a limit.`,
        tone: "warning",
      });
    } else {
      insights.push({
        title: `Top: ${topCategory[0]}`,
        body: `${topCategory[0]} accounts for ${pct}% of spending at ${sym}${topCategory[1].toLocaleString()} this month.`,
        tone: "neutral",
      });
    }
  }

  // Insight 2: Daily average
  if (dailyAvg > 0) {
    insights.push({
      title: "Daily average",
      body: `You're spending about ${sym}${dailyAvg.toLocaleString()} per day across ${expenses.length} transactions.`,
      tone: dailyAvg > 2000 ? "warning" : "neutral",
    });
  }

  // Insight 3: Income vs Expense or category diversity
  if (totalIncome > 0) {
    const savings = totalIncome - totalSpent;
    if (savings > 0) {
      insights.push({
        title: "Savings looking good",
        body: `You saved ${sym}${savings.toLocaleString()} this month — that's ${Math.round((savings / totalIncome) * 100)}% of your income. Keep it up!`,
        tone: "positive",
      });
    } else {
      insights.push({
        title: "Overspending alert",
        body: `You've spent ${sym}${Math.abs(savings).toLocaleString()} more than your income. Time to cut back on ${topCategory?.[0] || "expenses"}.`,
        tone: "warning",
      });
    }
  } else if (sorted.length > 1) {
    const second = sorted[1];
    insights.push({
      title: `Watch ${second[0]}`,
      body: `${second[0]} is your second biggest spend at ${sym}${second[1].toLocaleString()}. Small cuts here add up fast.`,
      tone: "neutral",
    });
  } else {
    insights.push({
      title: "Diversify tracking",
      body: `All spending is in one category. Try logging different types for better insights.`,
      tone: "neutral",
    });
  }

  // Ensure we have exactly 3 insights
  while (insights.length < 3) {
    const remaining = [
      { title: "Stay consistent", body: `You've logged ${expenses.length} transactions. Consistency is key to financial awareness.`, tone: "positive" as const },
      { title: "Total this month", body: `Total spending so far: ${sym}${totalSpent.toLocaleString()} across ${sorted.length} categories.`, tone: "neutral" as const },
      { title: "Smart tracking", body: "Keep logging daily to build a complete picture of your spending habits.", tone: "positive" as const },
    ];
    const pick = remaining[insights.length - 1] || remaining[0];
    insights.push(pick);
  }

  return insights.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summary, currency } = await req.json();
    const insights = generateInsights(summary || [], currency || "INR");

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
