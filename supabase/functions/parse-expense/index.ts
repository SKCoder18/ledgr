// Smart expense parser — no external API keys needed. 100% self-contained.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Category keywords ───
const EXPENSE_CATEGORIES: Record<string, string[]> = {
  "Food & Dining": ["coffee","tea","lunch","dinner","breakfast","food","eat","restaurant","cafe","pizza","burger","biryani","dosa","thali","snack","snacks","swiggy","zomato","uber eats","dominos","mcdonalds","kfc","starbucks","subway","meal","canteen","tiffin","juice","ice cream","dessert","bakery","cake","chocolate"],
  "Groceries": ["grocery","groceries","vegetables","fruits","milk","bread","rice","dal","oil","sugar","flour","atta","supermarket","bigbasket","blinkit","zepto","dmart","reliance fresh","provisions","kirana"],
  "Transport": ["uber","ola","cab","taxi","auto","rickshaw","bus","metro","train","fuel","petrol","diesel","gas","parking","toll","rapido","lyft","grab"],
  "Shopping": ["amazon","flipkart","myntra","ajio","shopping","clothes","shoes","shirt","pants","dress","electronics","phone","laptop","watch","bag","purse","meesho","nykaa","mall"],
  "Entertainment": ["movie","movies","cinema","netflix","spotify","hotstar","prime","youtube","gaming","game","concert","show","theatre","pvr","inox","books","book","music","subscription"],
  "Bills & Utilities": ["electricity","electric","water","gas","internet","wifi","broadband","phone bill","mobile","recharge","jio","airtel","vi","bsnl","rent","maintenance","society","cable","dth"],
  "Health": ["medicine","medical","doctor","hospital","pharmacy","gym","health","fitness","apollo","medplus","1mg","netmeds","dental","eye","clinic","lab","test","insurance"],
  "Travel": ["flight","hotel","booking","trip","travel","makemytrip","goibibo","irctc","airbnb","oyo","resort","vacation","holiday","ticket","visa"],
  "Subscriptions": ["subscription","plan","membership","premium","pro","annual","monthly","renewal"],
  "Education": ["course","class","tuition","fees","college","school","university","udemy","coursera","books","stationery","exam","coaching"],
};

const INCOME_KEYWORDS = ["salary","credited","received","income","refund","cashback","bonus","reward","dividend","interest","freelance","payment received","deposited","credit","earned","commission","allowance","stipend","reimbursement","prize","winning"];
const TRANSFER_KEYWORDS = ["transfer","transferred","moved","sent to self","own account","savings","fd","fixed deposit","mutual fund","investment","sip"];

// ─── Merchant patterns ───
const KNOWN_MERCHANTS = ["swiggy","zomato","amazon","flipkart","uber","ola","netflix","spotify","hotstar","myntra","bigbasket","blinkit","zepto","paytm","phonepe","gpay","google pay","makemytrip","irctc","jio","airtel","vi","bsnl","dominos","mcdonalds","kfc","starbucks","subway","meesho","nykaa","ajio","rapido","pvr","inox","udemy","coursera","apollo","medplus","dmart","reliance"];

// ─── Amount extraction ───
function extractAmount(text: string): number | null {
  // Match patterns like: Rs.250, ₹250, INR 250, $50, 250.00, Rs 1,000.00
  const patterns = [
    /(?:rs\.?|₹|inr|usd|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|₹|inr|usd|\$|€|£)/i,
    /(?:amount|amt|paid|debited|credited|received|spent|charged)\s*(?:of|:|\s)\s*(?:rs\.?|₹|inr|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\b([\d,]+(?:\.\d{1,2})?)\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 100000000) return val;
    }
  }
  return null;
}

// ─── Currency detection ───
function detectCurrency(text: string): string {
  if (/₹|rs\.?|inr|rupee/i.test(text)) return "INR";
  if (/€|eur/i.test(text)) return "EUR";
  if (/£|gbp/i.test(text)) return "GBP";
  if (/\$|usd/i.test(text)) return "USD";
  return "INR"; // Default to INR for Indian users
}

// ─── Date extraction ───
function extractDate(text: string): string {
  const today = new Date();
  const lower = text.toLowerCase();

  if (/\byesterday\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/.test(lower) || /\bjust now\b/.test(lower)) {
    return today.toISOString().slice(0, 10);
  }
  if (/\bday before yesterday\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  }
  if (/\blast week\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }

  // Match dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    let year = parseInt(dateMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Match dates from SMS like "10/03/2026"
  const smsDate = text.match(/(?:on|dated?)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if (smsDate) {
    const day = parseInt(smsDate[1]);
    const month = parseInt(smsDate[2]) - 1;
    let year = parseInt(smsDate[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  return today.toISOString().slice(0, 10);
}

// ─── Transaction type detection ───
function detectType(text: string): "expense" | "income" | "transfer" {
  const lower = text.toLowerCase();
  if (TRANSFER_KEYWORDS.some(k => lower.includes(k))) return "transfer";
  if (INCOME_KEYWORDS.some(k => lower.includes(k))) return "income";
  return "expense";
}

// ─── Category detection ───
function detectCategory(text: string, type: string): string {
  const lower = text.toLowerCase();

  if (type === "income") {
    if (/salary|wages/.test(lower)) return "Salary";
    if (/freelance|gig|project/.test(lower)) return "Freelance";
    if (/refund|return/.test(lower)) return "Refund";
    if (/cashback|reward|bonus/.test(lower)) return "Cashback";
    if (/interest|dividend/.test(lower)) return "Investment";
    if (/gift/.test(lower)) return "Gift";
    return "Other Income";
  }

  for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return "Other";
}

// ─── Merchant detection ───
function detectMerchant(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of KNOWN_MERCHANTS) {
    if (lower.includes(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  }
  // Try to extract from "at MERCHANT" or "to MERCHANT"
  const atMatch = text.match(/(?:at|to|from|via|@)\s+([A-Z][A-Za-z\s]+?)(?:\s+on|\s+for|\s+dated|\s*$)/);
  if (atMatch) return atMatch[1].trim();
  return null;
}

// ─── Notes generation ───
function generateNotes(text: string, merchant: string | null, category: string): string {
  if (text.length <= 80) return text;
  const parts: string[] = [];
  if (merchant) parts.push(merchant);
  parts.push(category);
  return parts.join(" - ").slice(0, 80);
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, image_base64 } = await req.json();

    if (!input && !image_base64) {
      return new Response(JSON.stringify({ error: "Provide input text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image_base64 && !input) {
      return new Response(JSON.stringify({ error: "Image parsing requires AI. Please type the receipt details instead." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = input || "";
    const amount = extractAmount(text);

    if (!amount) {
      return new Response(JSON.stringify({ error: "Could not find an amount. Try: 'coffee 150 today'" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currency = detectCurrency(text);
    const transaction_type = detectType(text);
    const category = detectCategory(text, transaction_type);
    const merchant = detectMerchant(text);
    const expense_date = extractDate(text);
    const notes = generateNotes(text, merchant, category);
    const confidence = merchant ? 0.9 : 0.75;

    const expense = {
      amount,
      currency,
      transaction_type,
      category,
      merchant,
      expense_date,
      notes,
      confidence,
    };

    console.log("Parsed expense:", JSON.stringify(expense));

    return new Response(JSON.stringify({ expense }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-expense error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
