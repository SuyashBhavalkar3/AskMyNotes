import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fetch from "node-fetch";
import OpenAI from "openai";
import fs from "fs";
import os from "os";

/* ------------------------------------------------------------------ */
/* Environment & globals                                              */
/* ------------------------------------------------------------------ */

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception", err);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is missing. Backend cannot start.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* App setup                                                          */
/* ------------------------------------------------------------------ */

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = Number(process.env.PORT) || 5001;

/* ------------------------------------------------------------------ */
/* Health check                                                       */
/* ------------------------------------------------------------------ */

app.get("/", (_req, res) => {
  res.json({ status: "voice backend running" });
});

/* ------------------------------------------------------------------ */
/* Voice endpoint                                                     */
/* ------------------------------------------------------------------ */

app.post("/voice", upload.single("audio"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: "Audio file missing" });
  }

  const subject = req.body?.subject || "";

  // 1) STT: write buffer to temp file and stream to OpenAI as multipart
  const tmpDir = os.tmpdir();
  const origName = req.file.originalname || "upload.webm";
  const ext = origName.includes(".") ? origName.split(".").pop() : "webm";
  const tmpPath = join(tmpDir, `voice-upload-${Date.now()}.${ext}`);

  try {
    fs.writeFileSync(tmpPath, req.file.buffer);
  } catch (e) {
    console.error("failed to write temp file for STT", e);
    return res.status(500).json({ error: "Failed to prepare audio for transcription" });
  }

  let transcript = "";
  try {
    const stream = fs.createReadStream(tmpPath);
    try {
      const stt = await openai.audio.transcriptions.create({ file: stream, model: "gpt-4o-transcribe" });
      transcript = stt?.text || "";
    } finally {
      stream.close();
    }
  } catch (sttErr) {
    console.error("STT failed", sttErr);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (e) {}
    return res.status(502).json({ error: "Speech-to-text failed: " + (sttErr?.message || sttErr) });
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (e) {}
  }

  // 2) Optional: forward transcript to Python backend for an answer
  let responseText = transcript;
  try {
    const forwardHeaders = { "Content-Type": "application/json" };
    if (req.headers.authorization) forwardHeaders.authorization = req.headers.authorization;
    const pyResp = await fetch(`${process.env.PYTHON_API_BASE || "http://127.0.0.1:8000"}/api/doc/query`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ subject, question: transcript, top_k: 3 }),
    });
    if (pyResp.ok) {
      const data = await pyResp.json();
      responseText = data.answer || transcript;
    } else {
      const body = await pyResp.text();
      console.warn("Python query failed", pyResp.status, body);
    }
  } catch (e) {
    console.warn("Python backend unreachable, using transcript as response", e?.message || e);
  }

  // 3) TTS: request audio from OpenAI
  let audioBuffer;
  try {
    const ttsResp = await openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "alloy", input: responseText });
    if (ttsResp && typeof ttsResp.arrayBuffer === "function") {
      const arr = await ttsResp.arrayBuffer();
      audioBuffer = Buffer.from(arr);
    } else if (ttsResp && Symbol.asyncIterator in ttsResp) {
      const chunks = [];
      for await (const c of ttsResp) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      audioBuffer = Buffer.concat(chunks);
    } else if (ttsResp instanceof Buffer) {
      audioBuffer = ttsResp;
    } else {
      throw new Error("Unsupported TTS response from OpenAI SDK");
    }
  } catch (ttsErr) {
    console.error("TTS failed", ttsErr);
    return res.status(502).json({ error: "Text-to-speech failed: " + (ttsErr?.message || ttsErr) });
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(502).json({ error: "Empty audio generated" });
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", audioBuffer.length);
  res.setHeader("X-Transcript", transcript);
  res.setHeader("X-Response", responseText);
  return res.status(200).send(audioBuffer);
});

app.listen(PORT, () => {
  console.log(`Voice backend listening on http://localhost:${PORT}`);
});