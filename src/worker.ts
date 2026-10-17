import handler from "./core/api";
import { agreementRoute, type AgreementBindings } from "./agreements/router";
export { AiBudget } from "./core/ai-budget";
export { AgreementStore } from "./agreements/store";
export { analyze, parseInput, validateExplanation } from "./core/api";
export type { Bindings } from "./core/api";
export default {
  fetch(request: Request, env: Parameters<typeof handler.fetch>[1] & AgreementBindings) {
    return new URL(request.url).pathname.startsWith("/api/agreements") ? agreementRoute(request, env) : handler.fetch(request, env);
  },
};
