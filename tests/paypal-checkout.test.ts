import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PayPalV6Namespace } from '@paypal/paypal-js/sdk-v6';
import { initializeSandboxCheckout, CheckoutInitializationError, type CheckoutPhase } from '../src/paypal-checkout';
import { redirectFallbackAllowed, prepareRedirectApproval } from '../src/paypal-redirect';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function fakeSdk(findEligibleMethods: () => Promise<{ isEligible: (method: string) => boolean }>, seen: unknown[] = []) {
  return { createInstance: async (options: unknown) => { seen.push(options); return { findEligibleMethods }; } } as unknown as PayPalV6Namespace;
}
test('checkout reports each initialization phase and uses supported client-ID authentication without creating an order', async () => {
  const phases: CheckoutPhase[] = [], seen: unknown[] = [];
  const result = await initializeSandboxCheckout('synthetic-public-client', new AbortController().signal, phase => phases.push(phase), async () => fakeSdk(async () => ({ isEligible: method => method === 'paypal' }), seen));
  assert.deepEqual(phases, ['loading-sdk', 'initializing-sdk', 'checking-eligibility']);
  assert.deepEqual(seen, [{ clientId: 'synthetic-public-client', components: ['paypal-payments'], pageType: 'checkout' }]);
  assert.equal(typeof result.findEligibleMethods, 'function');
});
test('checkout cancellation identifies stalled SDK loading and starts no later phase', async () => {
  const controller = new AbortController(), phases: CheckoutPhase[] = [];
  const promise = initializeSandboxCheckout('synthetic', controller.signal, phase => phases.push(phase), () => new Promise(() => {}));
  await tick(); controller.abort();
  await assert.rejects(promise, error => error instanceof CheckoutInitializationError && error.phase === 'loading-sdk' && /timed out/.test(error.message));
  assert.deepEqual(phases, ['loading-sdk']);
});
test('late instance initialization cannot continue to eligibility after unmount or deadline', async () => {
  let finish: ((value: unknown) => void) | undefined, eligibilityCalls = 0;
  const controller = new AbortController(), phases: CheckoutPhase[] = [];
  const sdk = { createInstance: () => new Promise(resolve => { finish = resolve; }) } as unknown as PayPalV6Namespace;
  const promise = initializeSandboxCheckout('synthetic', controller.signal, phase => phases.push(phase), async () => sdk);
  await tick(); controller.abort();
  await assert.rejects(promise, error => error instanceof CheckoutInitializationError && error.phase === 'initializing-sdk');
  finish?.({ findEligibleMethods: async () => { eligibilityCalls++; return { isEligible: () => true }; } });
  await tick(); assert.equal(eligibilityCalls, 0); assert.deepEqual(phases, ['loading-sdk', 'initializing-sdk']);
});
test('stalled eligibility is bounded by cancellation and its late result is ignored', async () => {
  let finish: ((value: { isEligible: (method: string) => boolean }) => void) | undefined;
  const controller = new AbortController(), phases: CheckoutPhase[] = [];
  const promise = initializeSandboxCheckout('synthetic', controller.signal, phase => phases.push(phase), async () => fakeSdk(() => new Promise(resolve => { finish = resolve; })));
  await tick(); controller.abort();
  await assert.rejects(promise, error => error instanceof CheckoutInitializationError && error.phase === 'checking-eligibility');
  finish?.({ isEligible: () => true }); await tick();
  assert.deepEqual(phases, ['loading-sdk', 'initializing-sdk', 'checking-eligibility']);
});
test('checkout distinguishes ineligibility and sanitizes provider initialization errors', async () => {
  await assert.rejects(initializeSandboxCheckout('synthetic', new AbortController().signal, () => {}, async () => fakeSdk(async () => ({ isEligible: () => false }))), /not eligible/);
  const sdk = { createInstance: async () => { throw new Error('private upstream response'); } } as unknown as PayPalV6Namespace;
  await assert.rejects(initializeSandboxCheckout('synthetic', new AbortController().signal, () => {}, async () => sdk), error => error instanceof CheckoutInitializationError && error.phase === 'initializing-sdk' && !error.message.includes('private upstream response'));
});
test('redirect fallback is offered only before eligibility, never after refusal or a ready payment session', () => {
  for (const phase of ['loading-code', 'loading-sdk', 'initializing-sdk'] as const) assert.equal(redirectFallbackAllowed(phase), true);
  for (const phase of ['checking-eligibility', 'preparing-button', 'ready'] as const) assert.equal(redirectFallbackAllowed(phase), false);
});
test('explicit redirect preparation calls only the existing server order callback', async () => {
  let creates = 0;
  const id = await prepareRedirectApproval(async () => { creates++; return 'ORDERTEST12345678'; }, () => true);
  assert.equal(id, 'ORDERTEST12345678'); assert.equal(creates, 1);
  await assert.rejects(prepareRedirectApproval(async () => 'https://arbitrary.invalid', () => true), /valid existing Sandbox order/);
});
test('redirect preparation does not start when stale and ignores a late result after unmount', async () => {
  let creates = 0;
  assert.equal(await prepareRedirectApproval(async () => { creates++; return 'ORDERTEST12345678'; }, () => false), null);
  assert.equal(creates, 0);
  let current = true, finish: ((value: string) => void) | undefined;
  const pending = prepareRedirectApproval(() => new Promise(resolve => { finish = resolve; }), () => current);
  current = false; finish?.('ORDERTEST12345678');
  assert.equal(await pending, null);
});
