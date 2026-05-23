/**
 * Generates the Mode 2 sample-call audio — one OpenAI-TTS clip per line into
 * public/audio/lines/. Wired into the `build` script, so it runs at deploy
 * time on Vercel using OPENAI_API_KEY from the project environment.
 *
 * Uses gpt-4o-mini-tts (natural, steerable) with retries, and only falls back
 * to the older tts-1 if that model genuinely fails. Always exits 0 — a missing
 * key, already-present clips, or an API error just skip generation so the build
 * never breaks (Mode 2 falls back to a typed walkthrough when clips are absent).
 *
 * Run manually:  OPENAI_API_KEY=sk-... node scripts/generate-sample-audio.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "audio", "lines");
const clipPath = (i) =>
  join(outDir, `line-${String(i + 1).padStart(2, "0")}.mp3`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Voice + delivery direction per speaker role. */
const VOICE = {
  agent: {
    voice: "coral", // gpt-4o-mini-tts
    fallbackVoice: "shimmer", // tts-1
    instructions:
      "You are Sarah, a friendly, upbeat lead specialist at a busy real " +
      "estate office. Delivery: brisk and efficient — a lively, natural " +
      "conversational pace, never slow or drawn out. Warm and confident.",
  },
  user: {
    voice: "verse", // gpt-4o-mini-tts
    fallbackVoice: "onyx", // tts-1
    instructions:
      "You are a prospective home buyer on a phone call. Delivery: natural " +
      "and fairly quick — a normal, relaxed everyday phone-conversation pace. " +
      "Casual and expressive, not stiff or monotone.",
  },
};

/** Renders one line — tries gpt-4o-mini-tts with retries, then tts-1. */
async function synth(openai, cfg, content) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const speech = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: cfg.voice,
        input: content,
        instructions: cfg.instructions,
        response_format: "mp3",
      });
      return {
        buffer: Buffer.from(await speech.arrayBuffer()),
        model: "gpt-4o-mini-tts",
      };
    } catch (err) {
      console.warn(
        `[sample-audio] gpt-4o-mini-tts attempt ${attempt} failed: ${
          err?.message ?? err
        }`
      );
      if (attempt < 3) await sleep(attempt * 2500);
    }
  }
  // Fallback — broadly available, but noticeably more robotic.
  const speech = await openai.audio.speech.create({
    model: "tts-1",
    voice: cfg.fallbackVoice,
    input: content,
    response_format: "mp3",
  });
  return { buffer: Buffer.from(await speech.arrayBuffer()), model: "tts-1" };
}

async function main() {
  const lines = JSON.parse(
    readFileSync(join(root, "lib", "sample-call-script.json"), "utf8")
  );

  if (lines.every((_, i) => existsSync(clipPath(i)))) {
    console.log("[sample-audio] clips already present — skipping generation.");
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "[sample-audio] OPENAI_API_KEY not set — skipping (Mode 2 uses the typed fallback)."
    );
    return;
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < lines.length; i++) {
    const { role, content } = lines[i];
    const num = String(i + 1).padStart(2, "0");
    const { buffer, model } = await synth(openai, VOICE[role], content);
    writeFileSync(clipPath(i), buffer);
    console.log(`[sample-audio] ${num}/${lines.length} (${role}, ${model})`);
    await sleep(400); // ease off the rate limiter between calls
  }
  console.log("[sample-audio] done.");
}

main().catch((err) => {
  console.warn(
    "[sample-audio] generation failed — Mode 2 will use the typed fallback."
  );
  console.warn(String(err?.message ?? err));
});
