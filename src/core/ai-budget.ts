import { DurableObject } from "cloudflare:workers";

const MAX_DAILY_CALLS = 20;
export class AiBudget extends DurableObject<Cloudflare.Env> {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(
        "CREATE TABLE IF NOT EXISTS daily_budget (day TEXT PRIMARY KEY, calls INTEGER NOT NULL CHECK(calls >= 0))",
      );
    });
  }
  reserve(): { allowed: boolean; remaining: number } {
    const day = new Date().toISOString().slice(0, 10);
    const configured = Number(this.env.AI_DAILY_LIMIT ?? MAX_DAILY_CALLS);
    const limit =
      Number.isInteger(configured) && configured >= 0
        ? Math.min(configured, MAX_DAILY_CALLS)
        : 0;
    // One coordination atom for the small demo's global quota. No network I/O in this transaction.
    return this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM daily_budget WHERE day <> ?", day);
      const used =
        this.ctx.storage.sql
          .exec<{ calls: number }>(
            "SELECT calls FROM daily_budget WHERE day = ?",
            day,
          )
          .toArray()[0]?.calls ?? 0;
      if (used >= limit) return { allowed: false, remaining: 0 };
      this.ctx.storage.sql.exec(
        "INSERT INTO daily_budget (day, calls) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET calls = excluded.calls",
        day,
        used + 1,
      );
      return { allowed: true, remaining: limit - used - 1 };
    });
  }
}
