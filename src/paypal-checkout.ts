import { loadCoreSdkScript, type PayPalV6Namespace } from '@paypal/paypal-js/sdk-v6';

export type CheckoutOptions = {
  container: HTMLElement;
  clientId: string;
  createOrder: () => Promise<string>;
  /** Approval triggers a fresh server read. Capture requires a separate human action. */
  onApprove: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
};
let sandboxSdk: Promise<PayPalV6Namespace | null> | undefined;

/** Loads only the official Sandbox v6 SDK. Never receives a server secret or payer data. */
export async function mountPayPalCheckout(options: CheckoutOptions): Promise<() => void> {
  const sdk = await (sandboxSdk ??= loadCoreSdkScript({ environment: 'sandbox' }).catch(error => {
    sandboxSdk = undefined;
    throw error;
  }));
  if (!sdk || !options.container.isConnected) throw new Error('The PayPal Sandbox SDK could not be loaded. No payment result was inferred.');
  const instance = await sdk.createInstance({ clientId: options.clientId, components: ['paypal-payments'], pageType: 'checkout' });
  const eligibility = await instance.findEligibleMethods({ currencyCode: 'USD' });
  if (!eligibility.isEligible('paypal')) throw new Error('PayPal Sandbox Checkout is not eligible in this browser. No order was captured.');
  if (!options.container.isConnected) return () => {};
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
  return () => {
    active = false;
    button.removeEventListener('click', click);
    session.destroy();
    button.remove();
  };
}
