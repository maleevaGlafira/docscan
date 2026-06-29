import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

// Helper function to call Gemini API with robust retries and model fallbacks
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro", "gemini-3.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[OCR] Attempting with model: ${model} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: model,
        });
        if (response && response.text !== undefined) {
          console.log(`[OCR] Success with model: ${model} on attempt: ${attempt}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.error(`[OCR] Error with model ${model} (attempt ${attempt}):`, errMsg);

        // If it's an API key error, config issue, or invalid base64 (400), don't retry since it's client error
        const errStr = errMsg.toLowerCase();
        if (errStr.includes("400") || errStr.includes("invalid") || errStr.includes("api_key") || errStr.includes("not configured")) {
          break;
        }

        // Wait before retrying with exponential backoff (e.g. 1.5s, 3s)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 750;
          console.log(`[OCR] Waiting ${delay}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Failed to recognize text with all available models and retries");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini API
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API route for OCR using Gemini
  app.post("/api/recognize", async (req, res) => {
    try {
      const { images } = req.body; // Array of base64 data URLs

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const parts = images.map((dataUrl: string) => {
        // Handle images that start with "data:image/x;base64,"
        const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
        if (match) {
          return {
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          };
        }
        // Fallback if data is already raw base64 (assume png)
        return {
          inlineData: {
            mimeType: "image/png",
            data: dataUrl,
          },
        };
      });

      const promptPart = {
        text: "Extract all text from the provided images, correcting any grammar or spelling mistakes. Support English, Russian, and Ukrainian fluently. Convert and structure the output into clean, beautifully organized semantic HTML using tags like <h1>, <h2>, <p>, <strong>, <em>, <ul>, <ol>, <li>, and styled <table> elements (if tables are present in the source). Ensure proper nested tags and valid structure. Return ONLY the raw HTML body content without any markdown code blocks (such as ```html or ```), headers like <!DOCTYPE html>, <html>, or <body>, and no conversational prefaces or explanations.",
      };

      const response = await generateContentWithRetry(ai, {
        contents: { parts: [...parts, promptPart] },
        config: {
          temperature: 0.2, // Low temperature for more deterministic OCR results
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in endpoint:", error);
      const errMsg = error?.message || String(error);
      res.status(500).json({ 
        error: "Failed to recognize text using Gemini API.",
        details: errMsg
      });
    }
  });

  // Vite middleware for development or serving static files in production
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
