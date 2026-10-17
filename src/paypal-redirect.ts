import type { CheckoutPhase } from './paypal-checkout';

/** Never turn a provider eligibility result or payment-session refusal into a fallback. */
export const redirectFallbackAllowed = (phase: CheckoutPhase | 'loading-code'): boolean => ['loading-code', 'loading-sdk', 'initializing-sdk'].includes(phase);

/** Called only by the human's redirect button; the existing server callback keeps all payment gates. */
export async function prepareRedirectApproval(createOrder: () => Promise<string>, isCurrent: () => boolean): Promise<string | null> {
  if (!isCurrent()) return null;
  const orderId = await createOrder();
  if (!isCurrent()) return null;
  if (!/^[A-Z0-9]{8,32}$/.test(orderId)) throw new Error('The server did not return a valid existing Sandbox order. Refresh the room before trying again.');
  return orderId;
}
