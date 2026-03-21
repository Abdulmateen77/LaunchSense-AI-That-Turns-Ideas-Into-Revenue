import { API_BASE_URL } from "./api.js";
import { normalizeStreamFrame } from "./contracts.js";
import { isMockMode, isSseDebugEnabled } from "./runtimeConfig.js";
import { mockStreamGeneration } from "../mocks/mockBackend.js";

export async function consumeFrames(buffer, onFrame) {
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";

  for (const frame of frames) {
    const lines = frame.split(/\r?\n/);
    const payload = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!payload) {
      continue;
    }

    const parsed = normalizeStreamFrame(JSON.parse(payload));
    await onFrame(parsed);
  }

  return remainder;
}

export async function streamGeneration(payload, { signal, onEvent } = {}) {
  const debugEnabled = isSseDebugEnabled();

  if (isMockMode()) {
    await mockStreamGeneration(payload, { signal, onEvent });
    return;
  }

  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok || !response.body) {
    throw new Error("Generation stream failed to start");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let framesSeen = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = await consumeFrames(buffer, async (frame) => {
        framesSeen += 1;

        if (debugEnabled && typeof console !== "undefined") {
          console.info("SSE event:", frame.event, frame.data);
        }

        if (!frame.known && typeof console !== "undefined" && import.meta.env?.DEV) {
          console.info("Ignoring unknown SSE event:", frame.event, frame.data);
        }

        if (onEvent) {
          await onEvent(frame.event, frame.data, frame);
        }
      });
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      await consumeFrames(`${buffer}\n\n`, async (frame) => {
        framesSeen += 1;

        if (debugEnabled && typeof console !== "undefined") {
          console.info("SSE event:", frame.event, frame.data);
        }

        if (!frame.known && typeof console !== "undefined" && import.meta.env?.DEV) {
          console.info("Ignoring unknown SSE event:", frame.event, frame.data);
        }

        if (onEvent) {
          await onEvent(frame.event, frame.data, frame);
        }
      });
    }

    if (framesSeen === 0) {
      throw new Error("Generation stream ended without emitting any events.");
    }
  } finally {
    reader.releaseLock();
  }
}
