#!/usr/bin/env node
/** Create, inspect or explicitly capture a fictitious PayPal sandbox order. */
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const SANDBOX = 'https://api-m.sandbox.paypal.com';
const HELP = `SettleProof — fictitious PayPal sandbox orders only

Node 22+; secrets come from process.env, never command-line arguments.
  node --env-file=.dev.vars scripts/paypal-sandbox.mjs create --invoice SP-DEMO-001 --amount 100.00 --currency USD
  node --env-file=.dev.vars scripts/paypal-sandbox.mjs status --order ORDER_ID
  node --env-file=.dev.vars scripts/paypal-sandbox.mjs capture --order ORDER_ID --request-id YOUR_UNIQUE_ID

create prints a sandbox approval URL. Approve with a fictitious personal
sandbox account, then run capture. Capture first checks for APPROVED status.
--dry-run validates and prints the plan without reading credentials or calling APIs.
No production endpoint, refund, transfer, raw API dump or automatic approval exists.
`;

/**
 * Validate CLI flags without reading credentials.
 * @param {string[]} args Command and flags, excluding node/script paths.
 * @returns {{command:string, values?:Record<string,string|boolean>}} Parsed operation.
 * @throws {Error} If an operation, flag, invoice, currency, amount or ID is invalid.
 */
export function parseArgs(args) {
  if (!args.length || args.includes('--help')) return { command: 'help' };
  const [command, ...flags] = args;
  if (!['create', 'status', 'capture'].includes(command)) throw new Error('Use create, status, capture or --help.');
  const values = {};
  for (let i = 0; i < flags.length; i++) {
    const key = flags[i];
    if (key === '--dry-run') { values.dryRun = true; continue; }
    if (!['--invoice', '--amount', '--currency', '--order', '--request-id'].includes(key)) throw new Error('Unsupported flag. See --help.');
    const value = flags[++i];
    if (!value || value.startsWith('--') || values[key]) throw new Error('Missing or repeated flag value.');
    values[key] = value;
  }
  const allowed = command === 'create' ? ['--invoice', '--amount', '--currency', '--request-id'] : command === 'capture' ? ['--order', '--request-id'] : ['--order'];
  if (Object.keys(values).some(key => key !== 'dryRun' && !allowed.includes(key))) throw new Error('Flag is not valid for this command.');
  if (command === 'create') {
    if (!/^SP-DEMO-[A-Z0-9-]{1,50}$/.test(values['--invoice'] || '')) throw new Error('Use a synthetic invoice ID beginning SP-DEMO- and uppercase letters/numbers/hyphens only.');
    if (!/^(?:0|[1-9][0-9]{0,4})\.[0-9]{2}$/.test(values['--amount'] || '')) throw new Error('Use a positive two-decimal amount, for example 100.00.');
    const minor = BigInt(values['--amount'].replace('.', ''));
    if (minor < 1n || minor > 1000000n) throw new Error('Demo amount must be between 0.01 and 10000.00.');
    if (!['USD', 'EUR', 'GBP'].includes(values['--currency'])) throw new Error('Supported currencies: USD, EUR, GBP.');
  } else if (!/^[A-Za-z0-9]{10,32}$/.test(values['--order'] || '')) throw new Error('Provide a valid PayPal sandbox order ID.');
  if (values['--request-id'] && !/^[A-Za-z0-9_-]{8,64}$/.test(values['--request-id'])) throw new Error('Request ID must contain 8–64 letters, digits, hyphens or underscores.');
  return { command, values };
}

/**
 * Build a synthetic order body without payer details, cards or shipping.
 * @param {Record<string,string>} values Validated create flags.
 * @returns {object} PayPal Orders v2 request body.
 */
export function orderBody(values) {
  return {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: values['--invoice'], invoice_id: values['--invoice'], amount: { currency_code: values['--currency'], value: values['--amount'] } }],
    payment_source: { paypal: { experience_context: {
      shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW',
      return_url: 'http://localhost:8797/?sandbox-approved=1',
      cancel_url: 'http://localhost:8797/?sandbox-cancelled=1',
    } } },
  };
}

