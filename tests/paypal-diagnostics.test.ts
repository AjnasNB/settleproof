import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePayPalDiagnostic, sdkCreateOrder, retainPayPalDiagnostic, MAX_RETAINED_PAYPAL_DIAGNOSTICS, type PayPalDiagnostic } from '../src/agreements/paypal-sdk';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const env = { PAYPAL_CLIENT_ID: 'synthetic-client', PAYPAL_CLIENT_SECRET: 'PRIVATE-SYNTHETIC-SECRET' };
const privateText = 'PRIVATE-SYNTHETIC-SECRET customer@example.invalid Alice Example Bearer secret-token';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

test('PayPal diagnostics select protocol codes and hex correlation only, ignoring request, messages, fields, values and unrelated headers', () => {
  const safe = sanitizePayPalDiagnostic('create-order', 'http-error', {
    statusCode: 422,
    request: { headers: { authorization: privateText }, body: privateText }, message: privateText,
    headers: { authorization: privateText, 'set-cookie': privateText, 'paypal-debug-id': 'f6e815a13b47e' },
    body: JSON.stringify({ name: 'UNPROCESSABLE_ENTITY', message: privateText, debug_id: 'f6e815a13b47e',
      details: [{ issue: 'DUPLICATE_INVOICE_ID', description: privateText, field: privateText, value: privateText }, { issue: 'Bearer secret-token' }], payer: { email: privateText } }),
  });
  assert.deepEqual(safe, { event: 'paypal-sandbox-diagnostic', operation: 'create-order', reason: 'http-error', httpStatus: 422, providerName: 'UNPROCESSABLE_ENTITY', issues: ['DUPLICATE_INVOICE_ID'], debugId: 'f6e815a13b47e' });
  assert.equal(JSON.stringify(safe).includes('PRIVATE'), false); assert.equal(JSON.stringify(safe).includes('customer@'), false);
});
test('PayPal diagnostics reject malformed codes/status/debug IDs and never inspect inherited or getter fields', () => {
  const inherited = Object.create({ statusCode: 401, body: { name: 'AUTHENTICATION_FAILURE' } });
  Object.defineProperty(inherited, 'headers', { get: () => { throw new Error(privateText); } });
  assert.deepEqual(sanitizePayPalDiagnostic('oauth', 'sdk-error', inherited), { event: 'paypal-sandbox-diagnostic', operation: 'oauth', reason: 'sdk-error' });
  const safe = sanitizePayPalDiagnostic('create-order', 'http-error', { statusCode: 422.5, body: { name: 'ALICE_EXAMPLE', debug_id: privateText, details: [{ issue: 'person@example.invalid' }] }, headers: { 'paypal-debug-id': 'BearerSECRET' } });
  assert.deepEqual(safe, { event: 'paypal-sandbox-diagnostic', operation: 'create-order', reason: 'http-error' });
});
test('persisted diagnostic collector revalidates schema and keeps at most four recent safe entries', () => {
  const retained: PayPalDiagnostic[] = [];
  retainPayPalDiagnostic(retained, { event: 'paypal-sandbox-diagnostic', operation: privateText, reason: 'sdk-error' });
  retainPayPalDiagnostic(retained, { event: 'paypal-sandbox-diagnostic', operation: 'create-order', reason: privateText });
  assert.equal(retained.length, 0);
  for (let i = 0; i < 10; i++) retainPayPalDiagnostic(retained, { event: 'paypal-sandbox-diagnostic', operation: 'create-order', reason: 'http-error', httpStatus: 400, providerName: 'INVALID_REQUEST', issues: ['MISSING_REQUIRED_PARAMETER', privateText], debugId: '90957fca61718', message: privateText, headers: { authorization: privateText }, url: privateText });
  assert.equal(retained.length, MAX_RETAINED_PAYPAL_DIAGNOSTICS);
  assert.equal(JSON.stringify(retained).includes('PRIVATE'), false);
  assert.ok(retained.every(value => value.issues?.length === 1 && !Object.hasOwn(value, 'message') && !Object.hasOwn(value, 'url')));
});
test('SDK OAuth failure is distinguishable before order creation without logging credentials or provider descriptions', async () => {
  const diagnostics: PayPalDiagnostic[] = []; let calls = 0;
  const fake = (async () => { calls++; return json({ error: 'invalid_client', error_description: privateText, debug_id: '10398537340c8' }, 401); }) as typeof fetch;
  await assert.rejects(sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', fake, value => diagnostics.push(value)));
  assert.equal(calls, 1);
  assert.ok(diagnostics.some(value => value.operation === 'oauth' && value.httpStatus === 401 && value.providerName === 'invalid_client'));
  assert.equal(JSON.stringify(diagnostics).includes('PRIVATE'), false); assert.equal(JSON.stringify(diagnostics).includes('customer@'), false);
});
test('SDK Orders HTTP diagnostics preserve safe issue and request behavior while dropping the private exception payload', async () => {
  const diagnostics: PayPalDiagnostic[] = []; let orderPosts = 0;
  const fake = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/oauth2/token')) return json({ access_token: privateText, token_type: 'Bearer', expires_in: 300 });
    orderPosts++; return json({ name: 'INVALID_REQUEST', message: privateText, debug_id: '90957fca61718', details: [{ issue: 'MISSING_REQUIRED_PARAMETER', value: privateText, description: privateText }] }, 400);
  }) as typeof fetch;
  await assert.rejects(sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', fake, value => diagnostics.push(value)));
  assert.equal(orderPosts, 1);
  assert.ok(diagnostics.some(value => value.operation === 'oauth' && value.httpStatus === 200));
  assert.ok(diagnostics.some(value => value.operation === 'create-order' && value.httpStatus === 400 && value.issues?.[0] === 'MISSING_REQUIRED_PARAMETER'));
  assert.equal(JSON.stringify(diagnostics).includes('PRIVATE'), false); assert.equal(JSON.stringify(diagnostics).includes('secret-token'), false);
});
test('SDK response-validation and transport failures use fixed reasons without printing upstream errors', async () => {
  const validation: PayPalDiagnostic[] = [];
  await assert.rejects(sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', (async () => json({ access_token: { private: privateText }, token_type: 'Bearer' }, 200)) as typeof fetch, value => validation.push(value)));
  assert.ok(validation.some(value => value.reason === 'response-validation' && value.httpStatus === 200));
  const transport: PayPalDiagnostic[] = [];
  await assert.rejects(sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', (async () => { throw new Error(privateText); }) as typeof fetch, value => transport.push(value)));
  assert.ok(transport.some(value => value.operation === 'oauth' && value.reason === 'transport-error'));
  assert.equal(JSON.stringify([...validation, ...transport]).includes('PRIVATE'), false);
});
test('a failing diagnostic sink cannot change the SDK payment result', async () => {
  const orderId = 'ORDERTEST12345678';
  const fake = (async (input: RequestInfo | URL) => String(input).endsWith('/oauth2/token') ? json({ access_token: 'synthetic-token', token_type: 'Bearer', expires_in: 300 }) : json({ id: orderId, status: 'CREATED' }, 201)) as typeof fetch;
  const result = await sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', fake, () => { throw new Error(privateText); });
  assert.equal(result.orderId, orderId);
});
test('SDK constructor failures produce a safe initialization diagnostic before any fetch', async () => {
  const diagnostics: PayPalDiagnostic[] = []; let calls = 0;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, get() { throw new Error(privateText); } });
    await assert.rejects(sdkCreateOrder(env, 'SP-SYNTHETIC-v1-m1', '12.00', 'same-persisted-request', 'https://settleproof.test', (async () => { calls++; return json({}); }) as typeof fetch, value => diagnostics.push(value)));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
  assert.equal(calls, 0);
  assert.deepEqual(diagnostics, [{ event: 'paypal-sandbox-diagnostic', operation: 'create-order', reason: 'sdk-initialization' }]);
});
test('real Worker SDK factory constructs with node compatibility without making a provider call', { timeout: 15000 }, async () => {
  const bundle = await build({ stdin: { contents: `import {sdkControllers} from './src/agreements/paypal-sdk';
    export default {fetch() { let calls=0; const controllers=sdkControllers({PAYPAL_CLIENT_ID:'SYNTHETIC-CLIENT',PAYPAL_CLIENT_SECRET:'SYNTHETIC-SECRET'}, async()=>{calls++; throw new Error('No provider call allowed');},()=>{}); return Response.json({constructed:!!controllers.orders && !!controllers.payments,calls,buffer:typeof Buffer,process:typeof process,navigator:typeof navigator}); }};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent' });
  const config = { name: 'sdk-factory-probe', compatibilityDate: '2026-10-17', compatibilityFlags: ['nodejs_compat'], manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm' as const, contents: bundle.outputFiles[0].text } } }, exports: { default: { type: 'worker' as const } } };
  const mf = new Miniflare({ cf: false, workers: [{ config }] });
  try {
    const result = await (await mf.dispatchFetch('https://sdk-factory.test/')).json() as { constructed: boolean; calls: number };
    assert.equal(result.constructed, true); assert.equal(result.calls, 0);
  } finally { await mf.dispose(); }
});
