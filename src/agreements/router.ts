import { ApiError } from "../core/reconcile";
import { boundedJson, paypalConfigured, type PaypalSecrets } from "../core/paypal";
import { verifyReceipt } from "./receipt";
import type { AgreementStore, StoreCommand, StoreReply } from "./store";
import type { ReceiptPacket } from "./types";
import { MAX_VERIFY_REQUEST_BYTES } from "./limits";

export type AgreementBindings = PaypalSecrets & {
  AGREEMENTS?: DurableObjectNamespace<AgreementStore>;
  API_RATE?: RateLimit;
};
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });

export async function agreementRoute(request: Request, env: AgreementBindings): Promise<Response> {
  try {
    const url = new URL(request.url), origin = request.headers.get("origin");
    if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "ORIGIN_REJECTED", "Only same-origin requests are accepted.");
    if (url.search) throw new ApiError(400, "INVALID_INPUT", "API query parameters are not accepted.");
    if (request.method === "GET" && url.pathname === "/api/agreements/config") {
      const configured = paypalConfigured(env);
      return json({ environment: "sandbox", configured, ...(configured ? { clientId: env.PAYPAL_CLIENT_ID } : {}) });
    }
    if (!["GET", "POST"].includes(request.method)) throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use the documented GET or POST endpoint.");
    if (!env.API_RATE || !env.AGREEMENTS) throw new ApiError(503, "AGREEMENTS_UNAVAILABLE", "The bounded sandbox agreement store is not configured.");
    if (!(await env.API_RATE.limit({ key: `agreements:${request.headers.get("cf-connecting-ip") || "local"}` })).success) throw new ApiError(429, "RATE_LIMIT", "Sandbox demo request limit reached. Wait before trying again.");
    if (request.method === "POST" && (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== "application/json") throw new ApiError(415, "JSON_REQUIRED", "Content-Type must be application/json.");
    const store = env.AGREEMENTS.getByName("global-bounded-agreements-v1");
    const dispatch = async (command: StoreCommand) => {
      const reply = await store.dispatch(command) as unknown as StoreReply;
      if (!reply.ok) throw new ApiError(reply.error.status, reply.error.code, reply.error.message);
      return reply.value;
    };
    if (request.method === "POST" && url.pathname === "/api/agreements/verify") {
      const value = await boundedJson(request, MAX_VERIFY_REQUEST_BYTES) as Record<string, unknown>;
      if (value && typeof value === "object" && Object.hasOwn(value, "packet")) return json(await verifyReceipt(value.packet as ReceiptPacket, value.retainedAnchor as { sequence: number; hash: string } | undefined));
      return json(await verifyReceipt(value as unknown as ReceiptPacket));
    }
    if (request.method === "POST" && url.pathname === "/api/agreements") return json(await dispatch({ operation: "create", value: await boundedJson(request, 8192) }), 201);
    const route = /^\/api\/agreements\/([a-f0-9]{32})(?:\/(actions|export))?$/.exec(url.pathname);
    if (!route) throw new ApiError(404, "NOT_FOUND", "Agreement endpoint not found.");
    const capability = request.headers.get("x-role-capability") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(capability)) throw new ApiError(401, "CAPABILITY_REQUIRED", "Open the private buyer or seller link to use this room.");
    if (request.method === "GET" && !route[2]) return json(await dispatch({ operation: "read", id: route[1], capability }));
    if (request.method === "GET" && route[2] === "export") return json(await dispatch({ operation: "export", id: route[1], capability }));
    if (request.method === "POST" && route[2] === "actions") return json(await dispatch({ operation: "action", id: route[1], capability, value: await boundedJson(request, 8192), returnOrigin: url.origin }));
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use the documented method for this endpoint.");
  } catch (error) {
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
    // DO RPC serialization preserves Error name/message, not necessarily custom class fields.
    // Public provider bodies, credentials and private capability values never enter this response.
    return json({ error: { code: "AGREEMENT_ERROR", message: "The room operation could not complete. Refresh the room before retrying. No payment result should be inferred." } }, 500);
  }
}
