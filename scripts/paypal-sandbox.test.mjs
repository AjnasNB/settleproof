import test from 'node:test';
import assert from 'node:assert/strict';
import { run, parseArgs, summary, SANDBOX } from './paypal-sandbox.mjs';

const env = { PAYPAL_CLIENT_ID: 'test-id', PAYPAL_CLIENT_SECRET: 'test-secret' };
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('dry-run needs no credentials and makes no network requests', async () => {
  let output;
  await run(['create', '--invoice', 'SP-DEMO-001', '--amount', '100.00', '--currency', 'USD', '--dry-run'], { env: {}, fetchImpl: () => { throw new Error('must not call'); }, write: value => { output = value; } });
  assert.equal(output.endpoint, SANDBOX + '/v2/checkout/orders');
  assert.equal(output.body.payment_source.paypal.experience_context.shipping_preference, 'NO_SHIPPING');
});

test('unsupported endpoints and unsafe demo inputs are rejected before requests', () => {
  assert.throws(() => parseArgs(['create', '--endpoint', 'https://api-m.paypal.com']));
  assert.throws(() => parseArgs(['create', '--invoice', 'client@example.com', '--amount', '100.00', '--currency', 'USD']));
  assert.throws(() => parseArgs(['create', '--invoice', 'SP-DEMO-001', '--amount', '1e2', '--currency', 'USD']));
  assert.throws(() => parseArgs(['create', '--invoice', 'SP-DEMO-001', '--amount', '0.00', '--currency', 'USD']));
  assert.throws(() => parseArgs(['create', '--invoice', 'SP-DEMO-001', '--amount', '100.00', '--currency', 'JPY']));
});

test('capture refuses an unapproved order and never sends capture POST', async () => {
  const calls = [];
  await assert.rejects(run(['capture', '--order', 'ORDER1234567890'], { env, write() {}, fetchImpl: async (url, options) => {
    calls.push([url, options.method]);
    return json(calls.length === 1 ? { access_token: 'secret-token' } : { id: 'ORDER1234567890', status: 'CREATED' });
  } }), /must be APPROVED/);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([url]) => url.startsWith(SANDBOX + '/')));
});

test('approved capture uses explicit idempotency key and prints only sanitized receipt', async () => {
  const calls = [];
  let output;
  await run(['capture', '--order', 'ORDER1234567890', '--request-id', 'capture-demo-0001'], { env, write: value => { output = value; }, fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (calls.length === 1) return json({ access_token: 'secret-token' });
    if (calls.length === 2) return json({ id: 'ORDER1234567890', status: 'APPROVED' });
    return json({ id: 'ORDER1234567890', status: 'COMPLETED', payer: { email_address: 'private@example.com' }, purchase_units: [{ payments: { captures: [{ id: 'CAPTURE1234', status: 'COMPLETED', amount: { value: '100.00', currency_code: 'USD' }, seller_receivable_breakdown: { private: true } }] } }] });
  } });
  assert.equal(calls[2][1].headers['PayPal-Request-Id'], 'capture-demo-0001');
  assert.equal(output.captures[0].amount, '100.00');
  assert.ok(!JSON.stringify(output).includes('private'));
  assert.ok(!JSON.stringify(output).includes('secret'));
});

test('raw API errors and credentials never enter the surfaced error', async () => {
  await assert.rejects(run(['status', '--order', 'ORDER1234567890'], { env, write() {}, fetchImpl: async () => new Response('test-secret private@example.com', { status: 401 }) }), error => !error.message.includes('test-secret') && !error.message.includes('private@') && /401/.test(error.message));
});

test('summary refuses production approval links and personal fields', () => {
  const result = summary({ id: 'ORDER1234567890', status: 'CREATED', payer: { name: 'Private Person' }, links: [{ rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=ORDER1234567890' }] });
  assert.equal(result.approvalUrl, undefined);
  assert.equal(result.payer, undefined);
});

test('sandbox approval link retains only the matching order token', () => {
  const result = summary({ id: 'ORDER1234567890', status: 'CREATED', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1234567890&email=private%40example.com#private' }] });
  assert.equal(result.approvalUrl, 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1234567890');
});
