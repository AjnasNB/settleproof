import { ApiError, record, type Observation } from "./reconcile";
import type { Capture } from "../shared";
export const PAYPAL_ORIGIN = "https://api-m.sandbox.paypal.com";
export type PaypalSecrets = {
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
};
export const paypalConfigured = (env: PaypalSecrets) =>
  Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
export async function boundedJson(
  message: Request | Response,
  maxBytes: number,
): Promise<unknown> {
  if (Number(message.headers.get("content-length")) > maxBytes)
    throw new ApiError(
      413,
      "TOO_LARGE",
      "JSON input exceeds the supported size.",
    );
  if (!message.body)
    throw new ApiError(400, "INVALID_JSON", "A JSON body is required.");
  const reader = message.body.getReader();
  let count = 0,
    timedOut = false;
  const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 3000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > maxBytes) {
        await reader.cancel();
        throw new ApiError(
          413,
          "TOO_LARGE",
          "JSON input exceeds the supported size.",
        );
      }
      chunks.push(value);
    }
    if (timedOut)
      throw new ApiError(408, "BODY_TIMEOUT", "JSON body read timed out.");
    const joined = new Uint8Array(count);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(joined),
      );
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Malformed JSON input.");
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
const safeId = (v: unknown) =>
  typeof v === "string" && /^[A-Z0-9]{8,32}$/.test(v) ? v : undefined;
const safeRef = (v: unknown) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(v)
    ? v
    : "(missing or unsupported)";
const safeStatus = (v: unknown) =>
  typeof v === "string" && /^[A-Z_]{2,32}$/.test(v) ? v : "UNKNOWN";
function captureValue(
  v: unknown,
  fallbackId: string,
  orderId: string,
  invoiceId: string,
): Capture {
  const item = record(v),
    amount = record(item.amount);
  if (item.id !== fallbackId)
    throw new ApiError(
      502,
      "PAYPAL_UNAVAILABLE",
      "The sandbox returned inconsistent capture evidence.",
    );
  const supplementary =
    item.supplementary_data === undefined
      ? {}
      : record(item.supplementary_data);
  const related =
    supplementary.related_ids === undefined
      ? {}
      : record(supplementary.related_ids);
  if (
    (related.order_id !== undefined && related.order_id !== orderId) ||
    (item.invoice_id !== undefined && safeRef(item.invoice_id) !== invoiceId)
  )
    throw new ApiError(
      502,
      "PAYPAL_UNAVAILABLE",
      "The sandbox returned capture evidence for a different order or invoice.",
    );
  return {
    id: fallbackId,
    status: safeStatus(item.status),
    amount:
      typeof amount.value === "string" &&
      /^(0|[1-9]\d{0,7})\.\d{2}$/.test(amount.value)
        ? amount.value
        : "INVALID",
    currency: ["USD", "EUR", "GBP"].includes(String(amount.currency_code))
      ? String(amount.currency_code)
      : "UNSUPPORTED",
  };
}
export async function readPaypalOrder(
  orderId: string,
  env: PaypalSecrets,
  fetcher: typeof fetch = fetch,
): Promise<Observation> {
  if (!safeId(orderId))
    throw new ApiError(
      400,
      "INVALID_ORDER",
      "Use a PayPal sandbox order ID of 8–32 uppercase letters or digits.",
    );
  if (!paypalConfigured(env))
    throw new ApiError(
      503,
      "PAYPAL_NOT_CONFIGURED",
      "PayPal sandbox credentials are not configured on the server. Synthetic fixtures remain available.",
    );
  const overallDeadline = AbortSignal.timeout(15000);
  const request = async (path: string, init: RequestInit) => {
    const response = await fetcher(`${PAYPAL_ORIGIN}${path}`, {
      ...init,
      // Manual mode works in the Worker runtime and never forwards credentials.
      // All non-success responses, including redirects, are rejected below.
      redirect: "manual",
      signal: AbortSignal.any([overallDeadline, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(
        502,
        "PAYPAL_UNAVAILABLE",
        "PayPal sandbox evidence could not be read. Availability does not establish payment status.",
      );
    }
    return boundedJson(response, 128 * 1024);
  };
  try {
    const token = record(
      await request("/v1/oauth2/token", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
        },
        body: "grant_type=client_credentials",
      }),
    );
    if (
      typeof token.access_token !== "string" ||
      token.access_token.length > 4096 ||
      !token.access_token
    )
      throw new Error("Invalid token");
    const init = {
      method: "GET",
      headers: {
        authorization: `Bearer ${token.access_token}`,
        accept: "application/json",
        "cache-control": "no-cache",
      },
    };
    const order = record(await request(`/v2/checkout/orders/${orderId}`, init));
    if (
      order.id !== orderId ||
      !Array.isArray(order.purchase_units) ||
      order.purchase_units.length > 8
    )
      throw new Error("Invalid order shape");
    const invoiceIds: string[] = [],
      captures: Capture[] = [];
    let refundDataUnknown = false;
    for (const rawUnit of order.purchase_units) {
      const unit = record(rawUnit);
      invoiceIds.push(safeRef(unit.invoice_id));
      const payments = unit.payments === undefined ? {} : record(unit.payments);
      if (payments.refunds !== undefined) {
        if (!Array.isArray(payments.refunds))
          throw new Error("Invalid refund evidence");
        if (payments.refunds.length) refundDataUnknown = true;
      }
      const listed = payments.captures === undefined ? [] : payments.captures;
      if (
        !Array.isArray(listed) ||
        listed.length > 8 ||
        captures.length + listed.length > 8
      )
        throw new Error("Capture limit exceeded");
      for (const rawCapture of listed) {
        const id = safeId(record(rawCapture).id);
        if (!id) throw new Error("Invalid capture ID");
        // Read capture details afresh: the order's embedded status may predate a refund.
        captures.push(
          captureValue(
            await request(`/v2/payments/captures/${id}`, init),
            id,
            orderId,
            safeRef(unit.invoice_id),
          ),
        );
      }
    }
    return {
      id: orderId,
      status: safeStatus(order.status),
      invoiceIds,
      captures,
      refundDataUnknown,
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === "PAYPAL_UNAVAILABLE")
      throw error;
    throw new ApiError(
      502,
      "PAYPAL_UNAVAILABLE",
      "Fresh PayPal sandbox evidence is unavailable or invalid. Do not treat this as an unpaid invoice.",
    );
  }
}
