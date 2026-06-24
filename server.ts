import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with a large limit to accommodate image uploads (base64)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Heuristic rule-based fallback categorization for local testing and offline support
function getFallbackCategorization(desc: string) {
  const d = (desc || "").toLowerCase();
  let category = "Other";
  let department = "General Civic Ops";
  let severity: "Low" | "Medium" | "High" | "Critical" = "Medium";
  let urgencyScore = 50;
  
  if (d.includes("pothole") || d.includes("road") || d.includes("asphalt") || d.includes("street") || d.includes("pavement")) {
    category = "Pothole";
    department = "Road Maintenance";
    severity = "High";
    urgencyScore = 75;
  } else if (d.includes("garbage") || d.includes("trash") || d.includes("waste") || d.includes("litter") || d.includes("dump") || d.includes("rubbish")) {
    category = "Garbage";
    department = "Waste Management";
    severity = "Medium";
    urgencyScore = 45;
  } else if (d.includes("water") || d.includes("leak") || d.includes("pipe") || d.includes("burst") || d.includes("sprinkler")) {
    category = "Water Leakage";
    department = "Water Supply Dept";
    severity = "High";
    urgencyScore = 80;
  } else if (d.includes("light") || d.includes("dark") || d.includes("streetlight") || d.includes("bulb") || d.includes("lamp")) {
    category = "Broken Streetlight";
    department = "Streetlight Utility";
    severity = "Medium";
    urgencyScore = 55;
  } else if (d.includes("drain") || d.includes("sewer") || d.includes("overflow") || d.includes("flooding") || d.includes("clog") || d.includes("gutter")) {
    category = "Drainage Issue";
    department = "Drainage & Sewerage";
    severity = "Critical";
    urgencyScore = 90;
  } else if (d.includes("dog") || d.includes("cow") || d.includes("animal") || d.includes("stray") || d.includes("bite")) {
    category = "Stray Animals";
    department = "Animal Control";
    severity = "Low";
    urgencyScore = 30;
  }
  
  if (d.includes("urgent") || d.includes("emergency") || d.includes("dangerous") || d.includes("accident") || d.includes("injured") || d.includes("hazard")) {
    severity = "Critical";
    urgencyScore = Math.min(urgencyScore + 20, 100);
  }
  
  return {
    category,
    severity,
    department,
    summary: desc ? (desc.substring(0, 100) + (desc.length > 100 ? "..." : "")) : "Civic issue reported.",
    urgencyScore
  };
}

// Lazy Gemini client initializer
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// REST API endpoint: AI Categorization Proxy
app.post("/api/gemini-categorize", async (req, res) => {
  try {
    const { description, imageBase64 } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined in the environment. Using smart rule fallback.");
      return res.json(getFallbackCategorization(description));
    }

    const ai = getGeminiClient();
    const contents: any[] = [];
    
    const prompt = `Analyze this civic issue report. Description provided by citizen: "${description || 'No description provided.'}"
    
    Please categorize this report, predict its severity, and specify the department responsible.
    If an image is attached, inspect it to confirm the issue, refine severity, and summarize findings.
    
    You MUST return a strictly valid JSON object matching exactly this schema and nothing else:
    {
      "category": "Pothole" | "Garbage" | "Water Leakage" | "Broken Streetlight" | "Drainage Issue" | "Stray Animals" | "Other",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "department": "Road Maintenance" | "Waste Management" | "Water Supply Dept" | "Streetlight Utility" | "Drainage & Sewerage" | "Animal Control" | "General Civic Ops",
      "summary": "concise 1-sentence summary",
      "urgencyScore": number (integer from 0 to 100 representing priority)
    }
    
    Output only the raw JSON. Do not wrap in markdown blocks like \`\`\`json.`;

    contents.push(prompt);

    if (imageBase64) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        contents.push({
          inlineData: {
            data,
            mimeType
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = (response.text || "").trim();
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (parseError) {
      console.warn("Failed to parse Gemini direct response, trying to extract JSON block:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedMatch = JSON.parse(jsonMatch[0]);
        return res.json(parsedMatch);
      }
      throw new Error("Invalid format returned by AI model");
    }

  } catch (error: any) {
    console.error("Gemini classification failed:", error?.message || error);
    // Graceful fallback to rule-based analysis
    const fallback = getFallbackCategorization(req.body.description || "");
    return res.json(fallback);
  }
});

// Heuristic rule-based fallback insights for administrative overview
function getFallbackInsights(reports: any[]) {
  if (!reports || reports.length === 0) {
    return "No active complaints currently registered in the database queue to synthesize insights.";
  }
  
  const categoriesCount: Record<string, number> = {};
  let criticalCount = 0;
  
  reports.forEach(r => {
    categoriesCount[r.category] = (categoriesCount[r.category] || 0) + 1;
    if (r.severity === 'Critical' || r.severity === 'High') {
      criticalCount++;
    }
  });
  
  const sortedCategories = Object.entries(categoriesCount).sort((a, b) => b[1] - a[1]);
  const leadingCategory = sortedCategories[0]?.[0] || 'Civic complaints';
  const leadingCount = sortedCategories[0]?.[1] || 0;
  
  return `City audit analysis confirms a recurring spike in '${leadingCategory}' reports across mapped coordinate zones, representing ${leadingCount} total complaints. Additionally, there are ${criticalCount} active high-to-critical priority tickets awaiting municipal inspection.

Recommendation: Municipal departments should prioritize immediate structural inspections for areas showing clustered '${leadingCategory}' issues. Re-routing waste management routes or upgrading plumbing lines in high-frequency zones is strongly recommended to resolve systemic infrastructure fatigue.`;
}

// REST API endpoint: AI Hotspot Insights Compile
app.post("/api/gemini-insights", async (req, res) => {
  try {
    const { reports } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined in the environment. Using smart rule insights fallback.");
      return res.json({ insights: getFallbackInsights(reports) });
    }

    const ai = getGeminiClient();
    
    const prompt = `You are a Municipal Planner AI Assistant.
    Analyze this list of civic issue reports submitted by citizens:
    ${JSON.stringify(reports || [])}
    
    Please compile a high-quality, professional, 2-paragraph hotspot insight report.
    - Paragraph 1: Identify recurring complaints, hotspots, or clusters (e.g. lots of water leakages on specific streets).
    - Paragraph 2: Provide actionable engineering or municipal advice (e.g. recommend pipeline upgrades or targeted garbage collection schedules).
    
    Keep the report concise, professional, and factual.
    Return JSON: { "insights": "compiled insights text here" }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = (response.text || "").trim();
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (parseError) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return res.json(JSON.parse(jsonMatch[0]));
      }
      return res.json({ insights: text });
    }

  } catch (error: any) {
    console.error("Gemini insights compile failed:", error?.message || error);
    return res.json({ insights: getFallbackInsights(req.body.reports || []) });
  }
});

// App Health Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware integrated.");
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
