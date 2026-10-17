import {
  Client, Environment, OrdersController, PaymentsController, CheckoutPaymentIntent,
  PaypalExperienceUserAction, PaypalWalletContextShippingPreference,
  type Order,
} from "@paypal/paypal-server-sdk";
import { boundedJson, type PaypalSecrets } from "../core/paypal";
import { ApiError, type Observation } from "../core/reconcile";

const ORIGIN = "https://api-m.sandbox.paypal.com";
const unavailable = () => new ApiError(502, "PAYPAL_UNAVAILABLE", "Fresh PayPal sandbox evidence is unavailable. Inspect the existing order before retrying; no payment conclusion can be made.");
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9]{8,32}$/.test(value);
type AdapterConfig = {
  url?: string; method?: string; data?: unknown;
  headers?: Record<string, unknown> & { toJSON?: () => Record<string, unknown> };
  auth?: { username: string; password: string };
  cancelToken?: { subscribe?: (fn: () => void) => void; unsubscribe?: (fn: () => void) => void };
};

/** A pinned SDK transport: only its OAuth and checkout/read paths can leave the Worker. */
export function sandboxAdapter(fetcher: typeof fetch = fetch, deadline = AbortSignal.timeout(15000)) {
  return async (config: AdapterConfig) => {
    const url = new URL(config.url || "https://invalid.invalid");
    const method = (config.method || "GET").toUpperCase();
    const path = url.pathname;
    const allowed =
      (method === "POST" && path === "/v1/oauth2/token") ||
      (method === "POST" && path === "/v2/checkout/orders") ||
      (method === "GET" && /^\/v2\/checkout\/orders\/[A-Z0-9]{8,32}$/.test(path)) ||
      (method === "POST" && /^\/v2\/checkout\/orders\/[A-Z0-9]{8,32}\/capture$/.test(path)) ||
      (method === "GET" && /^\/v2\/payments\/captures\/[A-Z0-9]{8,32}$/.test(path));
    if (url.origin !== ORIGIN || url.search || url.username || url.password || !allowed) throw unavailable();
    const headers = new Headers();
    const raw = config.headers?.toJSON?.() || config.headers || {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined && value !== null && typeof value !== "function") headers.set(key, String(value));
    }
    if (config.auth) headers.set("authorization", `Basic ${btoa(`${config.auth.username}:${config.auth.password}`)}`);
    const cancelled = new AbortController();
    const abort = () => cancelled.abort();
    config.cancelToken?.subscribe?.(abort);
    try {
      if (config.data !== undefined && typeof config.data !== "string") throw unavailable();
      const response = await fetcher(url, {
        method, headers, body: method === "GET" ? undefined : config.data as string | undefined,
        redirect: "error", signal: AbortSignal.any([deadline, cancelled.signal]),
      });
      const value = await boundedJson(response, 128 * 1024);
      // APIMatic explicitly disables Axios JSON transforms and parses this text itself.
      return { data: JSON.stringify(value), status: response.status, statusText: response.statusText,
        headers: Object.fromEntries(response.headers), config };
    } catch { throw unavailable(); }
    finally { config.cancelToken?.unsubscribe?.(abort); }
  };
}

export function sdkControllers(env: PaypalSecrets, fetcher: typeof fetch = fetch) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new ApiError(503, "PAYPAL_NOT_CONFIGURED", "The dedicated PayPal sandbox application is not configured.");
  const client = new Client({
    environment: Environment.Sandbox,
    clientCredentialsAuthCredentials: { oAuthClientId: env.PAYPAL_CLIENT_ID, oAuthClientSecret: env.PAYPAL_CLIENT_SECRET },
    timeout: 15000,
    httpClientOptions: { retryConfig: { maxNumberOfRetries: 0 } },
    unstable_httpClientOptions: { adapter: sandboxAdapter(fetcher), maxRedirects: 0 },
  });
  return { orders: new OrdersController(client), payments: new PaymentsController(client) };
}

function approvalLink(order: Order): string | undefined {
  const link = order.links?.find(item => item.rel === "payer-action" || item.rel === "approve");
  if (!link?.href || link.href.length > 2048) return undefined;
  try {
    const url = new URL(link.href);
    // The current Orders API examples return this checkout path. Unknown paths are not linked.
    if (url.origin === "https://www.sandbox.paypal.com" && url.pathname === "/checkoutnow" && !url.hash && !url.username && !url.password &&
      url.searchParams.get("token") === order.id && validId(order.id)) return url.href;
  } catch { /* invalid provider link is never surfaced */ }
  return undefined;
}

