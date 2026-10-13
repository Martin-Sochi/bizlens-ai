
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({ path: "server/.env" });

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "20kb" }));

const apiKey = process.env.GROQ_API_KEY;
const ai = apiKey ? new Groq({ apiKey }) : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function cleanText(value, maxLength = 300) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function normalizeExpenseCategories(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  const grouped = new Map();

  for (const item of categories) {
    if (
      typeof item?.name !== "string" ||
      !isFiniteNumber(item.amount) ||
      item.amount < 0
    ) {
      continue;
    }

    const name = cleanText(item.name, 60) || "Uncategorized";
    const key = name.toLowerCase();

    grouped.set(key, {
      name,
      amount: (grouped.get(key)?.amount || 0) + item.amount,
    });
  }

  return [...grouped.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

function buildPrompt(summary) {
  return `
You are BizLens AI, a practical financial analysis assistant for
small and medium-sized businesses in Nigeria.

Your job is to interpret the supplied financial records and recommend
useful, realistic next steps. Think carefully before choosing advice.

AUTHORITATIVE FINANCIAL DATA:
${JSON.stringify(summary, null, 2)}

FINANCIAL ACCURACY RULES:

1. Treat the supplied financial figures as the authoritative figures.
   Never invent, change, or contradict the revenue or expense totals.

2. Revenue is recorded income. Expenses are recorded expenses.
   Profit is revenue minus expenses. Profit margin describes profit
   relative to revenue when revenue is greater than zero.

3. Expense categories describe recorded classifications, not necessarily
   the actual purpose of every transaction. Do not infer details that
   the category name does not establish.

4. Use only the expense categories and amounts supplied. If a category
   is present, do not claim that no categories were provided.

5. Expense categories may not explain every expense. Do not assume that
   the sum of the displayed categories represents all expenses unless
   the supplied data establishes that fact.

6. Unless a reporting period is explicitly supplied, do not describe
   totals as daily, weekly, monthly, annual, or typical. Do not assume
   when the business earned or spent the money.

7. Do not infer customer demand, cash reserves, debts, unpaid bills,
   taxes, stock levels, or future sales from revenue and expenses alone.

8. A positive profit or high profit margin does not prove that the
   business has sufficient cash available to spend. Consider unrecorded
   obligations and cash-flow needs.

9. Do not recommend a specific investment, savings transfer, advertising
   budget, or spending amount unless the data supports it. Never imply
   that the same profit can be fully allocated to several different goals.

10. Do not guarantee results or present a possibility as a fact.
    Do not give definitive tax, legal, or regulated investment advice.

ANALYSIS PROCESS:

Before producing recommendations, internally consider:

- Whether recorded revenue exceeds recorded expenses.
- Whether the recorded result is a profit or a loss.
- Whether the supplied expense categories reveal a meaningful cost
  concentration or an obvious classification problem.
- Whether the data is sufficient to support a specific conclusion.
- Which action would be most useful to the business owner right now.

RECOMMENDATION QUALITY RULES:

1. Return 3 to 5 recommendations when the available data supports them.
   Do not invent findings just to reach a particular number.

2. Prioritize specific findings over generic business advice.

3. Where useful, include exact supplied figures in the description.
   Format amounts as Nigerian naira, for example ₦60,000.

4. Explain why the observation matters, then give a practical next step.

5. Make each recommendation distinct. Do not repeat the same advice
   under different titles.

6. Use "high", "medium", or "low" priority:
   - high: a material concern directly supported by the data;
   - medium: a useful improvement supported by the data;
   - low: a helpful longer-term practice or data-quality improvement.

7. Do not label an issue high priority merely because data is missing.
   Missing information alone is not proof of a financial problem.

8. When data is limited, be transparent. Recommend collecting the
   missing information instead of pretending to know the answer.

9. When revenue, expenses, and profit are all zero, focus on setting up
   accurate transaction records. Do not invent financial problems.

10. Avoid vague instructions such as "grow your business" or "increase
    sales" unless you explain a concrete, data-supported next step.

11. Do not repeatedly recommend better expense categorization when
    categories are already sufficiently detailed. Choose another
    relevant finding when the records support one.

12. Do not claim that a business is financially healthy based only on
    a positive recorded profit. Use wording such as "the recorded
    transactions show a positive result."

OUTPUT RULES:

Return only a valid JSON object, with no Markdown or surrounding text.

Use exactly this structure:
{
  "recommendations": [
    {
      "priority": "high",
      "title": "Short, specific title",
      "description": "A factual observation grounded in the supplied data and why it matters.",
      "action": "A practical next step that the owner can take."
    }
  ]
}
`;
}

async function generateWithRetry(summary) {
  if (!ai) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const prompt = buildPrompt(summary);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Groq request started (attempt ${attempt}/2).`);

      const response = await ai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content:
              "You are BizLens AI. Analyze financial data carefully, " +
              "use only supplied evidence, avoid unsupported assumptions, " +
              "and return the requested JSON structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1400,
        response_format: { type: "json_object" },
      });

      const responseText =
        response.choices?.[0]?.message?.content?.trim();

      if (!responseText) {
        throw new Error("Groq returned an empty response.");
      }

      const result = JSON.parse(responseText);

      if (!Array.isArray(result?.recommendations)) {
        throw new Error(
          "The AI response did not contain a recommendations array."
        );
      }

      console.log("Groq request completed.");

      return result;
    } catch (error) {
      const message = String(error?.message || error);

      console.error(
        `Groq request failed (attempt ${attempt}/2):`,
        message
      );

      const status = error?.status;
      const temporaryFailure =
        status === 429 ||
        (Number.isFinite(status) && status >= 500) ||
        message.includes("429") ||
        message.toLowerCase().includes("rate_limit") ||
        message.includes("ECONNRESET") ||
        message.includes("fetch failed");

      if (!temporaryFailure || attempt === 2) {
        throw error;
      }

      await sleep(1500);
    }
  }

  throw new Error("Groq generation failed.");
}

function normalizeRecommendations(items) {
  const seenTitles = new Set();
  const recommendations = [];

  for (const item of items) {
    if (
      typeof item?.title !== "string" ||
      typeof item?.description !== "string" ||
      typeof item?.action !== "string"
    ) {
      continue;
    }

    const title = cleanText(item.title, 120);
    const description = cleanText(item.description, 500);
    const action = cleanText(item.action, 300);

    if (!title || !description || !action) {
      continue;
    }

    const titleKey = title.toLowerCase();

    if (seenTitles.has(titleKey)) {
      continue;
    }

    seenTitles.add(titleKey);

    const requestedPriority = String(item.priority || "").toLowerCase();

    recommendations.push({
      id: `ai-${recommendations.length + 1}`,
      priority: ["high", "medium", "low"].includes(requestedPriority)
        ? requestedPriority
        : "medium",
      title,
      description,
      action,
    });

    if (recommendations.length === 5) {
      break;
    }
  }

  return recommendations;
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(ai),
    provider: "groq",
  });
});

app.post("/api/ai-recommendations", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Groq API key is not configured.",
      });
    }

    const {
      financialSummary,
      expenseCategories = [],
      reportingPeriod = null,
    } = req.body ?? {};

    if (
      !financialSummary ||
      !isFiniteNumber(financialSummary.revenue) ||
      !isFiniteNumber(financialSummary.expenses) ||
      !isFiniteNumber(financialSummary.profit) ||
      financialSummary.revenue < 0 ||
      financialSummary.expenses < 0
    ) {
      return res.status(400).json({
        error: "Valid financial summary data is required.",
      });
    }

    const { revenue, expenses, profit } = financialSummary;

    // Prevent inconsistent financial figures from reaching the AI.
    const calculatedProfit = revenue - expenses;

    if (Math.abs(profit - calculatedProfit) > 1) {
      return res.status(400).json({
        error:
          "The supplied profit does not match revenue minus expenses. " +
          "Please refresh the financial summary and try again.",
      });
    }

    const calculatedMargin =
      revenue > 0 ? (calculatedProfit / revenue) * 100 : 0;

    if (
      isFiniteNumber(financialSummary.profitMargin) &&
      Math.abs(financialSummary.profitMargin - calculatedMargin) > 1
    ) {
      return res.status(400).json({
        error:
          "The supplied profit margin does not match the financial totals. " +
          "Please refresh the financial summary and try again.",
      });
    }

    const safeSummary = {
      currency: "NGN",
      revenue,
      expenses,
      profit: calculatedProfit,
      profitMargin: calculatedMargin,
      reportingPeriod:
        typeof reportingPeriod === "string" && reportingPeriod.trim()
          ? cleanText(reportingPeriod, 40)
          : null,
      expenseCategories: normalizeExpenseCategories(expenseCategories),
    };

    const result = await generateWithRetry(safeSummary);
    const recommendations = normalizeRecommendations(result.recommendations);

    if (recommendations.length === 0) {
      throw new Error("Groq returned no usable recommendations.");
    }

    console.log(
      `Successfully generated ${recommendations.length} Groq recommendations.`
    );

    return res.json({
      source: "groq",
      recommendations,
    });
  } catch (error) {
    console.error(
      "Groq recommendation error:",
      error?.message || error
    );

    const status = error?.status;
    const message = String(error?.message || "");

    if (
      status === 429 ||
      (Number.isFinite(status) && status >= 500) ||
      message.includes("429") ||
      message.toLowerCase().includes("rate_limit")
    ) {
      return res.status(503).json({
        error:
          "Groq is temporarily unavailable or rate-limited. Please try again later.",
      });
    }

    return res.status(502).json({
      error:
        "Unable to generate AI recommendations. Check the backend terminal for details.",
    });
  }
});


export default app;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BizLens AI backend listening on port ${PORT}`);
    console.log(`Groq configured: ${Boolean(ai)}`);
  });
}
