import { test, mock } from "node:test";
import assert from "node:assert/strict";
import worker, {
  analyze,
  explanationSchema,
  validateExplanation,
  type Bindings,
} from "../src/core/api";
import {
  cents,
  expectedValue,
  reconcile,
  type Observation,
} from "../src/core/reconcile";
import { fixture, scenarios } from "../src/core/fixtures";
import { readPaypalOrder, PAYPAL_ORIGIN } from "../src/core/paypal";
const expected = {
  invoiceId: "INV-100",
  amount: "0.30",
  currency: "USD" as const,
};
const observation: Observation = {
  id: "ORDER12345678",
  status: "COMPLETED",
  invoiceIds: ["INV-100"],
  captures: [
    {
      id: "CAPTURE123456",
      status: "COMPLETED",
      amount: "0.30",
      currency: "USD",
    },
  ],
};
const rule = (o: Observation = observation) =>
  reconcile(expected, structuredClone(o), "fixture", "adversarial");
const fx = (id: string) => {
  const f = fixture(id)!;
  return reconcile(f.expected, f.observation, "fixture", id);
};
const req = (body: unknown, path = "/api/reconcile", extra: HeadersInit = {}) =>
  new Request(`https://settleproof.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
const gate = { limit: async () => ({ success: true }) };
const budget = {
  getByName: () => ({
    reserve: async () => ({ allowed: true, remaining: 19 }),
  }),
};
const secrets = {
  PAYPAL_CLIENT_ID: "test-only-id",
  PAYPAL_CLIENT_SECRET: "test-only-secret",
};

test("integer cents avoid the 0.1 + 0.2 floating point trap", () =>
  assert.equal(cents("0.10") + cents("0.20"), cents("0.30")));
test("reject negative, huge, exponential and fractional-cent amounts", () => {
  for (const v of ["-1.00", "1e3", "1.001", "100000000.00", "NaN", "01.00", 1])
    assert.throws(() => cents(v));
});
test("reject zero, unsupported currency and unsafe invoice input", () => {
  for (const value of [
    { ...expected, amount: "0.00" },
    { ...expected, currency: "JPY" },
    { ...expected, invoiceId: "person@example.com" },
  ])
    assert.throws(() => expectedValue(value));
});
test("completed unique capture reconciles paid", () => {
  assert.equal(rule().outcome, "paid");
  assert.equal(rule().totals.net, "0.30");
});
test("APPROVED without captures is not paid", () => {
  assert.equal(fx("approved").outcome, "unpaid");
  assert.equal(fx("approved").totals.paid, "0.00");
});
test("partial capture preserves remaining cents", () => {
  assert.equal(fx("partial").outcome, "partial");
  assert.equal(fx("partial").totals.remaining, "75.00");
});
test("duplicate capture counted once and marked review", () => {
  const a = fx("duplicate");
  assert.equal(a.totals.paid, "120.00");
  assert.equal(a.captures.length, 1);
  assert.equal(a.outcome, "review");
});
test("currency mismatch blocks numeric reconciliation", () => {
  assert.equal(fx("currency").outcome, "review");
  assert.equal(fx("currency").totals.net, null);
});
test("invoice mismatch cannot authorize a paid conclusion", () => {
  assert.equal(fx("invoice").outcome, "review");
  assert.equal(fx("invoice").totals.paid, null);
});
test("partial-refund total remains unknown", () => {
  const a = fx("refund");
  assert.equal(a.outcome, "review");
  assert.equal(a.totals.refunded, null);
  assert.equal(a.totals.remaining, null);
});
test("unavailable provider observation remains unknown", () => {
  assert.equal(fx("unavailable").outcome, "unknown");
  assert.equal(fx("unavailable").totals.paid, null);
});
test("fully refunded capture is reviewed with zero net", () => {
  const o = structuredClone(observation);
  o.captures[0].status = "REFUNDED";
  const a = rule(o);
  assert.equal(a.outcome, "review");
  assert.equal(a.totals.refunded, "0.30");
  assert.equal(a.totals.net, "0.00");
});
test("pending and unexpected capture statuses fail closed", () => {
  for (const status of ["PENDING", "FUTURE_STATUS"]) {
    const o = structuredClone(observation);
    o.captures[0].status = status;
    assert.equal(rule(o).totals.net, null);
  }
});
test("conflicting duplicate evidence cannot yield confident totals", () => {
  const o = structuredClone(observation);
  o.captures.push({ ...o.captures[0], amount: "0.10" });
  assert.equal(rule(o).totals.net, null);
  assert.equal(rule(o).outcome, "review");
});
test("overpayment reviewed rather than negative remaining", () => {
  const o = structuredClone(observation);
  o.captures[0].amount = "0.40";
  assert.equal(rule(o).outcome, "review");
  assert.equal(rule(o).totals.remaining, "0.00");
});
test("all fixture findings resolve evidence and identify synthetic sources", () => {
  assert.equal(scenarios.length, 8);
  for (const s of scenarios) {
    const a = fx(s.id),
      ids = new Set(a.evidence.map((e) => e.id));
    for (const f of a.findings)
      assert.ok(f.evidenceIds.every((id) => ids.has(id)));
    assert.ok(
      a.evidence.every(
        (e) =>
          e.source.includes("Synthetic") ||
          e.source === "SettleProof deterministic rules",
      ),
    );
  }
});
test("EUR and GBP use the same deterministic two-place arithmetic", () => {
  for (const currency of ["EUR", "GBP"] as const) {
    const o = structuredClone(observation);
    o.captures[0].currency = currency;
    assert.equal(
      reconcile({ ...expected, currency }, o, "fixture", "fx").outcome,
      "paid",
    );
  }
});
test("COMPLETED order lacking capture evidence cannot be marked paid", () =>
  assert.equal(rule({ ...observation, captures: [] }).totals.net, null));
test("configuration exposes capabilities, never credentials", async () => {
  const r = await worker.fetch(
    new Request("https://settleproof.test/api/config"),
    secrets,
  );
  const body = await r.json();
  assert.deepEqual(body, {
    paypalConfigured: true,
    aiConfigured: false,
    paypalEnvironment: "sandbox",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  });
  assert.ok(!JSON.stringify(body).includes("test-only"));
});
test("scenario metadata and eight fixture POSTs work without AI/provider", async () => {
  const list = await worker.fetch(
    new Request("https://settleproof.test/api/scenarios"),
    {},
  );
  assert.equal(
    ((await list.json()) as { scenarios: unknown[] }).scenarios.length,
    8,
  );
  for (const s of scenarios)
    assert.equal(
      (await worker.fetch(req({ mode: "fixture", scenarioId: s.id }), {}))
        .status,
      200,
    );
});
test("foreign browser origins and cross-site requests are rejected", async () => {
  for (const [header, value] of [
    ["origin", "https://evil.test"],
    ["sec-fetch-site", "cross-site"],
  ] as const)
    assert.equal(
      (
        await worker.fetch(
          req({ mode: "fixture", scenarioId: "paid" }, "/api/reconcile", {
            [header]: value,
          }),
          {},
        )
      ).status,
      403,
    );
});
test("client-supplied analysis and arbitrary URLs are not accepted", async () => {
  for (const body of [
    { mode: "fixture", scenarioId: "paid", analysis: { outcome: "paid" } },
    { mode: "sandbox", orderId: "https://evil.test", expected },
  ])
    assert.equal((await worker.fetch(req(body), {})).status, 400);
});
test("large JSON, wrong content type and malformed JSON are rejected", async () => {
  assert.equal(
    (await worker.fetch(req({ junk: "x".repeat(9000) }), {})).status,
    413,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://settleproof.test/api/reconcile", {
          method: "POST",
          body: "{}",
        }),
        {},
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://settleproof.test/api/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{broken",
        }),
        {},
      )
    ).status,
    400,
  );
});
test("unset PayPal secrets give a clear 503, not unpaid evidence", async () => {
  const r = await worker.fetch(
    req({ mode: "sandbox", orderId: observation.id, expected }),
    {},
  );
  assert.equal(r.status, 503);
  assert.equal(
    ((await r.json()) as { code: string }).code,
    "PAYPAL_NOT_CONFIGURED",
  );
});
test("explain recomputes fixture analysis and explicitly reports unavailable AI", async () => {
  const r = await worker.fetch(
    req({ mode: "fixture", scenarioId: "partial" }, "/api/explain"),
    {},
  );
  const data = (await r.json()) as {
    analysis: { outcome: string };
    ai: { status: string; draft: string };
  };
  assert.equal(data.analysis.outcome, "partial");
  assert.equal(data.ai.status, "unavailable");
  assert.equal(data.ai.draft, "");
});
test("AI accepts only valid cited output consistent with deterministic outcome", () => {
  const a = rule(),
    valid = {
      outcome: "paid",
      text: "The captured total matches [result.net].",
      draft: "Review the record [result.outcome].",
      evidenceIds: ["result.net", "result.outcome"],
    };
  assert.equal(
    validateExplanation({ response: JSON.stringify(valid) }, a).status,
    "generated",
  );
  for (const bad of [
    { ...valid, evidenceIds: ["fabricated"] },
    { ...valid, outcome: "unpaid" },
    { ...valid, text: "Paid 999.00 [result.net]." },
    { ...valid, text: "person@example.com [result.net]" },
  ])
    assert.equal(
      validateExplanation({ response: JSON.stringify(bad) }, a).status,
      "invalid",
    );
});
test("AI call is bounded, protected and never faked", async () => {
  let calls = 0;
  const env: Bindings = {
    AI_ENABLED: "true",
    AI_RATE: gate,
    AI_SHARED_RATE: gate,
    AI_BUDGET: budget,
    AI: {
      run: async (_model, input) => {
        calls++;
        assert.equal(input.max_tokens, 450);
        return {
          response: JSON.stringify({
            outcome: "paid",
            text: "Matches [result.net].",
            draft: "Review [result.outcome].",
            evidenceIds: ["result.net", "result.outcome"],
          }),
        };
      },
    },
  };
  const r = await worker.fetch(
    req({ mode: "fixture", scenarioId: "paid" }, "/api/explain"),
    env,
  );
  assert.equal(
    ((await r.json()) as { ai: { status: string } }).ai.status,
    "generated",
  );
  assert.equal(calls, 1);
  env.AI_RATE = { limit: async () => ({ success: false }) };
  assert.equal(
    (
      await worker.fetch(
        req({ mode: "fixture", scenarioId: "paid" }, "/api/explain"),
        env,
      )
    ).status,
    429,
  );
  assert.equal(calls, 1);
});
test("sandbox adapter reads fresh captures, strips PII and never follows provider URLs", async () => {
  const calls: { url: string; method: string }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method || "GET" });
    assert.ok(url.startsWith(PAYPAL_ORIGIN));
    assert.equal(init?.redirect, "error");
    if (url.endsWith("/token"))
      return Response.json({ access_token: "mock-provider-token" });
    if (url.includes("/checkout/orders/"))
      return Response.json({
        id: observation.id,
        status: "COMPLETED",
        payer: { email_address: "private@example.com" },
        purchase_units: [
          {
            invoice_id: expected.invoiceId,
            payments: {
              captures: [
                { id: observation.captures[0].id, status: "COMPLETED" },
              ],
            },
          },
        ],
        links: [{ href: "https://evil.test" }],
      });
    return Response.json({
      id: observation.captures[0].id,
      status: "PARTIALLY_REFUNDED",
      amount: { value: "0.30", currency_code: "USD" },
      payee: { email_address: "private@example.com" },
    });
  };
  const data = await readPaypalOrder(observation.id, secrets, fetcher);
  assert.equal(data.captures[0].status, "PARTIALLY_REFUNDED");
  assert.ok(!JSON.stringify(data).includes("private@"));
  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((c) => c.method),
    ["POST", "GET", "GET"],
  );
});
test("provider failures and redirects cannot produce fabricated unpaid status", async () => {
  for (const status of [401, 404, 429, 500, 302])
    await assert.rejects(
      readPaypalOrder(
        observation.id,
        secrets,
        async () => new Response("private upstream message", { status }),
      ),
      /could not be read/,
    );
});
test("sandbox API returns sanitized upstream failure without client secrets", async () => {
  const stub = mock.method(globalThis, "fetch", async () => {
    throw new Error("private@example.com provider-secret");
  });
  try {
    const response = await worker.fetch(
      req({ mode: "sandbox", orderId: observation.id, expected }),
      { ...secrets, API_RATE: gate },
    );
    assert.equal(response.status, 502);
    assert.ok(!/private@|provider-secret/.test(await response.text()));
  } finally {
    stub.mock.restore();
  }
});
test("analyze rejects missing fixture and sandbox amount precision before inference", async () => {
  await assert.rejects(analyze({ mode: "fixture", scenarioId: "missing" }, {}));
  assert.equal(
    (
      await worker.fetch(
        req({
          mode: "sandbox",
          orderId: observation.id,
          expected: { ...expected, amount: "0.301" },
        }),
        secrets,
      )
    ).status,
    400,
  );
});
test("fresh capture association cannot switch invoice or order", async () => {
  for (const replacement of [
    { invoice_id: "ANOTHER-INVOICE" },
    { supplementary_data: { related_ids: { order_id: "OTHERORDER123" } } },
  ]) {
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      assert.equal(new URL(url).origin, PAYPAL_ORIGIN);
      if (url.endsWith("/token"))
        return Response.json({ access_token: "mock" });
      if (url.includes("/checkout/orders/"))
        return Response.json({
          id: observation.id,
          status: "COMPLETED",
          purchase_units: [
            {
              invoice_id: expected.invoiceId,
              payments: { captures: [{ id: observation.captures[0].id }] },
            },
          ],
        });
      return Response.json({
        id: observation.captures[0].id,
        status: "COMPLETED",
        amount: { value: "0.30", currency_code: "USD" },
        ...replacement,
      });
    };
    await assert.rejects(
      readPaypalOrder(observation.id, secrets, fetcher),
      /different order or invoice/,
    );
  }
});
test("AI provider errors return unavailable without leaking upstream messages", async () => {
  const r = await worker.fetch(
    req({ mode: "fixture", scenarioId: "paid" }, "/api/explain"),
    {
      AI_ENABLED: "true",
      AI_RATE: gate,
      AI_SHARED_RATE: gate,
      AI_BUDGET: budget,
      AI: {
        run: async () => {
          throw new Error("private@example.com secret");
        },
      },
    },
  );
  const text = await r.text();
  assert.ok(text.includes('"status":"unavailable"'));
  assert.ok(!text.includes("private@"));
});
test("wrong-currency model output is rejected even with valid citations", () =>
  assert.equal(
    validateExplanation(
      {
        response: JSON.stringify({
          outcome: "paid",
          text: "Received EUR 0.30 [result.net].",
          draft: "",
          evidenceIds: ["result.net"],
        }),
      },
      rule(),
    ).status,
    "invalid",
  ));
test("unrecognized JSON content type is not accepted as application/json", async () =>
  assert.equal(
    (
      await worker.fetch(
        req({ mode: "fixture", scenarioId: "paid" }, "/api/reconcile", {
          "content-type": "application/jsonx",
        }),
        {},
      )
    ).status,
    415,
  ));
test("unverified refund records prevent a confident remaining balance", () => {
  const a = rule({ ...observation, refundDataUnknown: true });
  assert.equal(a.outcome, "review");
  assert.equal(a.totals.paid, "0.30");
  assert.equal(a.totals.refunded, null);
  assert.equal(a.totals.remaining, null);
});
test("invoice expectations and derived results have honest evidence provenance", () => {
  const a = reconcile(expected, observation, "paypal-sandbox", "provenance");
  assert.ok(
    a.evidence
      .filter((e) => e.id.startsWith("expected."))
      .every((e) => e.source.startsWith("User-entered")),
  );
  assert.ok(
    a.evidence
      .filter((e) => e.id.startsWith("result."))
      .every((e) => e.source === "SettleProof deterministic rules"),
  );
  assert.equal(
    a.evidence.find((e) => e.id === "order.status")?.source,
    "PayPal sandbox read API",
  );
});
test("duplicate finding retains the repeated ID as explicit evidence", () => {
  const a = fx("duplicate"),
    finding = a.findings.find((f) => f.title === "Duplicate capture ID")!;
  const cited = finding.evidenceIds.map((id) =>
    a.evidence.find((e) => e.id === id)!,
  );
  assert.ok(cited.some((e) => e.label === "Repeated capture identifier"));
  assert.equal(cited[0].value, cited[1].value);
});
test("AI rejects fabricated integers, signs, exponent values and contradictory prose", () => {
  const valid = {
    outcome: "paid",
    text: "Matches [result.net].",
    draft: "",
    evidenceIds: ["result.net"],
  };
  for (const text of [
    "Received $999 [result.net].",
    "Received 999 dollars [result.net].",
    "Received +0.30 [result.net].",
    "Received 1e3 [result.net].",
    "This invoice is unpaid [result.net].",
    "Payment is still overdue [result.net].",
  ])
    assert.equal(
      validateExplanation(
        { response: JSON.stringify({ ...valid, text }) },
        rule(),
      ).status,
      "invalid",
    );
  const unknown = fx("unavailable");
  assert.equal(
    validateExplanation(
      {
        response: JSON.stringify({
          ...valid,
          outcome: "unknown",
          text: "This invoice is fully paid [result.net].",
        }),
      },
      unknown,
    ).status,
    "invalid",
  );
});
test("daily quota denial and budget failure start no inference", async () => {
  let calls = 0;
  const env: Bindings = {
    AI_ENABLED: "true",
    AI_RATE: gate,
    AI_SHARED_RATE: gate,
    AI_BUDGET: {
      getByName: () => ({
        reserve: async () => ({ allowed: false, remaining: 0 }),
      }),
    },
    AI: {
      run: async () => {
        calls++;
        return {};
      },
    },
  };
  const response = await worker.fetch(
    req({ mode: "fixture", scenarioId: "paid" }, "/api/explain"),
    env,
  );
  assert.equal(response.status, 429);
  assert.equal(
    ((await response.json()) as { code: string }).code,
    "AI_DAILY_QUOTA",
  );
  env.AI_BUDGET = {
    getByName: () => ({
      reserve: async () => {
        throw new Error("storage unavailable");
      },
    }),
  };
  const failure = await worker.fetch(
    req({ mode: "fixture", scenarioId: "paid" }, "/api/explain"),
    env,
  );
  assert.equal(
    ((await failure.json()) as { ai: { status: string } }).ai.status,
    "unavailable",
  );
  assert.equal(calls, 0);
});
test("documented envelopes and direct schema objects receive the same strict validation", () => {
  const valid = {
    outcome: "paid",
    text: "Matches [result.net].",
    draft: "",
    evidenceIds: ["result.net"],
  };
  for (const raw of [
    valid,
    { response: valid },
    { response: JSON.stringify(valid) },
  ])
    assert.equal(validateExplanation(raw, rule()).status, "generated");
  for (const raw of [
    { ...valid, outcome: "unpaid" },
    { response: { ...valid, evidenceIds: ["invented"] } },
  ])
    assert.equal(validateExplanation(raw, rule()).status, "invalid");
});
test("explicit negative full-payment phrasing does not become a positive paid assertion", () => {
  for (const phrase of [
    "not paid in full",
    "has not been paid in full",
    "not fully paid",
    "has not yet been fully captured",
  ]) {
    const text = `The invoice ${phrase} [result.net].`;
    const valid = {
      outcome: "partial",
      text,
      draft: "",
      evidenceIds: ["result.net"],
    };
    assert.equal(validateExplanation(valid, fx("partial")).status, "generated");
    assert.equal(
      validateExplanation({ ...valid, outcome: "paid" }, rule()).status,
      "invalid",
    );
  }
  assert.equal(
    validateExplanation(
      {
        outcome: "partial",
        text: "It is not paid in full, but it is fully paid [result.net].",
        draft: "",
        evidenceIds: ["result.net"],
      },
      fx("partial"),
    ).status,
    "invalid",
  );
});
test("explanation schema restricts required keys, exact outcome and known evidence IDs", () => {
  const a = fx("partial"),
    schema = explanationSchema(a);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    "text",
    "draft",
    "evidenceIds",
    "outcome",
  ]);
  assert.deepEqual(schema.properties.outcome.enum, ["partial"]);
  assert.deepEqual(
    schema.properties.evidenceIds.items.enum,
    a.evidence.map((e) => e.id),
  );
  assert.equal(schema.properties.text.maxLength, 800);
});
test("rejection diagnostics contain constant reasons without raw output or errors", () => {
  const logs: unknown[][] = [];
  const stub = mock.method(console, "warn", (...args: unknown[]) => {
    logs.push(args);
  });
  try {
    validateExplanation(
      { response: "private@example.com invalid-json secret" },
      rule(),
    );
    validateExplanation(
      {
        outcome: "paid",
        text: "Received 999 [result.net].",
        draft: "",
        evidenceIds: ["result.net"],
      },
      rule(),
    );
    assert.deepEqual(logs, [
      ["Workers AI explanation rejected", { reason: "json" }],
      ["Workers AI explanation rejected", { reason: "number" }],
    ]);
    assert.ok(!JSON.stringify(logs).includes("private@"));
  } finally {
    stub.mock.restore();
  }
});
test("explain sends the constrained schema and accepts valid directly returned JSON", async () => {
  const response = await worker.fetch(
    req({ mode: "fixture", scenarioId: "partial" }, "/api/explain"),
    {
      AI_ENABLED: "true",
      AI_RATE: gate,
      AI_SHARED_RATE: gate,
      AI_BUDGET: budget,
      AI: {
        run: async (_model, input) => {
          assert.equal(input.response_format?.type, "json_schema");
          assert.deepEqual(
            input.response_format?.json_schema,
            explanationSchema(await analyze({ mode: "fixture", scenarioId: "partial" }, {})),
          );
          return {
            outcome: "partial",
            text: "Captured 45.00 USD; remaining 75.00 USD.",
            draft: "Review the remaining capture evidence.",
            evidenceIds: ["result.paid", "result.remaining", "result.outcome"],
          };
        },
      },
    },
  );
  assert.equal(
    ((await response.json()) as { ai: { status: string } }).ai.status,
    "generated",
  );
});
test("every deterministic total has citable evidence, including unknown balances", () => {
  for (const id of ["partial", "refund", "unavailable"]) {
    const a = fx(id);
    for (const key of ["paid", "refunded", "net", "remaining"] as const) {
      const e = a.evidence.find((e) => e.id === `result.${key}`)!;
      assert.equal(e.path, `analysis.totals.${key}`);
      assert.equal(
        e.value,
        a.totals[key] === null ? "unknown" : `${a.totals[key]} USD`,
      );
      assert.equal(e.source, "SettleProof deterministic rules");
    }
  }
});
test("validated source chips support prose without inline references", () => {
  const result = validateExplanation({ outcome: "partial", text: "Captured 45.00 USD; remaining 75.00 USD.", draft: "Review the remaining evidence.", evidenceIds: ["result.paid", "result.remaining"] }, fx("partial"));
  assert.equal(result.status, "generated");
  assert.deepEqual(result.evidenceIds, ["result.paid", "result.remaining"]);
});
test("known optional inline sources merge into chips but unknown sources fail", () => {
  const valid = { outcome: "partial", text: "The remaining amount is 75.00 USD [result.remaining].", draft: "Review the evidence [result.paid].", evidenceIds: ["result.paid"] };
  const result = validateExplanation(valid, fx("partial"));
  assert.equal(result.status, "generated");
  assert.deepEqual(result.evidenceIds, ["result.paid", "result.remaining"]);
  assert.equal(validateExplanation({ ...valid, text: "Review [fabricated.source]." }, fx("partial")).status, "invalid");
});
test("source chips still require valid evidence and authoritative payment facts", () => {
  const valid = { outcome: "partial", text: "Captured 45.00 USD; remaining 75.00 USD.", draft: "", evidenceIds: ["result.paid", "result.remaining"] };
  for (const bad of [{ ...valid, evidenceIds: [] }, { ...valid, evidenceIds: ["fabricated.source"] }, { ...valid, outcome: "paid" }, { ...valid, text: "Captured 999.00 USD." }, { ...valid, text: "The invoice is fully paid." }]) assert.equal(validateExplanation(bad, fx("partial")).status, "invalid");
});
