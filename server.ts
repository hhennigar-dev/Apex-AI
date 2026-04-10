import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import YahooFinance from "yahoo-finance2";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const yahooFinance = new (YahooFinance as any)({
  validation: { logErrors: false },
  suppressNotices: ['yahooSurvey']
});
const app = express();
const PORT = 3000;

// Popular stocks basket
const STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", 
  "META", "TSLA", "BRK.B", "JPM", "V", 
  "JNJ", "WMT", "PG", "MA", "HD",
  "UNH", "CVX", "LLY", "ABBV", "PEP"
];

// Cache to avoid hitting rate limits too often
let cachedAnalysis: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

app.get("/api/opportunities", async (req, res) => {
  try {
    const customApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY;

    // If we have a cached analysis and NO custom key was just provided, use cache
    if (cachedAnalysis && Date.now() - lastFetchTime < CACHE_DURATION && !customApiKey) {
      return res.json(cachedAnalysis);
    }

    console.log("Fetching fresh stock data...");
    
    let quotes: any[] = [];
    try {
      quotes = await yahooFinance.quote(STOCKS, {}, { validateResult: false });
    } catch (error: any) {
      if (error.name === "FailedYahooValidationError") {
        console.warn("Yahoo Finance validation error, using available data.");
        quotes = error.result || [];
      } else {
        throw error;
      }
    }
    
    const marketData = quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortName || q.longName,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      peRatio: q.trailingPE,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      volume: q.regularMarketVolume
    }));

    let analysisResult = [];
    try {
      console.log("Analyzing data with Gemini...");
      if (!apiKeyToUse) {
        throw new Error("No API key provided. Please set it in Settings.");
      }
      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      const prompt = `
        You are an expert quantitative analyst and AI portfolio manager.
        Analyze the following real-time market data for a basket of top stocks.
        Rank them based on current investment opportunity, considering their price, P/E ratio, 52-week range, and momentum.
        
        For each stock, provide:
        1. A ranking (1 being the best).
        2. A "Success Rate" or "Probability Potential" percentage (e.g., 85%).
        3. A "Profit Potential" percentage (e.g., 15%).
        4. A recommended investment amount assuming a total portfolio budget of $10,000.
        5. A brief 1-2 sentence rationale for the ranking.
        6. A specific Trade Execution Plan including:
           - Target Entry Price
           - Target Exit Price
           - Stop Loss Price
           - Expected Hold Time (e.g., "2-4 weeks", "3-6 months")
           - Risk Level ("Low", "Medium", "High")
        
        Market Data:
        ${JSON.stringify(marketData, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                name: { type: Type.STRING },
                rank: { type: Type.INTEGER },
                successRate: { type: Type.NUMBER, description: "Percentage value between 0 and 100" },
                profitPotential: { type: Type.NUMBER, description: "Percentage value" },
                recommendedInvestment: { type: Type.NUMBER, description: "Dollar amount out of $10,000" },
                rationale: { type: Type.STRING },
                targetEntry: { type: Type.NUMBER },
                targetExit: { type: Type.NUMBER },
                stopLoss: { type: Type.NUMBER },
                expectedHoldTime: { type: Type.STRING },
                riskLevel: { type: Type.STRING },
                price: { type: Type.NUMBER },
                changePercent: { type: Type.NUMBER },
                marketCap: { type: Type.NUMBER },
                peRatio: { type: Type.NUMBER }
              },
              required: ["symbol", "name", "rank", "successRate", "profitPotential", "recommendedInvestment", "rationale", "targetEntry", "targetExit", "stopLoss", "expectedHoldTime", "riskLevel", "price", "changePercent"]
            }
          }
        }
      });

      analysisResult = JSON.parse(response.text || "[]");
    } catch (aiError: any) {
      console.error("Gemini API Error:", aiError);
      console.warn("Falling back to raw market data due to AI error.");
      analysisResult = marketData.map((m, index) => ({
        symbol: m.symbol,
        name: m.name,
        rank: index + 1,
        successRate: 50,
        profitPotential: 5,
        recommendedInvestment: Math.floor(10000 / marketData.length),
        rationale: "AI analysis unavailable. Please check your Gemini API Key in AI Studio settings.",
        targetEntry: m.price,
        targetExit: m.price * 1.1,
        stopLoss: m.price * 0.9,
        expectedHoldTime: "N/A",
        riskLevel: "Unknown",
        price: m.price,
        changePercent: m.changePercent,
        marketCap: m.marketCap,
        peRatio: m.peRatio
      }));
    }
    
    const finalData = analysisResult.map((item: any) => {
      const raw = marketData.find(m => m.symbol === item.symbol);
      return { ...raw, ...item };
    });

    finalData.sort((a: any, b: any) => a.rank - b.rank);

    cachedAnalysis = finalData;
    lastFetchTime = Date.now();

    res.json(finalData);
  } catch (error: any) {
    console.error("Error fetching or analyzing data:", error);
    const errorMessage = error?.message || "Failed to analyze market data";
    res.status(500).json({ error: errorMessage, details: error?.toString() });
  }
});

// New Endpoint: Detailed Stock Information
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const modules = [
      'assetProfile', 'summaryDetail', 'financialData', 
      'defaultKeyStatistics', 'recommendationTrend', 'calendarEvents',
      'earnings', 'price', 'upgradeDowngradeHistory'
    ];
    
    let summary: any = {};
    try {
      summary = await yahooFinance.quoteSummary(symbol, { modules }, { validateResult: false });
    } catch (error: any) {
      if (error.name === "FailedYahooValidationError") {
        summary = error.result || {};
      } else {
        throw error;
      }
    }
    res.json(summary);
  } catch (error: any) {
    console.error(`Error fetching details for ${req.params.symbol}:`, error);
    res.status(500).json({ error: "Failed to fetch stock details" });
  }
});

// New Endpoint: Historical Data
app.get("/api/historical/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1y' } = req.query; // 1mo, 3mo, 6mo, 1y, 5y
    
    const period1 = new Date();
    if (range === '1mo') period1.setMonth(period1.getMonth() - 1);
    else if (range === '3mo') period1.setMonth(period1.getMonth() - 3);
    else if (range === '6mo') period1.setMonth(period1.getMonth() - 6);
    else if (range === '1y') period1.setFullYear(period1.getFullYear() - 1);
    else if (range === '5y') period1.setFullYear(period1.getFullYear() - 5);
    else period1.setFullYear(period1.getFullYear() - 1);

    let history: any[] = [];
    try {
      history = await yahooFinance.historical(symbol, { period1, interval: '1d' }, { validateResult: false });
      history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error: any) {
      if (error.name === "FailedYahooValidationError") {
        history = error.result || [];
        history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else {
        throw error;
      }
    }
    res.json(history);
  } catch (error: any) {
    console.error(`Error fetching history for ${req.params.symbol}:`, error);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// New Endpoint: News
app.get("/api/news/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    let searchResult: any = {};
    try {
      searchResult = await yahooFinance.search(symbol, { newsCount: 10 }, { validateResult: false });
    } catch (error: any) {
      if (error.name === "FailedYahooValidationError") {
        searchResult = error.result || {};
      } else {
        throw error;
      }
    }
    res.json(searchResult.news || []);
  } catch (error: any) {
    console.error(`Error fetching news for ${req.params.symbol}:`, error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Fetch historical data for a specific stock (for charts)
app.get("/api/history/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const queryOptions = { period1: '2023-01-01' }; // roughly 1 year
    
    let result: any[] = [];
    try {
      result = await yahooFinance.historical(symbol, queryOptions, { validateResult: false });
    } catch (error: any) {
      if (error.name === "FailedYahooValidationError") {
        console.warn(`Yahoo Finance validation error for ${symbol} historical data, using available data.`);
        result = error.result || [];
      } else {
        throw error;
      }
    }
    
    // Format for Recharts
    const chartData = result.map(d => ({
      date: d.date.toISOString().split('T')[0],
      price: d.close
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
