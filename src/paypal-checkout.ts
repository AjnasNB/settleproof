import { loadCoreSdkScript, type PayPalV6Namespace, type SdkInstance } from '@paypal/paypal-js/sdk-v6';

export type CheckoutPhase = 'loading-sdk' | 'initializing-sdk' | 'checking-eligibility' | 'preparing-button' | 'ready';
const phaseNames: Record<CheckoutPhase, string> = {
  'loading-sdk': "loading PayPal's Sandbox SDK",
  'initializing-sdk': 'initializing PayPal Sandbox',
  'checking-eligibility': 'checking PayPal payment availability',
  'preparing-button': 'preparing the PayPal approval button',
  ready: 'preparing PayPal approval',
};
export const checkoutPhaseMessage = (phase: CheckoutPhase) => phase === 'ready' ? 'PayPal Sandbox is ready. Approval and capture remain separate steps.' : `${phaseNames[phase][0].toUpperCase()}${phaseNames[phase].slice(1)}…`;
export const checkoutTimeoutMessage = (phase: CheckoutPhase) => `PayPal Sandbox timed out while ${phaseNames[phase]}. No order or capture was requested. Try loading Checkout again, or return later.`;
export class CheckoutInitializationError extends Error {
  constructor(readonly phase: CheckoutPhase, message?: string) {
    super(message || `PayPal Sandbox is unavailable while ${phaseNames[phase]}. No order or capture was requested. Try loading Checkout again later.`);
    this.name = 'CheckoutInitializationError';
  }
}
async function duringPhase<T>(start: () => Promise<T>, signal: AbortSignal, phase: CheckoutPhase): Promise<T> {
  if (signal.aborted) throw new CheckoutInitializationError(phase, checkoutTimeoutMessage(phase));
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (success: boolean, value: unknown) => {
      if (settled) return;
      settled = true; signal.removeEventListener('abort', abort);
      if (success && !signal.aborted) resolve(value as T);
      else reject(value instanceof CheckoutInitializationError ? value : new CheckoutInitializationError(phase));
    };
    const abort = () => finish(false, new CheckoutInitializationError(phase, checkoutTimeoutMessage(phase)));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => { if (signal.aborted) throw new CheckoutInitializationError(phase, checkoutTimeoutMessage(phase)); return start(); })
      .then(value => finish(true, value), () => finish(false, new CheckoutInitializationError(phase)));
  });
}

export type CheckoutOptions = {
  container: HTMLElement;
  clientId: string;
  createOrder: () => Promise<string>;
  /** Approval triggers a fresh server read. Capture requires a separate human action. */
  onApprove: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
  onPhase?: (phase: CheckoutPhase) => void;
};
let sandboxSdk: Promise<PayPalV6Namespace | null> | undefined;

/** This phase boundary makes stalled provider promises visible without creating an order. */
export async function initializeSandboxCheckout(clientId: string, signal: AbortSignal, onPhase: (phase: CheckoutPhase) => void,
  loader: () => Promise<PayPalV6Namespace | null> = () => sandboxSdk ??= loadCoreSdkScript({ environment: 'sandbox' }).catch(error => { sandboxSdk = undefined; throw error; }),
): Promise<SdkInstance<readonly ['paypal-payments']>> {
  onPhase('loading-sdk');
  const sdk = await duringPhase(loader, signal, 'loading-sdk');
  if (!sdk) throw new CheckoutInitializationError('loading-sdk');
  onPhase('initializing-sdk');
  const instance = await duringPhase(() => sdk.createInstance({ clientId, components: ['paypal-payments'] as const, pageType: 'checkout' }), signal, 'initializing-sdk');
  onPhase('checking-eligibility');
  const eligibility = await duringPhase(() => instance.findEligibleMethods({ currencyCode: 'USD', paymentFlow: 'ONE_TIME_PAYMENT' }), signal, 'checking-eligibility');
  if (!eligibility.isEligible('paypal')) throw new CheckoutInitializationError('checking-eligibility', 'PayPal Sandbox Checkout is not eligible in this browser or merchant configuration. No order or capture was requested.');
  return instance;
}

/** Loads only the official Sandbox v6 SDK. Never receives a server secret or payer data. */
export async function mountPayPalCheckout(options: CheckoutOptions): Promise<() => void> {
  const signal = options.signal ?? new AbortController().signal;
  const instance = await initializeSandboxCheckout(options.clientId, signal, phase => { if (!signal.aborted) options.onPhase?.(phase); });
  if (signal.aborted || !options.container.isConnected) return () => {};
  options.onPhase?.('preparing-button');
  let active = true, busy = false, expectedOrder: string | undefined;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'agreement-paypal-button';
  button.textContent = 'Approve in PayPal Sandbox';
  const showError = () => { if (active) options.onError('PayPal Sandbox Checkout could not complete. Refresh the stored order before retrying; no payment result was inferred.'); };
  const session = instance.createPayPalOneTimePaymentSession({
    // This application asks for approval first; capture is a separate human step.
    commit: false,
    onApprove: async data => {
      if (!active) return;
      if (!expectedOrder || data.orderId !== expectedOrder) { showError(); return; }
      try { await options.onApprove(); } catch { showError(); }
    },
    onCancel: () => { if (active) options.onCancel(); },
    onError: () => showError(),
  });
  const click = () => {
    if (!active || busy) return;
    busy = true;
    button.disabled = true;
    // Start synchronously from the human click so popup presentation is permitted.
    const order = options.createOrder().then(orderId => {
      if (!/^[A-Z0-9]{8,32}$/.test(orderId)) throw new Error('Invalid stored order');
      expectedOrder = orderId;
      return { orderId };
    });
    void session.start({ presentationMode: 'popup' }, order)
      .catch(() => showError())
      .finally(() => { busy = false; if (active) button.disabled = false; });
  };
  button.addEventListener('click', click);
  options.container.replaceChildren(button);
  options.onPhase?.('ready');
  return () => {
    active = false;
    button.removeEventListener('click', click);
    session.destroy();
    button.remove();
  };
}
