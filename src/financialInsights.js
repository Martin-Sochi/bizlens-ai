const formatMoney = (amount) =>
new Intl.NumberFormat("en-NG", {
style: "currency",
currency: "NGN",
maximumFractionDigits: 0,
}).format(Number(amount) || 0);

const formatPercentage = (value) => `${value.toFixed(1)}%`;

const getMonthKey = (date) => {
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
return null;
}

return date.slice(0, 7);
};

const getMonthLabel = (monthKey) => {
const [year, month] = monthKey.split("-").map(Number);

return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
month: "long",
year: "numeric",
});
};

const calculatePercentageChange = (current, previous) => {
if (previous === 0) {
if (current === 0) return 0;


return null;


}

return ((current - previous) / Math.abs(previous)) * 100;
};

const describeChange = (current, previous, label) => {
const change = calculatePercentageChange(current, previous);

if (change === null) {
return current > 0
? `${label} was zero in the previous month and is now ${formatMoney(current)}.`
: `${label} was zero in the previous month.`;
}

if (change === 0) {
return `${label} remained unchanged from the previous month.`;
}

const direction = change > 0 ? "increased" : "decreased";

return `${label} ${direction} by ${formatPercentage(
    Math.abs(change)
  )} compared with the previous month.`;
};

export function analyzeFinancials(transactions = []) {
const validTransactions = transactions.filter(
(transaction) =>
transaction &&
(transaction.type === "income" || transaction.type === "expense") &&
Number.isFinite(Number(transaction.amount)) &&
Number(transaction.amount) >= 0
);

const incomeTransactions = validTransactions.filter(
(transaction) => transaction.type === "income"
);

const expenseTransactions = validTransactions.filter(
(transaction) => transaction.type === "expense"
);

const revenue = incomeTransactions.reduce(
(total, transaction) => total + Number(transaction.amount),
0
);

const expenses = expenseTransactions.reduce(
(total, transaction) => total + Number(transaction.amount),
0
);

const profit = revenue - expenses;

const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

const expenseGroups = new Map();

expenseTransactions.forEach((transaction) => {
const category = String(
transaction.category || "Uncategorized"
).trim() || "Uncategorized";


expenseGroups.set(
    category,
    (expenseGroups.get(category) || 0) + Number(transaction.amount)
);


});

const expenseCategories = [...expenseGroups.entries()]
.map(([category, amount]) => ({
category,
amount,
percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
}))
.sort((a, b) => b.amount - a.amount);

const largestExpense = expenseCategories[0] || null;

const monthlyTotals = new Map();

validTransactions.forEach((transaction) => {
const month = getMonthKey(transaction.date);


if (!month) return;

if (!monthlyTotals.has(month)) {
  monthlyTotals.set(month, {
    month,
    revenue: 0,
    expenses: 0,
    transactionCount: 0,
  });
}

const totals = monthlyTotals.get(month);

if (transaction.type === "income") {
  totals.revenue += Number(transaction.amount);
} else {
  totals.expenses += Number(transaction.amount);
}

totals.transactionCount += 1;


});

const monthlyPerformance = [...monthlyTotals.values()]
.sort((a, b) => a.month.localeCompare(b.month))
.map((month) => ({
...month,
profit: month.revenue - month.expenses,
profitMargin:
month.revenue > 0
? ((month.revenue - month.expenses) / month.revenue) * 100
: 0,
label: getMonthLabel(month.month),
}));

const latestMonth =
monthlyPerformance[monthlyPerformance.length - 1] || null;

const previousMonth =
monthlyPerformance.length >= 2
? monthlyPerformance[monthlyPerformance.length - 2]
: null;

const revenueChange =
latestMonth && previousMonth
? calculatePercentageChange(
latestMonth.revenue,
previousMonth.revenue
)
: null;

const expenseChange =
latestMonth && previousMonth
? calculatePercentageChange(
latestMonth.expenses,
previousMonth.expenses
)
: null;

const profitChange =
    latestMonth && previousMonth
        ? calculatePercentageChange(
                latestMonth.profit,
                previousMonth.profit
            )
        : null;

const insights = [];
const recommendations = [];

if (validTransactions.length === 0) {
insights.push({
id: "no-data",
type: "info",
title: "Start with your business records",
description:
"Add transactions or import a CSV file to receive financial analysis based on your business data.",
metric: null,
});


recommendations.push({
    id: "add-records",
    priority: "high",
    title: "Record your income and expenses",
    description:
        "Start by recording sales, inventory purchases, rent, transport, and other business costs. Complete records make the analysis more useful.",
    action: "Add or import transactions",
});

return {
    revenue,
    expenses,
    profit,
    profitMargin,
    transactionCount: validTransactions.length,
    incomeCount: incomeTransactions.length,
    expenseCount: expenseTransactions.length,
    expenseCategories,
    largestExpense,
    monthlyPerformance,
    latestMonth,
    previousMonth,
    revenueChange,
    expenseChange,
    profitChange,
    insights,
    recommendations,
};


}

if (revenue === 0 && expenses > 0) {
insights.push({
id: "no-revenue",
type: "warning",
title: "Expenses recorded without income",
description:
`You have recorded ${formatMoney(expenses)} in expenses but no income. Check whether sales or other income are missing from your records.`,
metric: formatMoney(expenses),
});


recommendations.push({
    id: "check-income",
    priority: "high",
    title: "Check for missing income records",
    description:
        "Confirm that your sales and other income have been recorded. If the records are complete, review how the business is funding its expenses.",
    action: "Review income transactions",
});


} else if (profit < 0) {
insights.push({
id: "operating-loss",
type: "warning",
title: "Recorded expenses exceed income",
description:
`Your recorded expenses exceed income by ${formatMoney(Math.abs(profit))}. This is a negative result based on the transactions currently available.`,
metric: formatMoney(profit),
});


recommendations.push({
    id: "review-costs",
    priority: "high",
    title: "Review spending and income",
    description:
        "Check for unnecessary costs, unusually large purchases, missing sales, and pricing that may not cover your costs. Avoid cutting essential expenses without reviewing their business impact.",
    action: "Review transactions",
});


} else if (profit === 0 && revenue > 0) {
insights.push({
id: "break-even",
type: "warning",
title: "Recorded income matches expenses",
description:
"Your recorded income and expenses are equal. There is currently no surplus in these records.",
metric: formatMoney(profit),
});

recommendations.push({
    id: "improve-margin",
    priority: "medium",
    title: "Look for ways to improve your margin",
    description:
        "Review selling prices, purchasing costs, and operating expenses to identify realistic opportunities to improve the business result.",
    action: "Review costs and pricing",
});


} else {
insights.push({
id: "positive-result",
type: "positive",
title: "Your recorded income exceeds expenses",
description:
`Your current estimated result is ${formatMoney(profit)}. This is a positive balance based on the transactions recorded, not a complete accounting statement.`,
metric: formatMoney(profit),
});
}

if (revenue > 0) {
insights.push({
id: "profit-margin",
type: profitMargin < 10 ? "warning" : "info",
title:
profitMargin < 10
? "Your recorded profit margin is relatively low"
: "Your profit margin is calculated",
description:
`Your estimated profit margin is ${formatPercentage(profitMargin)}. ` +
(profitMargin < 10
? "Review costs and pricing to understand whether this margin is sufficient for your business."
: "Compare this figure over time and with the margin your business needs to cover its obligations."),
metric: formatPercentage(profitMargin),
});
}

if (largestExpense) {
insights.push({
id: "largest-expense",
type: "info",
title: `${largestExpense.category} is your largest recorded expense category`,
description:
`${formatMoney(largestExpense.amount)} is recorded in this category, representing ${formatPercentage(largestExpense.percentage)} of your total recorded expenses.`,
metric: formatPercentage(largestExpense.percentage),
});


recommendations.push({
    id: "review-largest-expense",
    priority:
        largestExpense.percentage >= 50 ? "high" : "medium",
    title: `Review ${largestExpense.category.toLowerCase()} spending`,
    description:
        largestExpense.percentage >= 50
            ? `This category represents more than half of your recorded expenses. Review its transactions to understand whether the spending is expected and sustainable.`
            : `This is your largest recorded expense category. Review its transactions to identify any realistic savings opportunities.`,
    action: "Review expense categories",
});


}

if (latestMonth && previousMonth) {
insights.push({
id: "monthly-revenue",
type:
revenueChange !== null && revenueChange > 0
? "positive"
: "info",
title: "Monthly revenue comparison",
description: describeChange(
latestMonth.revenue,
previousMonth.revenue,
"Recorded revenue"
),
metric:
revenueChange === null
? "New revenue"
: `${revenueChange > 0 ? "+" : ""}${formatPercentage(revenueChange)}`,
});

insights.push({
    id: "monthly-expenses",
    type:
        expenseChange !== null && expenseChange > 0
            ? "warning"
            : "info",
    title: "Monthly expense comparison",
    description: describeChange(
        latestMonth.expenses,
        previousMonth.expenses,
        "Recorded expenses"
    ),
    metric:
        expenseChange === null
            ? "New expenses"
            : `${expenseChange > 0 ? "+" : ""}${formatPercentage(expenseChange)}`,
});

insights.push({
    id: "monthly-profit",
    type:
        profitChange !== null && profitChange < 0
            ? "warning"
            : profitChange !== null && profitChange > 0
                ? "positive"
                : "info",
    title: "Monthly profit comparison",
    description: describeChange(
        latestMonth.profit,
        previousMonth.profit,
        "Recorded profit"
    ),
    metric:
        profitChange === null
            ? "Not comparable"
            : `${profitChange > 0 ? "+" : ""}${formatPercentage(profitChange)}`,
});

if (
    revenueChange !== null &&
    expenseChange !== null &&
    expenseChange > revenueChange &&
    latestMonth.expenses > previousMonth.expenses
) {
    recommendations.push({
        id: "expense-growth",
        priority: "medium",
        title: "Investigate rising expenses",
        description:
            "Recorded expenses have increased faster than revenue compared with the previous recorded month. Review the transactions to understand what changed before deciding whether action is needed.",
        action: "Compare monthly transactions",
    });
}

if (
    revenueChange !== null &&
    revenueChange < 0
) {
    recommendations.push({
        id: "revenue-decline",
        priority: "medium",
        title: "Investigate the revenue decrease",
        description:
            "Recorded revenue is lower than in the previous month. Check for missing entries, seasonal patterns, changes in sales volume, or changes in pricing.",
        action: "Review monthly revenue",
    });
}


} else {
insights.push({
id: "monthly-history",
type: "info",
title: "Build a monthly financial history",
description:
"Transactions currently cover fewer than two distinct months. Record transactions across additional months to enable a month-to-month comparison.",
metric: null,
});
}

if (recommendations.length === 0) {
recommendations.push({
id: "keep-records-current",
priority: "low",
title: "Keep your financial records up to date",
description:
"Continue recording income and expenses consistently. Review your monthly results and verify that important transactions have not been missed.",
action: "Update business records",
});
}

return {
revenue,
expenses,
profit,
profitMargin,
transactionCount: validTransactions.length,
incomeCount: incomeTransactions.length,
expenseCount: expenseTransactions.length,
expenseCategories,
largestExpense,
monthlyPerformance,
latestMonth,
previousMonth,
revenueChange,
expenseChange,
profitChange,
insights,
recommendations,
};
}