export async function sdkCreateOrder(env: PaypalSecrets, invoiceId: string, amount: string, requestId: string, returnOrigin: string, fetcher: typeof fetch = fetch) {
  const { orders } = sdkControllers(env, fetcher);
  try {
    const response = await orders.createOrder({
      paypalRequestId: requestId, prefer: "return=representation",
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [{ invoiceId, amount: { currencyCode: "USD", value: amount } }],
        paymentSource: { paypal: { experienceContext: {
          brandName: "SettleProof sandbox demo", userAction: PaypalExperienceUserAction.Continue,
          shippingPreference: PaypalWalletContextShippingPreference.NoShipping,
          returnUrl: `${returnOrigin}/?paypal-return=1`, cancelUrl: `${returnOrigin}/?paypal-cancel=1`,
        } } },
      },
    });
    if (!validId(response.result.id)) throw unavailable();
    return { orderId: response.result.id, approvalUrl: approvalLink(response.result) };
  } catch { throw unavailable(); }
}

async function readWith(controllers: ReturnType<typeof sdkControllers>, orderId: string): Promise<Observation> {
  if (!validId(orderId)) throw unavailable();
  const { result: order } = await controllers.orders.getOrder({ id: orderId });
  if (order.id !== orderId || !Array.isArray(order.purchaseUnits) || !order.purchaseUnits.length || order.purchaseUnits.length > 3) throw unavailable();
  const observation: Observation = { id: orderId, status: String(order.status || "UNKNOWN"), invoiceIds: [], captures: [], refundDataUnknown: false };
  for (const unit of order.purchaseUnits) {
    const invoiceId = typeof unit.invoiceId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(unit.invoiceId) ? unit.invoiceId : "(missing or unsupported)";
    observation.invoiceIds.push(invoiceId);
    if (unit.payments?.refunds?.length) observation.refundDataUnknown = true;
    const listed = unit.payments?.captures || [];
    if (listed.length + observation.captures.length > 8) throw unavailable();
    for (const capture of listed) {
      if (!validId(capture.id)) throw unavailable();
      const { result: fresh } = await controllers.payments.getCapturedPayment({ captureId: capture.id });
      if (fresh.id !== capture.id || (fresh.invoiceId !== undefined && fresh.invoiceId !== invoiceId) ||
        (fresh.supplementaryData?.relatedIds?.orderId !== undefined && fresh.supplementaryData.relatedIds.orderId !== orderId)) throw unavailable();
      observation.captures.push({ id: capture.id, status: String(fresh.status || "UNKNOWN"),
        amount: typeof fresh.amount?.value === "string" && /^(0|[1-9]\d{0,7})\.\d{2}$/.test(fresh.amount.value) ? fresh.amount.value : "INVALID",
        currency: ["USD", "EUR", "GBP"].includes(String(fresh.amount?.currencyCode)) ? String(fresh.amount?.currencyCode) : "UNSUPPORTED" });
    }
  }
  return observation;
}

export async function sdkReadOrder(env: PaypalSecrets, orderId: string, fetcher: typeof fetch = fetch) {
  try { return await readWith(sdkControllers(env, fetcher), orderId); }
  catch (error) { if (error instanceof ApiError && error.code === "PAYPAL_NOT_CONFIGURED") throw error; throw unavailable(); }
}

export async function sdkCaptureOrder(env: PaypalSecrets, orderId: string, requestId: string, expected: { invoiceId: string; amount: string }, fetcher: typeof fetch = fetch) {
  const controllers = sdkControllers(env, fetcher);
  try {
    const before = await controllers.orders.getOrder({ id: orderId });
    const units = before.result.purchaseUnits;
    if (before.result.id !== orderId || units?.length !== 1 || units[0].invoiceId !== expected.invoiceId ||
      units[0].amount?.value !== expected.amount || units[0].amount.currencyCode !== "USD") throw unavailable();
    if (before.result.status === "COMPLETED") return await readWith(controllers, orderId);
    if (before.result.status !== "APPROVED") throw new ApiError(409, "APPROVAL_REQUIRED", "The buyer must approve this sandbox order in PayPal before capture.");
    await controllers.orders.captureOrder({ id: orderId, paypalRequestId: requestId, prefer: "return=representation" });
    return await readWith(controllers, orderId);
  } catch (error) { if (error instanceof ApiError && error.code === "APPROVAL_REQUIRED") throw error; throw unavailable(); }
}
