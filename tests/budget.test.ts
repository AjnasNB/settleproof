import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

test(
  "real SQLite budget caps concurrent reservations, survives reload and resets by UTC day",
  { timeout: 30000 },
  async () => {
    const bundle = await build({
      entryPoints: ["src/core/ai-budget.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      external: ["cloudflare:workers"],
      logLevel: "silent",
    });
    // Test-only clock and dispatch harness. The production object accepts no client clock.
    const clock = `const RealDate = Date; let now = '2026-10-17T23:59:59Z';
    globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return new RealDate(now).getTime(); } };`;
    const script = `${clock}\n${bundle.outputFiles[0].text}\nexport default { async fetch(request, env) {
    const day = new URL(request.url).searchParams.get('day'); if (day) now = day;
    return Response.json(await env.AI_BUDGET.getByName('global-ai-budget').reserve()); } };`;
    // Miniflare 5 consumes the current Worker config/manifest shape.
    const config = {
      name: "budget-test",
      compatibilityDate: "2026-10-17",
      manifest: {
        mainModule: "index.js",
        modules: { "index.js": { type: "esm" as const, contents: script } },
      },
      env: {
        AI_DAILY_LIMIT: { type: "json" as const, value: "20" },
        AI_BUDGET: {
          type: "durable-object" as const,
          worker: "budget-test",
          exportName: "AiBudget",
        },
      },
      exports: {
        AiBudget: {
          type: "durable-object" as const,
          storage: "sqlite" as const,
        },
        default: { type: "worker" as const },
      },
    };
    const mf = new Miniflare({ cf: false, workers: [{ config }] });
    try {
      const results = await Promise.all(
        Array.from(
          { length: 37 },
          async () =>
            (await (await mf.dispatchFetch("https://budget.test/")).json()) as {
              allowed: boolean;
              remaining: number;
            },
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 20);
      assert.equal(results.filter((r) => !r.allowed).length, 17);
      assert.equal(
        new Set(results.filter((r) => r.allowed).map((r) => r.remaining)).size,
        20,
      );
      await mf.setOptions({
        cf: false,
        workers: [
          {
            config: {
              ...config,
              manifest: {
                ...config.manifest,
                modules: {
                  "index.js": {
                    type: "esm",
                    contents: `${script}\n// isolate reload`,
                  },
                },
              },
            },
          },
        ],
      });
      assert.deepEqual(
        await (await mf.dispatchFetch("https://budget.test/")).json(),
        { allowed: false, remaining: 0 },
      );
      assert.deepEqual(
        await (
          await mf.dispatchFetch(
            "https://budget.test/?day=2026-10-18T00:00:00Z",
          )
        ).json(),
        { allowed: true, remaining: 19 },
      );
    } finally {
      await mf.dispose();
    }
  },
);
