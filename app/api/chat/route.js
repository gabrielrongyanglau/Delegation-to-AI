import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import {
  LAPTOPS,
  OUTPUTS,
  REQUIREMENTS,
  fmtWeight,
} from "../../../lib/study";

// fs isn't available on the edge runtime, and the prompt is read from disk.
export const runtime = "nodejs";

// Constructed on first request, not at module scope: the OpenAI client throws
// when the key is absent, and module scope is evaluated during `next build`.
let client;
function getClient() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// ─── Settings (environment variables) ────────────────────────────────────────
// OPENAI_MODEL        Model id, exactly as your OpenAI account lists it.
// OPENAI_TEMPERATURE  Only sent when set. Several reasoning models reject it.
// OPENAI_SEED         Only sent when set.
// OUTPUT_MODE         verified (default) | model | fixed
//   verified  Ask the model; show its reply if it matches the scripted text
//             exactly, otherwise show the scripted text. Every participant
//             sees identical wording; `source` records which happened.
//   model     Ask the model and show whatever it returns.
//   fixed     Do not call the model; show the scripted text. For piloting
//             the survey flow without an API key.
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";
const TEMPERATURE = process.env.OPENAI_TEMPERATURE;
const SEED = process.env.OPENAI_SEED;
const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS ?? 1000);
const OUTPUT_MODE = ["verified", "model", "fixed"].includes(process.env.OUTPUT_MODE)
  ? process.env.OUTPUT_MODE
  : "verified";
// ─────────────────────────────────────────────────────────────────────────────

// Each step the page can request: the task briefing it needs, then the
// instruction for this reply.
const STEPS = {
  recommend: ["LAPTOP_TASK", "RECOMMEND"],
  reconsider: ["LAPTOP_TASK", "RECONSIDER"],
};

const SECTIONS = (() => {
  const raw = fs.readFileSync(path.join(process.cwd(), "CHATBOT_PROMPT.txt"), "utf8");
  const text = raw
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const sections = {};
  const parts = text.split(/^===\s*([A-Z0-9_]+)\s*===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1].trim();
  for (const name of ["STYLE", ...new Set(Object.values(STEPS).flat())]) {
    if (!sections[name]) throw new Error(`CHATBOT_PROMPT.txt is missing the ${name} section`);
  }
  return sections;
})();

const describeLaptop = (l) =>
  `- ${l.name}: £${l.price}, ${l.os}, ${l.memoryGb} GB memory, ${l.storage} storage, ${l.batteryH} h battery, ${fmtWeight(l.weightKg)}, HDMI port: ${l.hdmi ? "Yes" : "No"}`;

function fill(template, values) {
  return template.replace(/\{([A-Z_]+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

// Compare ignoring whitespace runs and curly versus straight quotes, which
// models vary on without changing what the participant reads.
const normalise = (s) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const fail = (status, error) => Response.json({ error }, { status, headers: CORS });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON body.");
  }

  const step = body?.step;
  if (!(step in STEPS)) return fail(400, "Unknown step.");

  const expected = OUTPUTS[step];

  if (OUTPUT_MODE === "fixed") {
    return Response.json({ reply: expected, source: "fixed", model: null }, { headers: CORS });
  }

  const [taskSection, stepSection] = STEPS[step];
  const system = [SECTIONS[taskSection], SECTIONS.STYLE, SECTIONS[stepSection]]
    .map((s) =>
      fill(s, {
        REQUIREMENTS: REQUIREMENTS.map((r) => `- ${r.label}: ${r.text}`).join("\n"),
        LAPTOPS: LAPTOPS.map(describeLaptop).join("\n"),
        EXPECTED: expected,
      }),
    )
    .join("\n\n");

  const params = {
    model: MODEL,
    max_completion_tokens: MAX_TOKENS,
    messages: [{ role: "system", content: system }],
  };
  if (TEMPERATURE !== undefined && TEMPERATURE !== "") params.temperature = Number(TEMPERATURE);
  if (SEED !== undefined && SEED !== "") params.seed = Number(SEED);

  let generated = "";
  try {
    const completion = await getClient().chat.completions.create(params);
    generated = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("chat route: model call failed:", err);
    if (OUTPUT_MODE === "model") return fail(502, "The Decision Agent is unavailable right now.");
    return Response.json({ reply: expected, source: "fallback_error", model: MODEL }, { headers: CORS });
  }

  const matches = normalise(generated) === normalise(expected);
  if (OUTPUT_MODE === "model") {
    if (!generated) return fail(502, "The Decision Agent returned an empty reply.");
    return Response.json(
      { reply: generated, source: matches ? "model" : "model_unmatched", model: MODEL },
      { headers: CORS },
    );
  }

  if (!matches) console.warn(`chat route: ${step} reply did not match the scripted text:`, generated);
  return Response.json(
    { reply: matches ? generated : expected, source: matches ? "model" : "fallback_mismatch", model: MODEL },
    { headers: CORS },
  );
}
