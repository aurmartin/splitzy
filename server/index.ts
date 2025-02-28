import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import morgan from "morgan";
import {
  GoogleGenerativeAI,
  SchemaType,
  InlineDataPart,
} from "@google/generative-ai";

const host = process.env.SERVER_HOST;
if (!host) throw new Error("SERVER_HOST is not set");

const port = parseInt(process.env.SERVER_PORT || "");
if (!port) throw new Error("SERVER_PORT is not set");

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not set");

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is not set");

const GOOGLE_GEN_AI_API_KEY = process.env.GOOGLE_GEN_AI_API_KEY;
if (!GOOGLE_GEN_AI_API_KEY) throw new Error("GOOGLE_GEN_AI_API_KEY is not set");

const googleGenerativeAI = new GoogleGenerativeAI(GOOGLE_GEN_AI_API_KEY);

const model = googleGenerativeAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      description: "List of items on the receipt.",
      type: SchemaType.OBJECT,
      properties: {
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              description: {
                type: SchemaType.STRING,
                description: "Description of the item",
                nullable: false,
              },
              humanReadableDescription: {
                type: SchemaType.STRING,
                description: "Human readable description of the item",
                nullable: false,
              },
              price: {
                type: SchemaType.NUMBER,
                description: "Price of the item",
                nullable: false,
              },
            },
            required: ["description", "price", "humanReadableDescription"],
          },
        },
        currency: {
          type: SchemaType.STRING,
          description: "Currency of the receipt (e.g. EUR, USD, GBP, etc.)",
          nullable: false,
        },
        date: {
          type: SchemaType.STRING,
          description: "Date of the receipt, in the format YYYY-MM-DD.",
          nullable: false,
        },
        title: {
          type: SchemaType.STRING,
          description:
            "Title of the expense (e.g. 'Dinner at the restaurant', 'Achats sur Amazon', 'Courses Carrefour')",
          nullable: false,
        },
      },
      required: ["items", "currency", "date", "title"],
    },
  },
});

const parseReceipt = async (receiptBase64: string) => {
  const prompt =
    "Parse this receipt. Returns the list of items with its price and description. Also add a human readable description of the item, the title of the expense, the date of the expense and the currency of the receipt. The output should be in French.";

  const image: InlineDataPart = {
    inlineData: {
      data: receiptBase64,
      mimeType: "image/jpg",
    },
  };

  const result = await model.generateContent([prompt, image]);

  return JSON.parse(result.response.text());
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

  const receipt = req.body.file;

  const result = await parseReceipt(receipt);

  res.json(result);
});

app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
