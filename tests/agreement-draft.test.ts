import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAgreementDraft, parseDraftInput, validateDraft } from '../src/agreement-draft';
import type { Bindings } from '../src/core/api';
const input = { brief: 'Design a two-page cafe menu; supply a preview and final editable files.', amounts: ['12.00', '8.00'] };
const response = { milestones: [{ title: 'Preview', criteria: 'Provide both menu pages for human review.' }, { title: 'Editable files', criteria: 'Provide editable source files matching the accepted preview.' }], questions: ['Which file format is required?'] };
test('draft input rejects fractional cents, zero, excess budget and contact details', () => {
  assert.deepEqual(parseDraftInput(input), input);
  for (const change of [{ amounts: ['12.001', '8.00'] }, { amounts: ['0.00', '8.00'] }, { amounts: ['200.00', '0.01'] }, { brief: 'Email user@example.com' }, { brief: 'Use https://example.com' }, { amounts: [] }, { unexpected: true }])
    assert.throws(() => parseDraftInput({ ...input, ...change }));
});
test('a single manually supported milestone is also accepted by the AI draft boundary', () => {
  const single = parseDraftInput({ ...input, amounts: ['20.00'] });
  const result = validateDraft({ milestones: [response.milestones[0]], questions: [] }, single);
  assert.equal(result.status, 'generated');
  assert.equal(result.milestones[0].amount, '20.00');
});
test('draft output cannot set amounts and supplied amounts are retained', () => {
  const result = validateDraft({ response: JSON.stringify(response) }, input);
  assert.equal(result.status, 'generated');
  assert.deepEqual(result.milestones.map(m => m.amount), input.amounts);
  assert.equal(validateDraft({ ...response, amount: '0.01' }, input).status, 'invalid');
  assert.equal(validateDraft({ ...response, milestones: [{ ...response.milestones[0], amount: '0.01' }, response.milestones[1]] }, input).status, 'invalid');
});
test('unsupported promises, contacts, missing items and malformed JSON fail closed', () => {
  for (const raw of ['{', { ...response, milestones: [] }, { ...response, milestones: [{ title: 'Guaranteed escrow', criteria: 'Pay USD 5.' }, response.milestones[1]] }, { ...response, questions: ['Contact me@example.com'] }])
    assert.equal(validateDraft({ response: typeof raw === 'string' ? raw : JSON.stringify(raw) }, input).status, 'invalid');
});
test('disabled or unreservable AI never starts inference', async () => {
  let calls = 0;
  const request = new Request('https://test.example/api/agreement-draft');
  const env = { AI_ENABLED: 'true', AI: { run: async () => { calls++; return response; } } } as Bindings;
  assert.equal((await generateAgreementDraft(input, request, env)).status, 'unavailable');
  Object.assign(env, { AI_RATE: { limit: async () => ({ success: true }) }, AI_SHARED_RATE: { limit: async () => ({ success: true }) }, AI_BUDGET: { getByName: () => ({ reserve: async () => ({ allowed: false, remaining: 0 }) }) } });
  await assert.rejects(generateAgreementDraft(input, request, env), /daily AI quota/i);
  assert.equal(calls, 0);
});