function safeId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : 'UNKNOWN'; }
function safeStatus(value) { return ['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED', 'PENDING', 'DECLINED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'DENIED'].includes(value) ? value : 'UNKNOWN'; }

/**
 * Allowlist a printed receipt, omitting PayPal personal information.
 * @param {object} order PayPal order representation; never printed directly.
 * @returns {object} Sandbox IDs/statuses, capture amounts and optional safe approval URL.
 */
export function summary(order) {
  const result = {
    environment: 'paypal-sandbox', orderId: safeId(order?.id), status: safeStatus(order?.status),
    captures: (order?.purchase_units || []).flatMap(unit => unit?.payments?.captures || []).map(capture => ({
      id: safeId(capture.id), status: safeStatus(capture.status),
      amount: /^\d{1,12}\.\d{2}$/.test(capture.amount?.value || '') ? capture.amount.value : null,
      currency: ['USD', 'EUR', 'GBP'].includes(capture.amount?.currency_code) ? capture.amount.currency_code : null,
    })),
  };
  const link = (order?.links || []).find(item => ['approve', 'payer-action'].includes(item.rel));
  if (link?.href) {
    try {
      const url = new URL(link.href);
      const token = url.searchParams.get('token');
      if (url.protocol === 'https:' && url.hostname === 'www.sandbox.paypal.com' && !url.username && !url.password && token === order.id && /^[A-Za-z0-9]{10,32}$/.test(token)) {
        result.approvalUrl = `${url.origin}${url.pathname}?token=${encodeURIComponent(token)}`;
      }
    } catch { /* Do not print an untrusted or malformed approval URL. */ }
  }
  return result;
}

async function readResponse(response) {
  if (!response.ok) throw new Error(`PayPal sandbox request failed (HTTP ${response.status}). Raw API errors are withheld to protect credentials and personal data.`);
  try { return await response.json(); } catch { throw new Error('PayPal sandbox returned an unreadable response.'); }
}

/**
 * Execute a validated sandbox command. Injected fetch permits no-network tests.
 * @param {string[]} args CLI command and flags.
 * @param {object} options Optional environment, fetch implementation and output callback.
 * @returns {Promise<void>} Prints only allowlisted output via the callback.
 * @throws {Error} On input, authentication, network, provider or approval-state failure.
 */
export async function run(args, { env = process.env, fetchImpl = fetch, write = value => console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2)) } = {}) {
  const { command, values } = parseArgs(args);
  if (command === 'help') { write(HELP); return; }
  const orderPath = `/v2/checkout/orders/${values['--order'] || ''}`;
  if (values.dryRun) {
    write({ dryRun: true, environment: 'paypal-sandbox', command,
      endpoint: SANDBOX + (command === 'create' ? '/v2/checkout/orders' : orderPath + (command === 'capture' ? '/capture' : '')),
      ...(command === 'create' ? { body: orderBody(values) } : {}),
      ...(command === 'capture' ? { prerequisite: 'GET order details and require status APPROVED before POST capture.' } : {}),
    });
    return;
  }
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret || /replace_|your_/i.test(clientId + clientSecret)) throw new Error('Set sandbox PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the server environment.');
  const send = async (path, options) => {
    try { return await fetchImpl(SANDBOX + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('PayPal sandbox could not be reached. Inspect order status before retrying a capture.'); }
  };
  const auth = await readResponse(await send('/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  }));
  if (typeof auth.access_token !== 'string' || !auth.access_token) throw new Error('PayPal sandbox did not issue an access token.');
  const headers = { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const requestId = values['--request-id'] || randomUUID();
  if (command === 'create') {
    const data = await readResponse(await send('/v2/checkout/orders', { method: 'POST', headers: { ...headers, 'PayPal-Request-Id': requestId }, body: JSON.stringify(orderBody(values)) }));
    write({ ...summary(data), requestId, expected: { invoiceId: values['--invoice'], amount: values['--amount'], currency: values['--currency'] } });
    return;
  }
  const order = await readResponse(await send(orderPath, { method: 'GET', headers }));
  if (command === 'status') { write(summary(order)); return; }
  if (order.status !== 'APPROVED') throw new Error('Capture refused: sandbox order must be APPROVED. Use status to inspect it; never approve with a live account.');
  const data = await readResponse(await send(orderPath + '/capture', { method: 'POST', headers: { ...headers, 'PayPal-Request-Id': requestId }, body: '{}' }));
  write({ ...summary(data), requestId });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
