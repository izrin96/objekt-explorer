import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { chat } from "@tanstack/ai";
import { createOllamaChat } from "@tanstack/ai-ollama";
import { and, eq, gte, ne } from "drizzle-orm";
import { ofetch } from "ofetch";

const CUTOFF = "2026-05-13T02:00:00.000Z";

async function urlToBase64(url: string): Promise<string> {
  const response = await ofetch(url, {
    responseType: "arrayBuffer",
  });
  return Buffer.from(response).toString("base64");
}

function replaceUrlSize(url: string, size: "4x" | "2x" | "thumbnail" | "original" = "2x") {
  return url.replace(/(4x|3x|2x|thumbnail|original)$/i, size);
}

export async function extractTextColor() {
  const records = await indexer
    .select({
      id: collections.id,
      frontImage: collections.frontImage,
      slug: collections.slug,
    })
    .from(collections)
    .where(and(gte(collections.createdAt, CUTOFF), ne(collections.artist, "idntt")));

  console.log(`[extract-text-color] Found ${records.length} collections to process`);

  for (const col of records) {
    try {
      const resized = replaceUrlSize(col.frontImage, "2x");
      const base64 = await urlToBase64(resized);

      const result = await chat({
        adapter: createOllamaChat("gemma3:27b-cloud", {
          host: "https://ollama.com",
          headers: {
            Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
          },
        }),
        stream: false,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                content:
                  "Extract text font color (not background color!) on the right sidebar. Only output hex code all uppercase.",
              },
              {
                type: "image",
                source: {
                  type: "data",
                  mimeType: "image/avif",
                  value: base64,
                },
              },
            ],
          },
        ],
      });

      const text = (result as string).trim();
      const hex = text.match(/^#[0-9A-F]{6}$/);
      if (hex) {
        await indexer
          .update(collections)
          .set({ textColor: hex[0] })
          .where(eq(collections.id, col.id));
        console.log(`[extract-text-color] Updated ${col.slug}: ${hex[0]}`);
      } else {
        console.warn(
          `[extract-text-color] Could not parse hex from response for ${col.slug}: "${text}"`,
        );
      }
    } catch (err) {
      console.error(`[extract-text-color] Failed for ${col.slug} (${col.frontImage}):`, err);
    }
  }

  console.log("[extract-text-color] Done");
}
