import "server-only";
import { parseOutput, SYSTEM_PROMPT } from "@/lib/generation";

export async function generateText(prompt: string, field: "description" | "caption", image?: Buffer) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const parts: object[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: "image/webp", data: image.toString("base64") } });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(25000), cache: "no-store",
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: { maxOutputTokens: 1024, responseMimeType: "application/json",
        responseJsonSchema: { type: "object", properties: { [field]: { type: "string" } }, required: [field] } },
    }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "AI_BUSY" : "AI_FAILED");
  const result = await response.json();
  const candidate = result.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new Error("AI_OUTPUT");
  const text = candidate.content?.parts?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "").join("");
  return parseOutput(text || "", field);
}
