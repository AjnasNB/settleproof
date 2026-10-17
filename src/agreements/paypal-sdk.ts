import {
  Client, Environment, OrdersController, PaymentsController, CheckoutPaymentIntent,
  PaypalExperienceUserAction, PaypalWalletContextShippingPreference,
  ResponseValidationError, ArgumentsValidationError,
  type Order,
} from "@paypal/paypal-server-sdk";
import { boundedJson, type PaypalSecrets } from "../core/paypal";
import { ApiError, type Observation } from "../core/reconcile";

const ORIGIN = "https://api-m.sandbox.paypal.com";
const unavailable = () => new ApiError(502, "PAYPAL_UNAVAILABLE", "Fresh PayPal sandbox evidence is unavailable. Inspect the existing order before retrying; no payment conclusion can be made.");
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9]{8,32}$/.test(value);
export type PayPalDiagnosticOperation = "oauth" | "create-order" | "get-order" | "capture-order" | "get-capture" | "transport" | "read-order";
export type PayPalDiagnosticReason = "http-response" | "http-error" | "transport-policy" | "transport-error" | "transport-data-type" | "transport-deadline" | "transport-cancelled" | "transport-fetch" | "redirect-rejected" | "response-unreadable" | "response-validation" | "arguments-validation" | "invalid-order-response" | "sdk-initialization" | "sdk-error";
export type PayPalDiagnostic = {
  event: "paypal-sandbox-diagnostic"; operation: PayPalDiagnosticOperation; reason: PayPalDiagnosticReason;
  httpStatus?: number; providerName?: string; issues?: string[]; debugId?: string; errorName?: string;
};
export type PayPalDiagnosticSink = (diagnostic: PayPalDiagnostic) => void;
export const MAX_RETAINED_PAYPAL_DIAGNOSTICS = 4;
const DIAGNOSTIC_OPERATIONS: readonly PayPalDiagnosticOperation[] = ["oauth", "create-order", "get-order", "capture-order", "get-capture", "transport", "read-order"];
const DIAGNOSTIC_REASONS: readonly PayPalDiagnosticReason[] = ["http-response", "http-error", "transport-policy", "transport-error", "transport-data-type", "transport-deadline", "transport-cancelled", "transport-fetch", "redirect-rejected", "response-unreadable", "response-validation", "arguments-validation", "invalid-order-response", "sdk-initialization", "sdk-error"];
const ERROR_NAMES = new Set(["Error", "TypeError", "AbortError", "TimeoutError"]);
const defaultDiagnostic: PayPalDiagnosticSink = diagnostic => console.warn(diagnostic);
const own = (value: unknown, key: string): unknown => value && typeof value === "object" ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const code = (value: unknown): string | undefined => typeof value === "string" && /^[A-Z][A-Z0-9_]{1,79}$/.test(value) ? value : undefined;
const debugId = (value: unknown): string | undefined => typeof value === "string" && /^[a-fA-F0-9]{8,32}$/.test(value) ? value : undefined;
const OAUTH_ERRORS = new Set(["invalid_request", "invalid_client", "invalid_grant", "unauthorized_client", "unsupported_grant_type", "invalid_scope", "server_error", "temporarily_unavailable"]);
const PROVIDER_NAMES = new Set(["INVALID_REQUEST", "UNPROCESSABLE_ENTITY", "AUTHENTICATION_FAILURE", "NOT_AUTHORIZED", "PERMISSION_DENIED", "RESOURCE_NOT_FOUND", "RESOURCE_CONFLICT", "RATE_LIMIT_REACHED", "INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE", "VALIDATION_ERROR", "INVALID_RESOURCE_ID"]);

