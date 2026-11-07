import express, { type ErrorRequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import morgan from "morgan";
import { GoogleGenAI, Type, type Schema } from "@google/genai";

const bind_ip = process.env.SERVER_BIND_IP;
if (!bind_ip) throw new Error("SERVER_BIND_IP is not set");

const bind_port = parseInt(process.env.SERVER_BIND_PORT || "");
if (!bind_port) throw new Error("SERVER_BIND_PORT is not set");

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not set");

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is not set");

const GOOGLE_GEN_AI_API_KEY = process.env.GOOGLE_GEN_AI_API_KEY;
if (!GOOGLE_GEN_AI_API_KEY) throw new Error("GOOGLE_GEN_AI_API_KEY is not set");

const ai = new GoogleGenAI({ apiKey: GOOGLE_GEN_AI_API_KEY });

const receiptSchema: Schema = {
  description: "List of items on the receipt.",
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: {
            type: Type.STRING,
            description: "Description of the item",
            nullable: false,
          },
          humanReadableDescription: {
            type: Type.STRING,
            description: "Human readable description of the item",
            nullable: false,
          },
          price: {
            type: Type.NUMBER,
            description: "Price of the item",
            nullable: false,
          },
        },
        required: ["description", "price", "humanReadableDescription"],
      },
    },
    currency: {
      type: Type.STRING,
      description: "Currency of the receipt (e.g. EUR, USD, GBP, etc.)",
      nullable: false,
    },
    date: {
      type: Type.STRING,
      description: "Date of the receipt, in the format YYYY-MM-DD.",
      nullable: false,
    },
    title: {
      type: Type.STRING,
      description:
        "Title of the expense (e.g. 'Dinner at the restaurant', 'Achats sur Amazon', 'Courses Carrefour')",
      nullable: false,
    },
  },
  required: ["items", "currency", "date", "title"],
};

const parseReceipt = async (receiptBase64: string) => {
  const prompt =
    "Parse this receipt. Returns the list of items with its price and description. Also add a human readable description of the item, the title of the expense, the date of the expense and the currency of the receipt. The output should be in French.";

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [
      prompt,
      { inlineData: { data: receiptBase64, mimeType: "image/jpeg" } },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned no text");
  }

  return JSON.parse(response.text);
};

const app = express();

app.use(morgan("tiny"));
app.use(express.json({ limit: "20mb" }));

const importLink = (env: "dev" | "preview" | "prod", groupId: string) => {
  switch (env) {
    case "dev":
      return `splitzy-dev://protected/groups/${groupId}/import`;
    case "preview":
      return `splitzy-preview://protected/groups/${groupId}/import`;
    case "prod":
      return `splitzy://protected/groups/${groupId}/import`;
  }
};

app.get("/dev/groups/:groupId/import", (req, res) => {
  const link = importLink("dev", req.params.groupId);
  res.redirect(link);
});

app.get("/preview/groups/:groupId/import", (req, res) => {
  const link = importLink("preview", req.params.groupId);
  res.redirect(link);
});

app.get("/groups/:groupId/import", (req, res) => {
  const link = importLink("prod", req.params.groupId);
  res.redirect(link);
});

app.post("/parse-receipt", async (req, res) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const accessToken = req.headers.authorization;
  const refreshToken = req.headers["x-refresh-token"];

  if (!accessToken || !refreshToken) {
    res.status(401).send("Unauthorized");
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken as string,
    refresh_token: refreshToken as string,
  });

  if (error) {
    res.status(401).send("Unauthorized");
    return;
  }

  const file = req.body?.file;

  if (typeof file !== "string" || file.length === 0) {
    res.status(400).json({ error: "Missing receipt image" });
    return;
  }

  const result = await parseReceipt(file);

  res.json(result);
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status =
    err?.expose && typeof err.status === "number" ? err.status : 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message,
  });
};

app.use(errorHandler);

// Supabase pauses free-tier projects after 7 days of inactivity.
// Ping the database once a day to keep the project alive.
const SUPABASE_KEEPALIVE_INTERVAL_MS =
  parseInt(process.env.SUPABASE_KEEPALIVE_INTERVAL_MS || "") ||
  24 * 60 * 60 * 1000;

const supabaseKeepAlive = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from("groups").select("id").limit(1);
    if (error) {
      console.error("Supabase keepalive failed:", error.message);
    } else {
      console.log("Supabase keepalive ok");
    }
  } catch (err) {
    console.error("Supabase keepalive failed:", err);
  }
};

app.listen(bind_port, bind_ip, () => {
  console.log(`Server is running on http://${bind_ip}:${bind_port}`);

  supabaseKeepAlive();
  setInterval(supabaseKeepAlive, SUPABASE_KEEPALIVE_INTERVAL_MS);
});
