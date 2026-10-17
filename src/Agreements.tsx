import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowSquareOut, Check, CheckCircle, CircleNotch, Copy, DownloadSimple, FileText, Fingerprint, Handshake, LockSimple, Plus, Receipt, ShieldCheck, Sparkle, X } from "@phosphor-icons/react";
import type { AgreementAction, AgreementConfig, AgreementCreateResponse, AgreementMilestone, AgreementResponse, AgreementRole, AgreementRoom, AgreementTerms, ReceiptPacket, ReceiptVerification } from "./agreements/types";
import { prepareReceiptInput, RECEIPT_RAW_CHARACTER_LIMIT } from "./receipt-input";

type Access = { id: string; role: AgreementRole; cap: string };
type Proposal = { status: "generated" | "unavailable" | "invalid"; model?: string; milestones?: { title: string; amount: string; criteria: string }[]; questions: string[]; message?: string };
const example: AgreementTerms = {
  title: "A landing page, with clear handoffs",
  description: "Invented sandbox project: design a single-page website for a small independent studio. Deliver a wireframe first, then a final handoff. No real customer data.",
  milestones: [
    { title: "Wireframe", amount: "12.00", acceptance: "A one-page desktop wireframe showing the introduction, services and contact sections. Buyer checks each section before accepting." },
    { title: "Final handoff", amount: "8.00", acceptance: "A final desktop and mobile design plus a handoff note explaining the type, colors and spacing. Buyer checks both sizes before accepting." },
  ],
};
function readAccess(): Access | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const id = params.get("agreement"), cap = params.get("cap"), role = params.get("role");
  return id && cap && (role === "buyer" || role === "seller") ? { id, cap, role } : null;
}
function accessUrl(access: Access) {
  return `${window.location.origin}/#${new URLSearchParams({ agreement: access.id, role: access.role, cap: access.cap })}`;
}
function cents(amount: string) { return /^\d{1,3}(?:\.\d{1,2})?$/.test(amount) ? Math.round(Number(amount) * 100) : NaN; }
function money(amount: string) { return `$${Number(amount).toFixed(2)}`; }
function amountIssue(amount: string): string | null {
  if (!amount.trim()) return "Enter a USD amount; an empty amount is not zero.";
  if (/^\d+\.\d{3,}$/.test(amount)) return "Use no more than two decimal places, such as 12.00.";
  if (!Number.isFinite(cents(amount))) return "Use a positive USD amount, such as 12.00.";
  if (cents(amount) === 0) return "The milestone amount must be greater than $0.00.";
  if (cents(amount) > 20000) return "Each milestone must be $200.00 or less; the agreement total also cannot exceed $200.00.";
  return null;
}
function draftIssues(terms: AgreementTerms): string[] {
  const issues: string[] = [];
  if (terms.title.trim().length < 3) issues.push("Give the project a title of at least 3 characters.");
  if (terms.description.trim().length < 10) issues.push("Describe the agreement in at least 10 characters.");
  for (const [index, milestone] of terms.milestones.entries()) {
    const amountError = amountIssue(milestone.amount);
    if (amountError) issues.push(`Milestone ${index + 1}: ${amountError}`);
    if (milestone.title.trim().length < 3) issues.push(`Milestone ${index + 1} needs a title of at least 3 characters.`);
    if (milestone.acceptance.trim().length < 10) issues.push(`Milestone ${index + 1} needs acceptance criteria of at least 10 characters.`);
  }
  const values = terms.milestones.map((milestone) => cents(milestone.amount));
  if (values.every(Number.isFinite) && values.reduce((sum, value) => sum + value, 0) > 20000)
    issues.push("The combined agreement total cannot exceed $200.00 USD. Reduce the milestone amounts.");
  return issues;
}
function normalizedTerms(terms: AgreementTerms): AgreementTerms { return { ...terms, milestones: terms.milestones.map((milestone) => ({ ...milestone, amount: (cents(milestone.amount) / 100).toFixed(2) })) }; }
function sandboxApproval(url?: string, orderId?: string): string | null { try { const parsed = new URL(url || ""); return parsed.origin === "https://www.sandbox.paypal.com" && parsed.pathname === "/checkoutnow" && !parsed.hash && !parsed.username && !parsed.password && /^[A-Z0-9]{8,32}$/.test(orderId || "") && parsed.searchParams.get("token") === orderId ? parsed.href : null; } catch { return null; } }
function readable(type: string) { return type.replaceAll("-", " ").replaceAll("_", " "); }
function time(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
async function api<T>(path: string, init: RequestInit = {}, access?: Access | null): Promise<T> {
  const controller = init.signal ? null : new AbortController();
  let timedOut = false;
  const timer = controller ? window.setTimeout(() => { timedOut = true; controller.abort(); }, 35_000) : null;
  try {
    const response = await fetch(path, { ...init, signal: init.signal ?? controller!.signal, headers: { "Content-Type": "application/json", ...(access ? { "X-Role-Capability": access.cap } : {}), ...init.headers } });
    const body = await response.json().catch((cause) => { if (timedOut) throw cause; return null; }) as { error?: { message?: string } } | null;
    if (!response.ok) throw new Error(body?.error?.message || `Request could not finish (${response.status}). Try refreshing this room.`);
    return body as T;
  } catch (cause) {
    if (timedOut) throw new Error("The request timed out and its result is unknown. Refresh the existing room and payment evidence before retrying. Do not start a new payment to resolve a timeout.");
    throw cause;
  } finally { if (timer !== null) window.clearTimeout(timer); }
}
function download(name: string, content: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PayPalButton({ clientId, createOrder, onApprove, onCancel, onError }: { clientId: string; createOrder: () => Promise<string>; onApprove: () => Promise<void>; onCancel: () => void; onError: (message: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ createOrder, onApprove, onCancel, onError });
  callbacks.current = { createOrder, onApprove, onCancel, onError };
  useEffect(() => {
    let active = true, cleanup: (() => void) | undefined;
    void import("./paypal-checkout").then(({ mountPayPalCheckout }) => {
      if (!active || !container.current) return;
      return mountPayPalCheckout({ container: container.current, clientId,
        createOrder: () => callbacks.current.createOrder(), onApprove: () => callbacks.current.onApprove(),
        onCancel: () => callbacks.current.onCancel(), onError: (message: string) => callbacks.current.onError(message),
      });
    }).then((value) => { if (active) cleanup = value; else value?.(); }).catch(() => { if (active) callbacks.current.onError("PayPal Checkout did not load. Refresh the page or try again later."); });
    return () => { active = false; cleanup?.(); };
  }, [clientId]);
  return <div className="ag-paypal-mount" ref={container} aria-label="PayPal sandbox checkout" />;
}

export default function Agreements() {
  const [access, setAccess] = useState<Access | null>(readAccess);
  const [config, setConfig] = useState<AgreementConfig | null>(null);
  const [room, setRoom] = useState<AgreementRoom | null>(null);
  const [draft, setDraft] = useState<AgreementTerms>(() => structuredClone(example));
  const [invites, setInvites] = useState<{ buyer: Access; seller: Access } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [brief, setBrief] = useState(example.description);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [verifyText, setVerifyText] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [anchorSequence, setAnchorSequence] = useState("");
  const [anchorHash, setAnchorHash] = useState("");
  const [verification, setVerification] = useState<ReceiptVerification | null>(null);
  const [anchorResult, setAnchorResult] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<string | null>(null);
  const epoch = useRef(0);
  const currentAccess = useRef(access); currentAccess.current = access;
  const currentRoom = useRef(room); currentRoom.current = room;
  const draftSnapshot = useRef({ brief, draft }); draftSnapshot.current = { brief, draft };
  const receiptInputSnapshot = useRef("");
  receiptInputSnapshot.current = JSON.stringify({ verifyText, anchorSequence, anchorHash });
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => { const update = () => { epoch.current++; setAccess(readAccess()); setRoom(null); setBusy(null); setChecked(false); setError(""); setNotice(""); setActiveCheckout(null); setShowEditor(false); }; window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => { void api<AgreementConfig>("/api/agreements/config").then(setConfig).catch(() => setConfig({ environment: "sandbox", configured: false })); }, []);
  useEffect(() => {
    if (!access) return;
    const ticket = ++epoch.current;
    setBusy("load");
    void api<AgreementResponse>(`/api/agreements/${encodeURIComponent(access.id)}`, {}, access)
      .then((result) => { if (epoch.current === ticket) { if (result.role !== access.role) throw new Error("This link's role label does not match its access token. Use the original complete access link."); setRoom(result.room); setDraft(termsFrom(result.room)); } })
      .catch((cause: Error) => { if (epoch.current === ticket) setError(cause.message); })
      .finally(() => { if (epoch.current === ticket) setBusy(null); });
    return () => { epoch.current++; };
  }, [access]);
  useEffect(() => { setChecked(false); setActiveCheckout(null); }, [room?.version, access?.role]);

  function switchTo(next: Access) {
    window.location.hash = new URLSearchParams({ agreement: next.id, role: next.role, cap: next.cap }).toString();
  }
  function reset() { epoch.current++; window.history.pushState(null, "", "/"); setAccess(null); setRoom(null); setInvites(null); setBusy(null); setError(""); setNotice(""); setActiveCheckout(null); setShowEditor(false); setDraft(structuredClone(example)); }
  function begin(label: string) { setBusy(label); setError(""); setNotice(""); return epoch.current; }
  async function act(action: AgreementAction, label: string): Promise<AgreementRoom> {
    const active = currentAccess.current;
    if (!active) throw new Error("Open a buyer or seller access link first.");
    const ticket = begin(label);
    try {
      const result = await api<AgreementResponse>(`/api/agreements/${encodeURIComponent(active.id)}/actions`, { method: "POST", body: JSON.stringify(action) }, active);
      if (ticket === epoch.current) { setRoom(result.room); setNotice("Room updated. The receipt records this action."); }
      return result.room;
    } catch (cause) { if (ticket === epoch.current) setError((cause as Error).message); throw cause; }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  function run(action: AgreementAction, label: string) { void act(action, label).catch(() => undefined); }
  async function refresh() {
    if (!access) return;
    const ticket = begin("refresh");
    try { const result = await api<AgreementResponse>(`/api/agreements/${encodeURIComponent(access.id)}`, {}, access); if (ticket === epoch.current) { setRoom(result.room); setNotice("Latest room state loaded."); } }
    catch (cause) { if (ticket === epoch.current) setError((cause as Error).message); }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); if (!validDraft(draft)) { setError("Use complete milestone titles and criteria, with a total from $0.01 to $200.00."); return; }
    const ticket = begin("create");
    try {
      const result = await api<AgreementCreateResponse>("/api/agreements", { method: "POST", body: JSON.stringify(normalizedTerms(draft)) });
      if (ticket !== epoch.current) return;
      const buyer: Access = { id: result.room.id, role: "buyer", cap: result.buyerCapability }, seller: Access = { id: result.room.id, role: "seller", cap: result.sellerCapability };
      setInvites({ buyer, seller }); setRoom(result.room); switchTo(seller);
      setNotice("Room created. Save both private access links before leaving this page.");
    } catch (cause) { if (ticket === epoch.current) setError((cause as Error).message); }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  async function suggest() {
    const ticket = begin("ai"); setProposal(null);
    const input = { brief, amounts: normalizedTerms(draft).milestones.map((milestone) => milestone.amount) };
    try {
      const result = await api<Proposal>("/api/agreement-draft", { method: "POST", body: JSON.stringify(input) });
      if (ticket !== epoch.current) return;
      const latest = { brief: draftSnapshot.current.brief, amounts: normalizedTerms(draftSnapshot.current.draft).milestones.map((milestone) => milestone.amount) };
      if (JSON.stringify(input) !== JSON.stringify(latest)) { setNotice("The brief or amounts changed while AI was drafting. Request a fresh proposal when ready."); return; }
      setProposal(result);
      setNotice(result.status === "generated" ? "AI draft ready for your review. Nothing has been saved or accepted." : "AI drafting is unavailable. You can complete the agreement manually.");
    } catch (cause) { if (ticket === epoch.current) setError((cause as Error).message); }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  async function exportReceipt() {
    if (!access) return;
    const ticket = begin("export");
    try { const packet = await api<ReceiptPacket>(`/api/agreements/${encodeURIComponent(access.id)}/export`, {}, access); if (ticket === epoch.current) { download(`settleproof-${packet.room.id}-receipt.json`, packet); setVerifyText(JSON.stringify(packet, null, 2)); setReceiptError(""); setVerification(null); setAnchorResult(null); setAnchorSequence(String(packet.anchor.sequence)); setAnchorHash(packet.anchor.hash); setNotice("Receipt download requested. Its saved sequence and hash can anchor a later verification."); } }
    catch (cause) { if (ticket === epoch.current) setError((cause as Error).message); }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); const ticket = begin("verify"); setVerification(null); setAnchorResult(null); setReceiptError("");
    const inputSnapshot = receiptInputSnapshot.current;
    const canApplyResult = () => {
      if (ticket !== epoch.current) return false;
      if (receiptInputSnapshot.current !== inputSnapshot) {
        setVerification(null); setAnchorResult(null); setReceiptError("Inputs changed; verify again.");
        return false;
      }
      return true;
    };
    try {
      const retainedAnchor = anchorSequence || anchorHash ? { sequence: Number(anchorSequence), hash: anchorHash } : undefined;
      const { packet, body } = prepareReceiptInput(verifyText, retainedAnchor);
      const result = await api<ReceiptVerification>("/api/agreements/verify", { method: "POST", body });
      if (!canApplyResult()) return;
      setVerification(result);
      if (anchorSequence || anchorHash) {
        const sequence = Number(anchorSequence), prefix = Array.isArray(packet.events) ? packet.events.find((event) => event.sequence === sequence) : undefined;
        setAnchorResult(result.valid && Number.isInteger(sequence) && sequence > 0 && /^[a-f0-9]{64}$/i.test(anchorHash) && prefix?.hash === anchorHash ? `Matches the retained anchor at event ${sequence}. Later valid events are allowed.` : "Does not match that retained sequence and hash, or the packet is invalid.");
      }
    } catch (cause) { if (canApplyResult()) setReceiptError(cause instanceof Error ? cause.message : "Could not verify this receipt. Paste the complete original SettleProof JSON export without credentials."); }
    finally { if (ticket === epoch.current) setBusy(null); }
  }
  async function copy(text: string, label: string) { try { await navigator.clipboard.writeText(text); setNotice(`${label} copied. Anyone holding this link can act in that role.`); } catch { setError("Copy was unavailable. Select the access link and copy it manually."); } }
  function updateMilestone(index: number, key: "title" | "amount" | "acceptance", value: string) { setDraft((previous) => ({ ...previous, milestones: previous.milestones.map((milestone, i) => i === index ? { ...milestone, [key]: value } : milestone) })); }

  const total = draft.milestones.reduce((sum, milestone) => sum + cents(milestone.amount), 0);
  const bothAccepted = room ? room.consent.buyer === room.version && room.consent.seller === room.version : false;
  const termsLocked = !!room?.milestones.some((milestone) => milestone.payment.status !== "not-started");
  const allPaid = room?.milestones.every((milestone) => milestone.payment.status === "verified");
  const nextAction = !room ? "Start with clear, checkable terms." : !bothAccepted ? "Both people must accept the same terms." : allPaid ? "Keep a receipt of the agreement and payment facts." : access?.role === "seller" ? "Submit a handoff for the buyer to review." : "Review the handoff. Pay only when you choose.";

  return <div className="agreements-app">
    <a className="ag-skip" href="#agreement-main" onClick={(event) => { event.preventDefault(); const main = document.getElementById("agreement-main"); main?.focus({ preventScroll: true }); main?.scrollIntoView({ block: "start" }); }}>Skip to agreement</a>
    <header className="ag-header"><a className="ag-brand" href="/" onClick={(event) => { if (room) { event.preventDefault(); reset(); } }}><span className="ag-brand-mark"><Handshake size={23} weight="bold" /></span>SettleProof<span className="ag-brand-kind">Agreements</span></a><nav aria-label="Main navigation"><a href="/evidence">Evidence desk <ArrowSquareOut size={14} /></a><span className="ag-sandbox"><span /> Sandbox only</span></nav></header>
    <main id="agreement-main" className="ag-main" tabIndex={-1}>
      <section className="ag-intro" aria-labelledby="agreement-heading">
        <div><p className="ag-eyebrow">A shared record, from scope to receipt</p><h1 id="agreement-heading">Good work starts<br />with a clear agreement.</h1><p className="ag-intro-copy">Agree what done means. Review the handoff. Connect the payment to the promise—with PayPal and a receipt you can inspect.</p></div>
        <div className="ag-intro-stamp"><Fingerprint size={36} weight="light" /><span>Human decisions.<br />Provider payment facts.<br /><strong>One inspectable record.</strong></span></div>
      </section>
      <ol className="ag-stages" aria-label="Agreement stages"><li className={!bothAccepted ? "current" : "complete"}><span>01</span><div><strong>Agree</strong><small>Same scope. Same version.</small></div></li><li className={bothAccepted && !allPaid ? "current" : ""}><span>02</span><div><strong>Review & pay</strong><small>A person approves each step.</small></div></li><li className={allPaid ? "current" : ""}><span>03</span><div><strong>Keep the receipt</strong><small>Check the facts and history.</small></div></li></ol>
      <div className="ag-feedback" ref={feedback} aria-live="polite" aria-atomic="true">{busy && <p className="ag-working"><CircleNotch className="ag-spin" size={17} /> {busy === "load" ? "Opening your private room…" : "Working…"}</p>}{error && <p className="ag-error" role="alert">{error}</p>}{notice && <p className="ag-notice"><CheckCircle size={17} />{notice}</p>}</div>
      {!room && !access && <div className="ag-create-layout"><section className="ag-paper"><div className="ag-section-head"><div><p className="ag-eyebrow">01 / The agreement</p><h2>Make the handoff explicit.</h2></div><FileText size={28} weight="light" /></div><p className="ag-section-copy">Try the invented two-milestone example, or edit it. USD only, up to three milestones and $200 total in fictitious sandbox funds.</p>{renderEditor(false)}<form onSubmit={create}><label className="ag-check"><input type="checkbox" required checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>I am using invented project details. This creates a sandbox room, not a legal contract or an escrow account.</span></label><button type="submit" className="ag-primary" disabled={!!busy || !checked || !validDraft(draft)}>Create sandbox agreement <ArrowRight size={18} /></button><p className="ag-fine">Free prototype · up to 5 new rooms per UTC day globally · room access expires</p></form></section><aside className="ag-margin"><div className="ag-next"><p className="ag-eyebrow">The next good step</p><h2>{nextAction}</h2><p>A useful agreement says what will be delivered, how the buyer will check it and what each step costs.</p></div><div className="ag-trust-note"><LockSimple size={21} /><div><strong>Private links, clear limits</strong><p>Buyer and seller get different access links. Holding a link allows that role's actions; it does not verify anyone's identity.</p></div></div><div className="ag-trust-note"><ShieldCheck size={21} /><div><strong>PayPal handles the payment</strong><p>No pooled balance, held funds or automatic release. This prototype only uses PayPal Sandbox.</p></div></div></aside></div>}
      {access && !room && !busy && <section className="ag-paper ag-empty"><h2>This room could not be opened.</h2><p>Check the complete private link, including the part after #. The room may have expired.</p><button type="button" className="ag-secondary" onClick={refresh}>Try again</button><button type="button" className="ag-link-button" onClick={reset}>Start a new example</button></section>}
      {room && access && <>
        <div className="ag-room-heading"><div><p className="ag-eyebrow">Private agreement room · Version {room.version}</p><h2>{room.title}</h2><p>{room.description}</p></div><div className="ag-room-tools"><span className="ag-role">You hold the {access.role} link</span><button type="button" className="ag-secondary" onClick={refresh} disabled={!!busy}>Refresh room</button></div></div>
        <div className="ag-role-warning"><LockSimple size={18} /><p>Link possession grants a role. Names and identities are not verified. Keep these links private. Sandbox payments use test funds.</p></div>
        {invites && <section className="ag-invites" aria-label="Save private room links"><div><h3>Save both access links now.</h3><p>These links are shown together only in this creation session. For a two-person test, send only the buyer link to the buyer.</p></div>{(["seller", "buyer"] as const).map((role) => <div className="ag-invite-row" key={role}><label htmlFor={`invite-${role}`}>{role === "buyer" ? "Buyer" : "Seller"} link</label><input id={`invite-${role}`} value={accessUrl(invites[role])} readOnly autoComplete="off" spellCheck={false} /><button type="button" className="ag-icon-button" aria-label={`Copy ${role} link`} onClick={() => { void copy(accessUrl(invites[role]), `${role} link`); }}><Copy size={18} /></button><button type="button" className="ag-secondary" onClick={() => switchTo(invites[role])} disabled={!!busy || access.role === role}>Open {role} view</button></div>)}</section>}
        <div className="ag-workspace"><section className="ag-room-content"><section className="ag-paper ag-consent"><div className="ag-section-head"><div><p className="ag-eyebrow">01 / Same version, two decisions</p><h3>Agree before the work begins.</h3></div><span className={`ag-status ${bothAccepted ? "good" : ""}`}>{bothAccepted ? "Both accepted" : "Awaiting agreement"}</span></div><div className="ag-consent-people">{(["seller", "buyer"] as const).map((role) => <div key={role}><span className={room.consent[role] === room.version ? "ag-person accepted" : "ag-person"}>{room.consent[role] === room.version ? <Check size={19} /> : role[0].toUpperCase()}</span><div><strong>{role === "buyer" ? "Buyer" : "Seller"}</strong><small>{room.consent[role] === room.version ? `Accepted version ${room.version}` : `Has not accepted version ${room.version}`}</small></div></div>)}</div>{room.consent[access.role] !== room.version && <><label className="ag-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>I reviewed every milestone, amount and acceptance criterion below. I accept version {room.version} in this sandbox role.</span></label><button type="button" className="ag-primary" disabled={!!busy || !checked} onClick={() => run({ type: "consent", version: room.version }, "consent")}>Accept version {room.version} as {access.role}<Check size={17} /></button></>}<button type="button" className="ag-link-button" disabled={!!busy || termsLocked} onClick={() => { setDraft(termsFrom(room)); setEditingVersion(room.version); setShowEditor(!showEditor); }}> {showEditor ? "Close terms editor" : "Propose revised terms"}</button>{termsLocked && <p className="ag-fine">Terms are frozen after a checkout attempt. Start a new room to agree different terms.</p>}{showEditor && <form className="ag-revise" onSubmit={(event) => { event.preventDefault(); void act({ type: "propose", version: editingVersion ?? room.version, terms: normalizedTerms(draft) }, "propose").then(() => setShowEditor(false)).catch(() => undefined); }}><p className="ag-caution">A revision resets both acceptances. Changing terms is blocked once payment has started.</p>{renderEditor(true)}<button type="submit" className="ag-primary" disabled={!!busy || termsLocked || !validDraft(draft)}>Save as a new version</button></form>}</section>
          <div className="ag-milestone-heading"><p className="ag-eyebrow">02 / Review & pay</p><h3>One clear handoff at a time.</h3></div>{room.milestones.map((milestone, index) => renderMilestone(milestone, index))}
        </section><aside className="ag-margin ag-room-aside"><div className="ag-next"><p className="ag-eyebrow">The next good step</p><h2>{nextAction}</h2><p>{!bothAccepted ? "Use the buyer and seller links to review and accept this exact version. Payment stays unavailable until the handoff is accepted." : "Delivery acceptance is a human decision. Payment evidence comes from server-fetched PayPal facts."}</p></div><section className="ag-receipt-summary"><Receipt size={27} weight="light" /><h3>Your agreement receipt</h3><dl><div><dt>Total agreed</dt><dd>{money((room.milestones.reduce((sum, milestone) => sum + cents(milestone.amount), 0) / 100).toFixed(2))} USD</dd></div><div><dt>Terms version</dt><dd>{room.version}</dd></div><div><dt>Events recorded</dt><dd>{room.head.sequence}</dd></div><div><dt>Room expires</dt><dd>{time(room.expiresAt)}</dd></div></dl><button type="button" className="ag-secondary" onClick={() => { void exportReceipt(); }} disabled={!!busy}><DownloadSimple size={18} /> Export receipt & anchor</button><p className="ag-fine">Save your own copy. The server's history is not immutable; a retained sequence and hash can detect changes to that prefix.</p></section><div className="ag-provider-note"><span className={config?.configured ? "ag-provider-dot ready" : "ag-provider-dot"} /><p><strong>PayPal Sandbox {config?.configured ? "configured" : "not configured"}</strong><br />{config?.configured ? "Checkout uses fictitious test funds. A capture must be checked before it is shown as verified." : "Agreement review still works. Payment needs a configured sandbox application."}</p></div></aside></div>
        <section className="ag-paper ag-history"><div className="ag-section-head"><div><p className="ag-eyebrow">03 / An inspectable record</p><h2>The story behind the receipt.</h2></div><Fingerprint size={27} weight="light" /></div><p className="ag-section-copy">Human assertions and provider observations are different kinds of evidence. The hash links events; it does not prove identity, delivery quality or permanent settlement.</p><ol>{room.events.map((event) => <li key={event.sequence}><span className="ag-event-number">{String(event.sequence).padStart(2, "0")}</span><div><strong>{readable(event.type)}</strong><p>{event.actor} · {time(event.at)}</p><details><summary>Inspect event evidence</summary><pre>{JSON.stringify(event.data, null, 2)}</pre><p className="ag-hash">Hash {event.hash}</p></details></div></li>)}</ol><div className="ag-current-anchor"><strong>Current anchor</strong><span>Sequence {room.head.sequence}</span><code>{room.head.hash}</code></div></section>
      </>}
      <details className="ag-verifier"><summary><Fingerprint size={20} /><span>Verify an exported receipt</span><span className="ag-verifier-plus">+</span></summary><form onSubmit={verify}><p>Paste a sanitized receipt JSON. Optionally add an anchor saved earlier; verification checks that exact prefix even when legitimate events were appended later. This cannot establish who acted or whether delivery was good.</p><label className="ag-field">Receipt JSON<textarea value={verifyText} onChange={(event) => { if (event.target.value.length > RECEIPT_RAW_CHARACTER_LIMIT) { setReceiptError("Receipt text exceeds the 2 MiB character input limit. Nothing was truncated; use the complete original export with less formatting."); return; } setVerifyText(event.target.value); setReceiptError(""); setVerification(null); setAnchorResult(null); }} onPaste={(event) => { const input = event.currentTarget; const length = verifyText.length - (input.selectionEnd - input.selectionStart) + event.clipboardData.getData("text").length; if (length > RECEIPT_RAW_CHARACTER_LIMIT) { event.preventDefault(); setReceiptError("This paste exceeds the 2 MiB character input limit and was not inserted. Use the complete original export with less formatting; do not remove events."); } }} required rows={7} maxLength={RECEIPT_RAW_CHARACTER_LIMIT} spellCheck={false} aria-invalid={!!receiptError} aria-describedby={receiptError ? "receipt-input-help receipt-input-error" : "receipt-input-help"} placeholder="Paste an exported SettleProof receipt" /></label><p id="receipt-input-help" className="ag-fine">Input allows up to 2 MiB of characters, including formatting. The complete compact UTF-8 request must fit 512 KiB. Oversized pastes are rejected rather than truncated.</p>{receiptError && <p id="receipt-input-error" className="ag-error" role="alert">{receiptError}</p>}<div className="ag-anchor-fields"><label className="ag-field">Retained sequence (optional)<input value={anchorSequence} onChange={(event) => { setAnchorSequence(event.target.value); setVerification(null); setAnchorResult(null); setReceiptError(""); }} inputMode="numeric" autoComplete="off" /></label><label className="ag-field">Retained hash (optional)<input value={anchorHash} onChange={(event) => { setAnchorHash(event.target.value.trim()); setVerification(null); setAnchorResult(null); setReceiptError(""); }} autoComplete="off" spellCheck={false} maxLength={64} /></label></div><button type="submit" className="ag-secondary" disabled={!!busy || !verifyText}>Verify integrity</button>{verification && <div className={verification.valid ? "ag-verification good" : "ag-verification bad"} role="status"><strong>{verification.valid ? "Internal chain is valid" : "Receipt failed integrity checks"}</strong><p>{verification.reason} · {verification.checkedEvents} events checked.</p>{anchorResult && <p>{anchorResult}</p>}<small>{verification.limitation}</small></div>}</form></details>
      <footer className="ag-footer"><span>SettleProof · Built for the PayPal AI Hackathon</span><p>Sandbox prototype. No escrow, verified identities, dispute ruling or guarantee of settlement.</p><a href="https://github.com/AjnasNB/settleproof" target="_blank" rel="noreferrer">MIT source <ArrowSquareOut size={14} /></a></footer>
    </main>
  </div>;

  function renderEditor(revision: boolean) { return <div className="ag-editor"><label className="ag-field">Project title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required autoComplete="off" /></label><label className="ag-field">What are you agreeing to?<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} maxLength={1000} required /></label>{!revision && <details className="ag-ai-draft"><summary><Sparkle size={18} /> Help me make the criteria clearer</summary><label className="ag-field">Brief for AI drafting<textarea value={brief} onChange={(event) => { setBrief(event.target.value); setProposal(null); }} rows={3} maxLength={1200} /></label><p className="ag-fine">Use invented details only. AI proposes wording for two or three milestones; it cannot approve work or change amounts.</p><button type="button" className="ag-secondary" onClick={() => { void suggest(); }} disabled={!!busy || brief.trim().length < 20 || draft.milestones.length < 2 || draft.milestones.some((milestone) => !Number.isFinite(cents(milestone.amount)))}><Sparkle size={16} /> Draft criteria with AI</button>{proposal?.status === "generated" && proposal.milestones && <div className="ag-ai-result"><p className="ag-eyebrow">Generated draft · review before using</p>{proposal.milestones.map((milestone, i) => <div key={i}><strong>{milestone.title} · {money(milestone.amount)}</strong><p>{milestone.criteria}</p></div>)}{proposal.questions?.length > 0 && <div><strong>Questions to resolve</strong><ul>{proposal.questions.map((question, i) => <li key={i}>{question}</li>)}</ul></div>}<button type="button" className="ag-secondary" onClick={() => { setDraft((previous) => ({ ...previous, milestones: proposal.milestones!.map((milestone) => ({ title: milestone.title, amount: milestone.amount, acceptance: milestone.criteria })) })); setProposal(null); setNotice("AI draft copied into the editor. Review and edit it before creating the room."); }}>Use proposed draft</button></div>}</details>}{draft.milestones.map((milestone, index) => <fieldset className="ag-milestone-editor" key={index}><legend>Milestone {index + 1}</legend><div className="ag-editor-top"><label className="ag-field">Title<input value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} maxLength={100} required autoComplete="off" /></label><label className="ag-field ag-amount-field">Amount (USD)<input value={milestone.amount} onChange={(event) => { updateMilestone(index, "amount", event.target.value); setProposal(null); }} inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" required autoComplete="off" aria-invalid={!!amountIssue(milestone.amount)} aria-describedby={amountIssue(milestone.amount) ? `amount-error-${revision ? "revision" : "new"}-${index}` : undefined} />{amountIssue(milestone.amount) && <span id={`amount-error-${revision ? "revision" : "new"}-${index}`} className="ag-field-error">{amountIssue(milestone.amount)}</span>}</label></div><label className="ag-field">How will the buyer check it?<textarea value={milestone.acceptance} onChange={(event) => updateMilestone(index, "acceptance", event.target.value)} rows={3} maxLength={600} required /></label>{draft.milestones.length > 1 && <button type="button" className="ag-link-button" onClick={() => { setDraft((previous) => ({ ...previous, milestones: previous.milestones.filter((_, i) => i !== index) })); setProposal(null); }}><X size={14} />Remove milestone</button>}</fieldset>)}<div className="ag-editor-total">{draft.milestones.length < 3 && <button type="button" className="ag-link-button" onClick={() => { setDraft({ ...draft, milestones: [...draft.milestones, { title: "", amount: "1.00", acceptance: "" }] }); setProposal(null); }}><Plus size={16} /> Add milestone</button>}<p>Total <strong>{Number.isFinite(total) ? money((total / 100).toFixed(2)) : "—"} USD</strong></p></div><div className="ag-draft-validation" aria-live="polite" aria-atomic="true">{draftIssues(draft).length > 0 && <><strong>Before you can {revision ? "save revised terms" : "create the agreement"}:</strong><ul>{draftIssues(draft).map((issue, i) => <li key={i}>{issue}</li>)}</ul></>}</div></div>; }

  function renderMilestone(milestone: AgreementMilestone, index: number) {
    if (!room || !access) return null;
    const version = room.version, accepted = milestone.acceptanceStatus === "accepted", verified = milestone.payment.status === "verified", analysis = milestone.payment.analysis;
    const note = notes[milestone.id] || "";
    const approved = analysis?.order.status === "APPROVED";
    const changeRequest = [...room.events].reverse().find((event) => event.type === "changes-requested" && event.actor === "buyer" && event.data.milestoneId === milestone.id && event.data.version === version && typeof event.data.note === "string");
    return <article className="ag-paper ag-milestone" key={milestone.id}><div className="ag-milestone-top"><span className="ag-milestone-index">{String(index + 1).padStart(2, "0")}</span><div><h3>{milestone.title}</h3><span className={`ag-status ${verified ? "good" : ""}`}>{verified ? "Capture verified" : readable(milestone.acceptanceStatus)}</span></div><strong className="ag-milestone-amount">{money(milestone.amount)}<small>USD</small></strong></div><div className="ag-criteria"><p className="ag-eyebrow">Acceptance criteria · Version {version}</p><p>{milestone.acceptance}</p></div>{milestone.delivery && <div className="ag-delivery"><p className="ag-eyebrow">Seller's delivery assertion</p><p>{milestone.delivery.note}</p><small>{time(milestone.delivery.at)} · Not independently verified</small></div>}{changeRequest && <div className="ag-buyer-feedback"><p className="ag-eyebrow">Latest buyer change request - Version {version}</p><p>{String(changeRequest.data.note)}</p><small>{time(changeRequest.at)} - Buyer assertion, not independently verified</small></div>}{!bothAccepted && <p className="ag-lock-note"><LockSimple size={16} />Both roles must accept this version before delivery and payment.</p>}{bothAccepted && !accepted && <div className="ag-milestone-actions">{access.role === "seller" ? <><label className="ag-field">Handoff note<textarea value={note} onChange={(event) => setNotes({ ...notes, [milestone.id]: event.target.value })} rows={3} maxLength={1000} placeholder="Describe what you delivered and how it meets the criteria. Use invented details only." /></label><button type="button" className="ag-primary" disabled={!!busy || note.trim().length < 5} onClick={() => run({ type: "deliver", version, milestoneId: milestone.id, note }, "deliver")}>{milestone.delivery ? "Submit updated handoff" : "Submit handoff"}<ArrowRight size={17} /></button></> : milestone.acceptanceStatus === "delivered" ? <><p className="ag-action-description">Check the delivered work against the criteria. Your decision is a human assertion and does not prove payment.</p><button type="button" className="ag-primary" disabled={!!busy} onClick={() => run({ type: "accept", version, milestoneId: milestone.id }, "accept")}>Accept this handoff<Check size={17} /></button><details className="ag-changes"><summary>Something needs changing</summary><label className="ag-field">What should change?<textarea value={note} onChange={(event) => setNotes({ ...notes, [milestone.id]: event.target.value })} rows={2} maxLength={1000} /></label><button type="button" className="ag-secondary" disabled={!!busy || note.trim().length < 5} onClick={() => run({ type: "request-changes", version, milestoneId: milestone.id, note }, "request-changes")}>Request changes</button></details></> : <p className="ag-lock-note">{milestone.acceptanceStatus === "changes-requested" ? "Waiting for the seller to submit a revised handoff. Your previous change request has not yet been addressed." : "Waiting for the seller to submit a handoff."}</p>}</div>}{accepted && <div className="ag-payment"><div className="ag-payment-heading"><CheckCircle size={20} /><strong>Handoff accepted by the buyer</strong></div>{!verified && access.role === "seller" && <p>The buyer can now choose to pay this milestone with PayPal Sandbox.</p>}{!verified && access.role === "buyer" && <><p>PayPal handles this test payment. Approving Checkout is separate from capturing and verifying it. No money is held by SettleProof.</p>{config?.configured && config.clientId ? <><button type="button" className="ag-primary" disabled={!!busy || approved} onClick={() => setActiveCheckout(activeCheckout === milestone.id ? null : milestone.id)}>{milestone.payment.orderId ? "Continue PayPal Sandbox approval" : "Pay with PayPal Sandbox"}<ArrowSquareOut size={16} /></button>{activeCheckout === milestone.id && <PayPalButton clientId={config.clientId} createOrder={async () => { const latest = currentRoom.current; if (!latest) throw new Error("Room is unavailable."); const result = await act({ type: "create-order", version: latest.version, milestoneId: milestone.id }, "create-order"); const orderId = result.milestones.find((item) => item.id === milestone.id)?.payment.orderId; if (!orderId) throw new Error("PayPal order was not created."); return orderId; }} onApprove={async () => { const latest = currentRoom.current; if (!latest) return; await act({ type: "refresh", version: latest.version, milestoneId: milestone.id }, "refresh-payment"); setActiveCheckout(null); setNotice("PayPal approval returned. Review the provider state, then explicitly capture the approved sandbox payment."); }} onCancel={() => { setActiveCheckout(null); setNotice("PayPal Checkout was cancelled. No capture was requested."); }} onError={(message) => { setActiveCheckout(null); setError(message); }} />}</> : <p className="ag-caution">Checkout is unavailable until PayPal Sandbox is configured.</p>}{approved && <button type="button" className="ag-primary" disabled={!!busy} onClick={() => run({ type: "capture", version, milestoneId: milestone.id }, "capture")}>Capture approved sandbox payment<Check size={17} /></button>}</>}{milestone.payment.orderId && <button type="button" className="ag-secondary" disabled={!!busy} onClick={() => run({ type: "refresh", version, milestoneId: milestone.id }, "refresh-payment")}>Check fresh payment evidence</button>}{sandboxApproval(milestone.payment.approvalUrl, milestone.payment.orderId) && !verified && access.role === "buyer" && <a className="ag-secondary" href={sandboxApproval(milestone.payment.approvalUrl, milestone.payment.orderId)!} target="_blank" rel="noreferrer">Open stored sandbox approval <ArrowSquareOut size={15} /></a>}{milestone.payment.error && <p className="ag-error">{milestone.payment.error}</p>}{analysis && <div className="ag-analysis"><p className="ag-eyebrow">PayPal sandbox observation · {time(analysis.observedAt)}</p><dl><div><dt>Order status</dt><dd>{analysis.order.status}</dd></div><div><dt>Reconciled outcome</dt><dd>{analysis.outcome}</dd></div><div><dt>Captured net</dt><dd>{analysis.totals.net === null ? "Unknown" : `${money(analysis.totals.net)} ${analysis.expected.currency}`}</dd></div><div><dt>Remaining</dt><dd>{analysis.totals.remaining === null ? "Unknown" : `${money(analysis.totals.remaining)} ${analysis.expected.currency}`}</dd></div></dl><details><summary>Inspect provider evidence</summary>{analysis.findings.map((finding) => <p key={finding.id}><strong>{finding.title}</strong> — {finding.detail}</p>)}<dl>{analysis.evidence.map((evidence) => <div key={evidence.id}><dt>{evidence.label} <small>{evidence.source}</small></dt><dd>{evidence.value}</dd></div>)}</dl></details><p className="ag-fine">A timestamped observation, not irreversible settlement. Refunds, reversals and unavailable reads can change the result.</p></div>}</div>}</article>;
  }
}
function termsFrom(room: AgreementRoom): AgreementTerms { return { title: room.title, description: room.description, milestones: room.milestones.map(({ title, amount, acceptance }) => ({ title, amount, acceptance })) }; }
function validDraft(draft: AgreementTerms) { const values = draft.milestones.map((milestone) => cents(milestone.amount)); return draft.title.trim().length >= 3 && draft.description.trim().length >= 10 && draft.milestones.length > 0 && draft.milestones.length <= 3 && draft.milestones.every((milestone) => milestone.title.trim().length >= 3 && milestone.acceptance.trim().length >= 10) && values.every((value) => Number.isFinite(value) && value > 0) && values.reduce((a, b) => a + b, 0) <= 20000; }