/** Select only protocol codes; SDK exceptions contain private request headers and bodies. */
export function sanitizePayPalDiagnostic(operation: PayPalDiagnosticOperation, reason: PayPalDiagnosticReason, source: unknown): PayPalDiagnostic {
  const result: PayPalDiagnostic = { event: "paypal-sandbox-diagnostic", operation, reason };
  const errorName = own(source, "errorName");
  if (typeof errorName === "string" && ERROR_NAMES.has(errorName)) result.errorName = errorName;
  const status = own(source, "statusCode");
  if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) result.httpStatus = status;
  let body = own(source, "body");
  if (typeof body === "string") { try { body = body.length <= 128 * 1024 ? JSON.parse(body) : undefined; } catch { body = undefined; } }
  if (!body || typeof body !== "object" || Array.isArray(body)) body = own(source, "result");
  // Successful OAuth and order payloads never contribute body fields to diagnostics.
  if (result.httpStatus !== undefined && result.httpStatus >= 400) {
    const name = code(own(body, "name")), oauth = own(body, "error");
    if (name && PROVIDER_NAMES.has(name)) result.providerName = name;
    else if (typeof oauth === "string" && OAUTH_ERRORS.has(oauth)) result.providerName = oauth;
    const details = own(body, "details");
    if (Array.isArray(details)) {
      const issues = [...new Set(details.slice(0, 10).map(item => code(own(item, "issue"))).filter((item): item is string => !!item))].slice(0, 3);
      if (issues.length) result.issues = issues;
    }
  }
  const headers = own(source, "headers");
  const correlation = debugId(own(body, "debug_id")) || debugId(own(headers, "paypal-debug-id")) || debugId(own(headers, "PayPal-Debug-Id"));
  if (correlation) result.debugId = correlation;
  return result;
}
/** Revalidate at the persistence boundary and retain only the most recent bounded entries. */
export function retainPayPalDiagnostic(target: PayPalDiagnostic[], value: unknown): void {
  const operation = own(value, "operation"), reason = own(value, "reason");
  if (own(value, "event") !== "paypal-sandbox-diagnostic" || !DIAGNOSTIC_OPERATIONS.includes(operation as PayPalDiagnosticOperation) || !DIAGNOSTIC_REASONS.includes(reason as PayPalDiagnosticReason)) return;
  const issues = own(value, "issues");
  const providerName = own(value, "providerName");
  const safe = sanitizePayPalDiagnostic(operation as PayPalDiagnosticOperation, reason as PayPalDiagnosticReason, { statusCode: own(value, "httpStatus"), errorName: own(value, "errorName"), body: {
    name: providerName, error: providerName, debug_id: own(value, "debugId"), details: Array.isArray(issues) ? issues.slice(0, 3).map(issue => ({ issue })) : undefined,
  } });
  target.push(safe);
  if (target.length > MAX_RETAINED_PAYPAL_DIAGNOSTICS) target.splice(0, target.length - MAX_RETAINED_PAYPAL_DIAGNOSTICS);
}
function reportDiagnostic(sink: PayPalDiagnosticSink, operation: PayPalDiagnosticOperation, reason: PayPalDiagnosticReason, source?: unknown) {
  try { sink(sanitizePayPalDiagnostic(operation, reason, source)); } catch { /* Diagnostics must not change payment behavior. */ }
}
const sdkReason = (error: unknown): PayPalDiagnosticReason => error instanceof ResponseValidationError ? "response-validation" : error instanceof ArgumentsValidationError ? "arguments-validation" : "sdk-error";
const operationFor = (method: string, path: string): PayPalDiagnosticOperation => path === "/v1/oauth2/token" ? "oauth" : path === "/v2/checkout/orders" ? "create-order" : path.endsWith("/capture") ? "capture-order" : path.startsWith("/v2/payments/captures/") ? "get-capture" : path.startsWith("/v2/checkout/orders/") && method === "GET" ? "get-order" : "transport";
type AdapterConfig = {
  url?: string; method?: string; data?: unknown;
  headers?: Record<string, unknown> & { toJSON?: () => Record<string, unknown> };
  auth?: { username: string; password: string };
  cancelToken?: { subscribe?: (fn: () => void) => void; unsubscribe?: (fn: () => void) => void };
};

/** A pinned SDK transport: only its OAuth and checkout/read paths can leave the Worker. */
export function sandboxAdapter(fetcher: typeof fetch = fetch, deadline = AbortSignal.timeout(15000), diagnostic: PayPalDiagnosticSink = defaultDiagnostic) {
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
    const operation = operationFor(method, path);
    if (url.origin !== ORIGIN || url.search || url.username || url.password || !allowed) { reportDiagnostic(diagnostic, operation, "transport-policy"); throw unavailable(); }
    const headers = new Headers();
    const raw = config.headers?.toJSON?.() || config.headers || {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined && value !== null && typeof value !== "function") headers.set(key, String(value));
    }
    if (config.auth) headers.set("authorization", `Basic ${btoa(`${config.auth.username}:${config.auth.password}`)}`);
    const cancelled = new AbortController();
    const abort = () => cancelled.abort();
    config.cancelToken?.subscribe?.(abort);
    let response: Response | undefined;
    let failureReason: PayPalDiagnosticReason = "transport-fetch";
    try {
      if (config.data !== undefined && typeof config.data !== "string") { failureReason = "transport-data-type"; throw unavailable(); }
      response = await fetcher(url, {
        method, headers, body: method === "GET" ? undefined : config.data as string | undefined,
        // Worker Request construction rejects "error" in the tested runtime. Manual
        // mode returns redirects without forwarding credentials to another origin.
        redirect: "manual", signal: AbortSignal.any([deadline, cancelled.signal]),
      });
      if (response.status >= 300 && response.status < 400) {
        failureReason = "redirect-rejected";
        await response.body?.cancel();
        throw unavailable();
      }
      failureReason = "response-unreadable";
      const value = await boundedJson(response, 128 * 1024);
      reportDiagnostic(diagnostic, operation, response.status >= 400 ? "http-error" : "http-response", { statusCode: response.status, body: value, headers: { "paypal-debug-id": response.headers.get("paypal-debug-id") } });
      // APIMatic explicitly disables Axios JSON transforms and parses this text itself.
      return { data: JSON.stringify(value), status: response.status, statusText: response.statusText,
        headers: Object.fromEntries(response.headers), config };
    } catch (error) {
      if (!response && failureReason !== "transport-data-type") failureReason = deadline.aborted ? "transport-deadline" : cancelled.signal.aborted ? "transport-cancelled" : "transport-fetch";
      const errorName = error instanceof TypeError ? "TypeError" : own(error, "name") || (error instanceof Error ? "Error" : undefined);
      reportDiagnostic(diagnostic, operation, failureReason, { errorName, ...(response ? { statusCode: response.status, headers: { "paypal-debug-id": response.headers.get("paypal-debug-id") } } : {}) });
      throw unavailable();
    }
    finally { config.cancelToken?.unsubscribe?.(abort); }
  };
}

