import test from "node:test";
import assert from "node:assert/strict";

import { fetchWithRetry } from "../scripts/src/http.js";

test("fetchWithRetry retries on transient network failure", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new TypeError("fetch failed");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const resp = await fetchWithRetry("https://example.com", {}, { context: "test", retries: 2 });
    assert.equal(resp.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchWithRetry error includes context and url", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };

  try {
    await assert.rejects(
      () => fetchWithRetry("https://example.com/x", {}, { context: "device auth", retries: 0 }),
      /device auth fetch failed.*https:\/\/example\.com\/x/s,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
