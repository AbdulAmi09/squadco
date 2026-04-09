import crypto from "crypto";

import { env } from "../lib/env.js";

type Level = "info" | "warning" | "error";

function getSentryEnvelopeUrl() {
  if (!env.sentryDsn) return null;
  try {
    const url = new URL(env.sentryDsn);
    const projectId = url.pathname.replace("/", "");
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username
    };
  } catch {
    return null;
  }
}

async function sendSentryEnvelope(payload: Record<string, unknown>) {
  const target = getSentryEnvelopeUrl();
  if (!target) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const headers = {
    event_id: eventId,
    sent_at: new Date().toISOString(),
    sdk: { name: "trustlayer-custom-monitor", version: "1.0.0" }
  };
  const item = { type: "event" };
  const body = `${JSON.stringify(headers)}\n${JSON.stringify(item)}\n${JSON.stringify({
    event_id: eventId,
    platform: "node",
    level: payload.level || "error",
    message: payload.message,
    extra: payload.extra || {},
    tags: payload.tags || {}
  })}`;

  await fetch(target.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-sentry-envelope",
      "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${target.publicKey}`
    },
    body
  }).catch(() => undefined);
}

export async function captureMessage(message: string, level: Level = "info", extra?: Record<string, unknown>) {
  console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](message, extra || {});
  await sendSentryEnvelope({ message, level, extra });
}

export async function captureException(error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message, extra || {}, error);
  await sendSentryEnvelope({
    message,
    level: "error",
    extra: {
      ...(extra || {}),
      stack: error instanceof Error ? error.stack : undefined
    }
  });
}