export function sdkControllers(env: PaypalSecrets, fetcher: typeof fetch = fetch, diagnostic: PayPalDiagnosticSink = defaultDiagnostic) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new ApiError(503, "PAYPAL_NOT_CONFIGURED", "The dedicated PayPal sandbox application is not configured.");
  const client = new Client({
    environment: Environment.Sandbox,
    clientCredentialsAuthCredentials: { oAuthClientId: env.PAYPAL_CLIENT_ID, oAuthClientSecret: env.PAYPAL_CLIENT_SECRET },
    timeout: 15000,
    httpClientOptions: { retryConfig: { maxNumberOfRetries: 0 } },
    unstable_httpClientOptions: { adapter: sandboxAdapter(fetcher, AbortSignal.timeout(15000), diagnostic), maxRedirects: 0 },
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

export async function sdkCreateOrder(env: PaypalSecrets, invoiceId: string, amount: string, requestId: string, returnOrigin: string, fetcher: typeof fetch = fetch, diagnostic: PayPalDiagnosticSink = defaultDiagnostic) {
  let initialized = false;
  try {
    const { orders } = sdkControllers(env, fetcher, diagnostic);
    initialized = true;
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
    if (!validId(response.result.id)) { reportDiagnostic(diagnostic, "create-order", "invalid-order-response", response); throw unavailable(); }
    return { orderId: response.result.id, approvalUrl: approvalLink(response.result) };
  } catch (error) {
    reportDiagnostic(diagnostic, "create-order", initialized ? sdkReason(error) : "sdk-initialization", error);
    if (error instanceof ApiError && error.code === "PAYPAL_NOT_CONFIGURED") throw error;
    throw unavailable();
  }
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

export async function sdkReadOrder(env: PaypalSecrets, orderId: string, fetcher: typeof fetch = fetch, diagnostic: PayPalDiagnosticSink = defaultDiagnostic) {
  let initialized = false;
  try { const controllers = sdkControllers(env, fetcher, diagnostic); initialized = true; return await readWith(controllers, orderId); }
  catch (error) { reportDiagnostic(diagnostic, "read-order", initialized ? sdkReason(error) : "sdk-initialization", error); if (error instanceof ApiError && error.code === "PAYPAL_NOT_CONFIGURED") throw error; throw unavailable(); }
}

export async function sdkCaptureOrder(env: PaypalSecrets, orderId: string, requestId: string, expected: { invoiceId: string; amount: string }, fetcher: typeof fetch = fetch, diagnostic: PayPalDiagnosticSink = defaultDiagnostic) {
  let initialized = false;
  try {
    const controllers = sdkControllers(env, fetcher, diagnostic);
    initialized = true;
    const before = await controllers.orders.getOrder({ id: orderId });
    const units = before.result.purchaseUnits;
    if (before.result.id !== orderId || units?.length !== 1 || units[0].invoiceId !== expected.invoiceId ||
      units[0].amount?.value !== expected.amount || units[0].amount.currencyCode !== "USD") throw unavailable();
    if (before.result.status === "COMPLETED") return await readWith(controllers, orderId);
    if (before.result.status !== "APPROVED") throw new ApiError(409, "APPROVAL_REQUIRED", "The buyer must approve this sandbox order in PayPal before capture.");
    await controllers.orders.captureOrder({ id: orderId, paypalRequestId: requestId, prefer: "return=representation" });
    return await readWith(controllers, orderId);
  } catch (error) { reportDiagnostic(diagnostic, "capture-order", initialized ? sdkReason(error) : "sdk-initialization", error); if (error instanceof ApiError && ["APPROVAL_REQUIRED", "PAYPAL_NOT_CONFIGURED"].includes(error.code)) throw error; throw unavailable(); }
}
