import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  QuickFilterModule,
  RowSelectionModule,
  CsvExportModule,
  CellStyleModule,
  RowApiModule,
  themeQuartz,
  type ColDef,
  type GridApi,
} from "ag-grid-community";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  CircleNotch,
  DownloadSimple,
  FileText,
  Info,
  ListChecks,
  MagnifyingGlass,
  ShieldCheck,
  Sparkle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type {
  Analysis,
  Scenario,
  ReconcileInput,
  ExplainResponse,
} from "./shared";

type QueueRow = Analysis & {
  title: string;
  note: string;
  input: ReconcileInput;
};
type Configuration = {
  paypalConfigured: boolean;
  aiConfigured: boolean;
  paypalEnvironment: "sandbox";
  model: string;
};
type Review = { at: string; note: string; observedAt: string; outcome: string };
const modules = [
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  QuickFilterModule,
  RowSelectionModule,
  CsvExportModule,
  CellStyleModule,
  RowApiModule,
];
const labels = {
  paid: "Matched",
  partial: "Short payment",
  unpaid: "Not captured",
  review: "Needs review",
  unknown: "Unknown",
};
const theme = themeQuartz.withParams({
  fontFamily: "Geist, sans-serif",
  fontSize: 13,
  backgroundColor: "#ffffff",
  foregroundColor: "#263c40",
  headerBackgroundColor: "#f4f7f5",
  headerTextColor: "#526568",
  accentColor: "#286f59",
  borderColor: "#e2e8e4",
  wrapperBorderRadius: 9,
  rowHoverColor: "#f4f8f5",
  selectedRowBackgroundColor: "#eaf3ee",
  spacing: 7,
});
const money = (value: string | null, currency: string) =>
  value === null
    ? "Unknown"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(Number(value));
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const result = await response.json();
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Request failed (${response.status}). Please try again.`;
    throw new Error(message);
  }
  return result as T;
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Badge({ outcome }: { outcome: Analysis["outcome"] }) {
  return (
    <span className={`badge ${outcome}`}>
      <span aria-hidden="true" />
      {labels[outcome]}
    </span>
  );
}
function storedReviews(): Record<string, Review> {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("settleproof.reviews.v1") || "{}",
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, r]) =>
          r &&
          typeof r === "object" &&
          typeof r.at === "string" &&
          Number.isFinite(Date.parse(r.at)) &&
          typeof r.note === "string" &&
          r.note.length <= 1000 &&
          typeof r.observedAt === "string" &&
          typeof r.outcome === "string",
      ),
    );
  } catch {
    return {};
  }
}

export default function App() {
  const [config, setConfig] = useState<Configuration>();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<QueueRow>();
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("findings");
  const [ai, setAi] = useState<ExplainResponse["ai"]>();
  const [explaining, setExplaining] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewChecked, setReviewChecked] = useState(false);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [setupOpen, setSetupOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [formError, setFormError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [invoiceId, setInvoiceId] = useState("INV-1001");
  const [amount, setAmount] = useState("120.00");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const grid = useRef<GridApi<QueueRow> | null>(null);
  const setupDialog = useRef<HTMLDialogElement>(null);
  const guideDialog = useRef<HTMLDialogElement>(null);
  const activeRequest = useRef(0);
  const connectButton = useRef<HTMLButtonElement>(null);

  async function load() {
    setLoading(true);
    setError("");
    activeRequest.current++;
    setAi(undefined);
    setDraft("");
    setExplaining(false);
    setReviewChecked(false);
    try {
      const [configuration, list] = await Promise.all([
        api<Configuration>("/api/config"),
        api<{ scenarios: Scenario[] }>("/api/scenarios"),
      ]);
      setConfig(configuration);
      const queue = await Promise.all(
        list.scenarios.map(async (s): Promise<QueueRow> => {
          const input: ReconcileInput = { mode: "fixture", scenarioId: s.id };
          return {
            ...(await api<Analysis>("/api/reconcile", input)),
            title: s.title,
            note: s.note,
            input,
          };
        }),
      );
      setRows(queue);
      setSelected(queue.find((r) => r.outcome === "partial") || queue[0]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the evidence queue.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    setReviews(storedReviews());
  }, []);
  useEffect(() => {
    activeRequest.current++;
    setAi(undefined);
    setDraft("");
    setExplaining(false);
    setReviewNote("");
    setReviewChecked(false);
    setTab("findings");
    setNotice("");
  }, [selected?.caseId]);
  useEffect(() => {
    if (setupOpen) setupDialog.current?.showModal();
    else if (setupDialog.current?.open) setupDialog.current.close();
  }, [setupOpen]);
  useEffect(() => {
    if (guideOpen) guideDialog.current?.showModal();
    else if (guideDialog.current?.open) guideDialog.current.close();
  }, [guideOpen]);
  useEffect(() => {
    grid.current?.forEachNode((node) => {
      if (node.data?.caseId === selected?.caseId && !node.isSelected())
        node.setSelected(true);
    });
  }, [selected?.caseId, rows]);
  const reviewCount = rows.filter((r) => r.outcome !== "paid").length;
  const shownRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          filter === "all" ||
          (filter === "ready" ? r.outcome === "paid" : r.outcome !== "paid"),
      ),
    [rows, filter],
  );
  const columns = useMemo<ColDef<QueueRow>[]>(
    () => [
      {
        field: "invoiceId",
        headerName: "Invoice / case",
        minWidth: 190,
        flex: 1.3,
        filter: "agTextColumnFilter",
        cellRenderer: (p: { data?: QueueRow }) =>
          p.data ? (
            <button
              type="button"
              className="invoice-link"
              onClick={() => setSelected(p.data)}
            >
              <strong>{p.data.invoiceId}</strong>
              <small>{p.data.title}</small>
            </button>
          ) : null,
      },
      {
        colId: "expected",
        headerName: "Expected",
        width: 132,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueGetter: (p) => Number(p.data?.expected.amount || 0),
        valueFormatter: (p) =>
          p.data ? money(p.data.expected.amount, p.data.expected.currency) : "",
      },
      {
        colId: "net",
        headerName: "Net captured",
        width: 143,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueGetter: (p) =>
          p.data?.totals.net === null ? null : Number(p.data?.totals.net),
        valueFormatter: (p) =>
          p.data ? money(p.data.totals.net, p.data.expected.currency) : "",
      },
      {
        field: "outcome",
        headerName: "Finding",
        width: 158,
        filter: "agTextColumnFilter",
        valueFormatter: (p) => labels[p.value as Analysis["outcome"]] || "",
        cellRenderer: (p: { value: Analysis["outcome"] }) => (
          <Badge outcome={p.value} />
        ),
      },
      {
        colId: "source",
        headerName: "Source",
        width: 130,
        valueGetter: (p) =>
          p.data?.environment === "fixture"
            ? "Synthetic case"
            : "PayPal sandbox",
        filter: "agTextColumnFilter",
      },
    ],
    [],
  );
  async function explain() {
    if (!selected) return;
    if (!config?.aiConfigured) {
      setSetupOpen(true);
      return;
    }
    const request = ++activeRequest.current;
    setExplaining(true);
    setNotice("");
    setAi(undefined);
    setDraft("");
    try {
      const result = await api<ExplainResponse>("/api/explain", selected.input);
      if (request !== activeRequest.current) return;
      const refreshed = { ...selected, ...result.analysis };
      setSelected(refreshed);
      setRows((old) =>
        old.map((r) => (r.caseId === refreshed.caseId ? refreshed : r)),
      );
      setReviewChecked(false);
      setAi(result.ai);
      setDraft(result.ai.draft || "");
      if (result.ai.status !== "generated")
        setNotice(
          result.ai.text ||
            "AI could not produce a valid cited explanation. The evidence checks are still available.",
        );
    } catch (e) {
      if (request === activeRequest.current)
        setNotice(
          e instanceof Error
            ? e.message
            : "AI is unavailable. Evidence checks remain available.",
        );
    } finally {
      if (request === activeRequest.current) setExplaining(false);
    }
  }
  async function inspect(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!config?.paypalConfigured) {
      setSetupOpen(true);
      return;
    }
    setInspecting(true);
    try {
      const [whole, decimals = ""] = amount.split(".");
      const input: ReconcileInput = {
        mode: "sandbox",
        orderId: orderId.trim(),
        expected: {
          invoiceId: invoiceId.trim(),
          amount: `${whole}.${decimals.padEnd(2, "0")}`,
          currency,
        },
      };
      const result = await api<Analysis>("/api/reconcile", input);
      const row: QueueRow = {
        ...result,
        title: "Sandbox observation",
        note: "Read from the configured sandbox merchant account.",
        input,
      };
      activeRequest.current++;
      setAi(undefined);
      setDraft("");
      setExplaining(false);
      setReviewNote("");
      setReviewChecked(false);
      setRows((old) => [row, ...old.filter((r) => r.caseId !== row.caseId)]);
      setSelected(row);
      setFilter("all");
      setQuery("");
      setNotice(
        "Sandbox evidence loaded. No payment was created, captured or refunded.",
      );
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Sandbox evidence could not be read.",
      );
    } finally {
      setInspecting(false);
    }
  }
  function exportEvidence() {
    if (!selected) return;
    const { title, note, input, ...analysis } = selected;
    download(
      `settleproof-${selected.invoiceId.replace(/[^a-z0-9_-]/gi, "-")}.json`,
      JSON.stringify(
        {
          schema: "settleproof.packet.v1",
          exportedAt: new Date().toISOString(),
          title,
          note,
          analysis,
          ai: ai?.status === "generated" ? ai : null,
          editedInternalDraft: ai?.status === "generated" ? draft : null,
          localHumanReview: reviews[selected.caseId] || null,
          limitations: [
            "Sandbox or explicitly synthetic evidence only.",
            "Observed API data is not a security audit or a guarantee of settlement.",
            "AI prose and internal review drafts require human review. No financial actions are executed.",
          ],
        },
        null,
        2,
      ),
      "application/json",
    );
  }
  function saveReview() {
    if (!selected || !reviewChecked) return;
    const next = {
      ...reviews,
      [selected.caseId]: {
        at: new Date().toISOString(),
        observedAt: selected.observedAt,
        outcome: selected.outcome,
        note: reviewNote.trim(),
      },
    };
    try {
      localStorage.setItem("settleproof.reviews.v1", JSON.stringify(next));
      setReviews(next);
      setNotice(
        "Review saved in this browser. Payment evidence was not changed.",
      );
      setReviewChecked(false);
    } catch {
      setNotice(
        "Your browser could not save this review. Export the evidence packet instead.",
      );
    }
  }
  function showEvidence(id: string) {
    setTab("evidence");
    window.setTimeout(
      () =>
        document
          .getElementById(`evidence-${id}`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      0,
    );
  }

  return (
    <AgGridProvider modules={modules}>
      <a className="skip-link" href="#main">
        Skip to payment review
      </a>
      <aside className="sidebar">
        <a className="brand" href="#main">
          <span className="brand-mark">
            <ListChecks size={25} weight="bold" />
          </span>
          SettleProof<span className="beta">BETA</span>
        </a>
        <div className="workspace-label">SELLER WORKSPACE</div>
        <nav aria-label="Workspace">
          <a className="nav-item active" href="#main" aria-current="page">
            <ListChecks size={19} />
            Payment review<span>{rows.length}</span>
          </a>
          <button
            type="button"
            className="nav-item"
            onClick={() => setGuideOpen(true)}
          >
            <FileText size={19} />
            How the checks work
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => setSetupOpen(true)}
          >
            <ShieldCheck size={19} />
            Sandbox setup
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="tiny-label">BUILT TO CHECK, NOT CHARGE</span>
          <p>
            Evidence first.
            <br />A human decides what’s next.
          </p>
          <div className="sandbox-pill">
            <span />
            Sandbox only
          </div>
          <small>No real-money transactions.</small>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span> Payment review
          </span>
          <div className="top-actions">
            <span className="status-light">
              <span className={config?.aiConfigured ? "dot green" : "dot"} />
              {config?.aiConfigured ? "AI enabled" : "AI setup needed"}
            </span>
            <span className="avatar" aria-label="Independent seller">
              IS
            </span>
          </div>
        </header>
        <main id="main">
          <section className="page-heading">
            <div>
              <div className="eyebrow">PAYMENT EVIDENCE, IN ORDER</div>
              <h1>
                Know what’s paid.
                <br />
                <span>See the proof.</span>
              </h1>
              <p>
                Match an invoice to capture evidence. Understand the gaps before
                following up.
              </p>
            </div>
            <div className="heading-actions">
              <button
                type="button"
                ref={connectButton}
                className="button primary"
                onClick={() => setSetupOpen(true)}
              >
                <ShieldCheck size={18} />
                {config?.paypalConfigured
                  ? "Sandbox connected"
                  : "Connect sandbox"}
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setGuideOpen(true)}
              >
                What does “matched” mean? <Info size={15} />
              </button>
            </div>
          </section>
          <div className="summary-strip">
            <div>
              <span>Cases in this queue</span>
              <strong>
                {loading ? "—" : rows.length.toString().padStart(2, "0")}
              </strong>
            </div>
            <div>
              <span>Need a closer look</span>
              <strong>
                {loading ? "—" : reviewCount.toString().padStart(2, "0")}
                <small>not automatically unpaid</small>
              </strong>
            </div>
            <div className="source-summary">
              <span>Evidence scope</span>
              <strong>
                <span className="dot green" />
                Sandbox & synthetic examples
              </strong>
              <small>Every case labels its own source.</small>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <WarningCircle size={20} />
              <span>{error}</span>
              <button type="button" onClick={() => void load()}>
                Retry loading
              </button>
            </div>
          )}
          <div className="workbench">
            <div className="queue-column">
              <section className="queue-panel" aria-labelledby="queue-heading">
                <div className="section-heading">
                  <div>
                    <h2 id="queue-heading">
                      Review queue <span className="count">{rows.length}</span>
                    </h2>
                    <p>Synthetic cases let you explore without an account.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Reload example cases"
                    title="Reload synthetic examples"
                    onClick={() => void load()}
                    disabled={loading}
                  >
                    <ArrowClockwise
                      size={19}
                      className={loading ? "spin" : ""}
                    />
                  </button>
                </div>
                <div className="queue-tools">
                  <div className="segments" aria-label="Filter cases">
                    {[
                      ["all", "All cases"],
                      ["review", "Needs review"],
                      ["ready", "Matched"],
                    ].map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        aria-pressed={filter === id}
                        className={filter === id ? "selected" : ""}
                        onClick={() => setFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <MagnifyingGlass size={16} />
                    <span className="sr-only">Search cases</span>
                    <input
                      name="case-search"
                      autoComplete="off"
                      type="search"
                      placeholder="Search cases"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid-wrap">
                  <AgGridReact<QueueRow>
                    theme={theme}
                    rowData={shownRows}
                    columnDefs={columns}
                    defaultColDef={{
                      sortable: true,
                      resizable: true,
                      suppressMovable: true,
                    }}
                    rowHeight={61}
                    headerHeight={43}
                    quickFilterText={query}
                    getRowId={(p) => p.data.caseId}
                    rowSelection={{
                      mode: "singleRow",
                      checkboxes: false,
                      enableClickSelection: true,
                    }}
                    onRowClicked={(e) => e.data && setSelected(e.data)}
                    onSelectionChanged={(e) => {
                      const row = e.api.getSelectedRows()[0];
                      if (row) setSelected(row);
                    }}
                    onGridReady={(e) => {
                      grid.current = e.api;
                    }}
                    onModelUpdated={(e) => {
                      setVisibleCount(e.api.getDisplayedRowCount());
                      const current = selected ? e.api.getRowNode(selected.caseId) : undefined;
                      if (!current?.displayed) setSelected(e.api.getDisplayedRowAtIndex(0)?.data);
                    }}
                    loading={loading}
                    overlayNoRowsTemplate="<span>No matching cases. Clear the search or change the filter.</span>"
                  />
                </div>
                <footer className="queue-footer">
                  <span>
                    <span className="dot green" />
                    {visibleCount} of {rows.length} shown · AG Grid Community
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      grid.current?.exportDataAsCsv({
                        fileName: "settleproof-queue.csv",
                        exportedRows: "filteredAndSorted",
                        processCellCallback: (p) => {
                          const row = p.node?.data as QueueRow | undefined;
                          const id = p.column.getColId();
                          let value = String(p.value ?? "");
                          if (row && (id === "expected" || id === "net")) {
                            const amount =
                              id === "expected"
                                ? row.expected.amount
                                : row.totals.net;
                            value =
                              amount === null
                                ? "Unknown"
                                : `${row.expected.currency} ${amount}`;
                          }
                          if (row && id === "invoiceId")
                            value = `${row.invoiceId} · ${row.title}`;
                          if (row && id === "outcome")
                            value = labels[row.outcome];
                          return /^[=+\-@\t\r]/.test(value)
                            ? `'${value}`
                            : value;
                        },
                      })
                    }
                    disabled={!rows.length}
                  >
                    <DownloadSimple size={15} />
                    Export visible CSV
                  </button>
                </footer>
              </section>
              <section className="live-panel" aria-labelledby="live-heading">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">YOUR SANDBOX EVIDENCE</div>
                    <h2 id="live-heading">Inspect a PayPal order</h2>
                    <p>
                      Read order and capture records. This tool never moves
                      money.
                    </p>
                  </div>
                  <span
                    className={`connection ${config?.paypalConfigured ? "connected" : ""}`}
                  >
                    <span />
                    {config?.paypalConfigured ? "Configured" : "Setup required"}
                  </span>
                </div>
                <form onSubmit={(e) => void inspect(e)}>
                  <div className="form-grid">
                    <label>
                      Sandbox order ID
                      <input
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="PayPal sandbox order ID"
                        autoComplete="off"
                        maxLength={40}
                        required
                      />
                    </label>
                    <label>
                      Invoice reference
                      <input
                        name="invoice-reference"
                        autoComplete="off"
                        value={invoiceId}
                        onChange={(e) => setInvoiceId(e.target.value)}
                        maxLength={64}
                        required
                      />
                    </label>
                    <label>
                      Expected amount
                      <input
                        name="expected-amount"
                        autoComplete="off"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                        maxLength={16}
                        required
                      />
                    </label>
                    <label>
                      Currency
                      <select
                        value={currency}
                        onChange={(e) =>
                          setCurrency(e.target.value as typeof currency)
                        }
                      >
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-bottom">
                    <span>
                      <ShieldCheck size={16} />
                      Only the configured sandbox merchant is queried.
                    </span>
                    <button
                      type="submit"
                      className="button secondary"
                      disabled={inspecting}
                    >
                      {inspecting ? (
                        <CircleNotch className="spin" size={17} />
                      ) : (
                        <ArrowRight size={17} />
                      )}
                      {inspecting ? "Reading evidence…" : "Inspect order"}
                    </button>
                  </div>
                  {formError && (
                    <p className="form-error" role="alert">
                      {formError}
                    </p>
                  )}
                </form>
              </section>
              <div className="scope-note">
                <Info size={18} />
                <p>
                  “Matched” means the observed capture records match the invoice
                  checks. It does not guarantee settlement, authenticity of a
                  supplied invoice, or a future refund outcome.
                </p>
              </div>
            </div>
            <aside className="inspector" aria-labelledby="inspection-heading">
              {selected ? (
                <>
                  <div className="inspector-head">
                    <div className="eyebrow">CASE INSPECTION</div>
                    <div className="inspector-title">
                      <h2 id="inspection-heading">{selected.invoiceId}</h2>
                      <Badge outcome={selected.outcome} />
                    </div>
                    <p>{selected.title}</p>
                    <div className="provenance">
                      <span className="dot" />
                      {selected.environment === "fixture"
                        ? "Synthetic fixture · not a PayPal API observation"
                        : "PayPal sandbox API observation"}
                    </div>
                  </div>
                  <div className="amount-block">
                    <div>
                      <span>Expected</span>
                      <strong>
                        {money(
                          selected.expected.amount,
                          selected.expected.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Net captured</span>
                      <strong>
                        {money(selected.totals.net, selected.expected.currency)}
                      </strong>
                    </div>
                  </div>
                  <div
                    className="inspector-tabs"
                    role="group"
                    aria-label="Case details"
                  >
                    <button
                      type="button"
                      className={tab === "findings" ? "selected" : ""}
                      aria-pressed={tab === "findings"}
                      onClick={() => setTab("findings")}
                    >
                      Checks <span>{selected.findings.length}</span>
                    </button>
                    <button
                      type="button"
                      className={tab === "evidence" ? "selected" : ""}
                      aria-pressed={tab === "evidence"}
                      onClick={() => setTab("evidence")}
                    >
                      Source records <span>{selected.evidence.length}</span>
                    </button>
                  </div>
                  <div className="detail-content">
                    {tab === "findings" ? (
                      <div className="findings">
                        {selected.findings.map((f) => (
                          <article className={`finding ${f.kind}`} key={f.id}>
                            {f.kind === "pass" ? (
                              <CheckCircle size={19} />
                            ) : (
                              <WarningCircle size={19} />
                            )}
                            <div>
                              <h3>{f.title}</h3>
                              <p>{f.detail}</p>
                              <div className="evidence-links">
                                {f.evidenceIds.map((id) => (
                                  <button
                                    type="button"
                                    key={id}
                                    onClick={() => showEvidence(id)}
                                  >
                                    {id}
                                    <ArrowSquareOut size={11} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="evidence-list">
                        {selected.evidence.map((e) => (
                          <article
                            className="evidence-item"
                            id={`evidence-${e.id}`}
                            key={e.id}
                          >
                            <div>
                              <code>{e.id}</code>
                              <strong>{e.label}</strong>
                            </div>
                            <p>{e.source}</p>
                            <code className="path">{e.path}</code>
                            <pre>{e.value}</pre>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                  <section className="ai-section">
                    <div className="ai-label">
                      <Sparkle size={19} />
                      <h3>A clearer explanation</h3>
                      <span>AI</span>
                    </div>
                    <p>
                      Explain the findings with references and draft an internal
                      review note.
                    </p>
                    <button
                      type="button"
                      className="button ai-button"
                      onClick={() => void explain()}
                      disabled={explaining}
                    >
                      {explaining ? (
                        <CircleNotch size={17} className="spin" />
                      ) : (
                        <Sparkle size={17} />
                      )}
                      {explaining
                        ? "Reading cited evidence…"
                        : ai?.status === "generated"
                          ? "Explain again"
                          : "Explain this case"}
                      <ArrowRight size={16} />
                    </button>
                    {ai?.status === "generated" && (
                      <div className="ai-result">
                        <p>{ai.text}</p>
                        <div className="evidence-links">
                          {ai.evidenceIds.map((id) => (
                            <button
                              type="button"
                              key={id}
                              onClick={() => showEvidence(id)}
                            >
                              {id}
                              <ArrowSquareOut size={11} />
                            </button>
                          ))}
                        </div>
                        {draft && (
                          <label className="draft-label">
                            Internal review draft · edit before use
                            <textarea
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              rows={5}
                              maxLength={2500}
                            />
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => {
                                void navigator.clipboard
                                  .writeText(draft)
                                  .then(() =>
                                    setNotice(
                                      "Draft copied. Nothing was sent.",
                                    ),
                                  )
                                  .catch(() =>
                                    setNotice(
                                      "Clipboard unavailable; select and copy the draft text.",
                                    ),
                                  );
                              }}
                            >
                              Copy draft
                            </button>
                          </label>
                        )}
                        <small>
                          AI text can be wrong. Check its cited records.
                        </small>
                      </div>
                    )}
                  </section>
                  <div className="review-section">
                    <h3>
                      <label htmlFor="human-review-note">
                        Leave a human review note
                      </label>
                    </h3>
                    <textarea
                      id="human-review-note"
                      name="human-review-note"
                      autoComplete="off"
                      aria-label="Human review note"
                      placeholder="What did you check? What happens next?"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      maxLength={1000}
                      rows={2}
                    />
                    <label className="review-checkbox">
                      <input
                        type="checkbox"
                        checked={reviewChecked}
                        onChange={(e) => setReviewChecked(e.target.checked)}
                      />
                      I reviewed the evidence. This note changes no payment
                      state.
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={!reviewChecked}
                      onClick={saveReview}
                    >
                      Record review
                    </button>
                    {reviews[selected.caseId] && (
                      <small>
                        Last note saved in this browser:{" "}
                        {new Date(reviews[selected.caseId].at).toLocaleString()}
                      </small>
                    )}
                  </div>
                  <div className="inspector-footer">
                    <button
                      type="button"
                      className="text-button"
                      onClick={exportEvidence}
                    >
                      <DownloadSimple size={17} />
                      Export evidence packet
                    </button>
                    <small>
                      Observed {new Date(selected.observedAt).toLocaleString()}
                    </small>
                  </div>
                </>
              ) : (
                <div className="inspector-empty">
                  <FileText size={32} />
                  <h2 id="inspection-heading">Select a case</h2>
                  <p>Its checks and source records will appear here.</p>
                </div>
              )}
            </aside>
          </div>
          <div className="app-footer">
            <span>SettleProof · independent, open-source prototype</span>
            <span>PayPal sandbox + evidence checks + human review</span>
          </div>
        </main>
      </div>
      <div
        className={`notification ${notice ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
        {notice && (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        )}
      </div>
      <dialog
        ref={setupDialog}
        onCancel={() => setSetupOpen(false)}
        onClose={() => {
          setSetupOpen(false);
          connectButton.current?.focus();
        }}
        aria-labelledby="setup-heading"
      >
        <button
          type="button"
          className="dialog-close icon-button"
          aria-label="Close setup"
          onClick={() => setSetupOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="eyebrow">SERVER-SIDE CONFIGURATION</div>
        <h2 id="setup-heading">
          Connect the sandbox.
          <br />
          Keep the secrets off-screen.
        </h2>
        <p>
          The examples work without accounts. Real sandbox reads and AI
          explanations need the server bindings below.
        </p>
        <ol className="setup-steps">
          <li>
            <strong>PayPal sandbox app</strong>
            <p>
              Configure <code>PAYPAL_CLIENT_ID</code> and{" "}
              <code>PAYPAL_CLIENT_SECRET</code> on the server. Production
              endpoints are never used.
            </p>
          </li>
          <li>
            <strong>Workers AI</strong>
            <p>
              Bind <code>AI</code> and enable <code>AI_ENABLED</code>.
              Explanations are bounded and cite the same checked records.
            </p>
          </li>
          <li>
            <strong>Start with test evidence</strong>
            <p>
              Create and approve a sandbox order using the setup guide, then
              paste its order ID and matching invoice details.
            </p>
          </li>
        </ol>
        <div className="setup-status">
          <span>
            PayPal sandbox{" "}
            <strong>
              {config?.paypalConfigured ? "Configured" : "Not configured"}
            </strong>
          </span>
          <span>
            AI explanations{" "}
            <strong>
              {config?.aiConfigured ? "Configured" : "Not configured"}
            </strong>
          </span>
        </div>
        <div className="dialog-actions">
          <a
            className="button secondary"
            href="https://developer.paypal.com/sandbox-testing/overview"
            target="_blank"
            rel="noreferrer"
          >
            PayPal sandbox docs
            <ArrowSquareOut size={15} />
          </a>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              void api<Configuration>("/api/config")
                .then(setConfig)
                .catch((e) => setNotice(e.message));
            }}
          >
            Refresh status
            <ArrowClockwise size={16} />
          </button>
        </div>
        <small>
          No secrets are entered in this page, browser storage or exported
          packets.
        </small>
      </dialog>
      <dialog
        ref={guideDialog}
        onCancel={() => setGuideOpen(false)}
        onClose={() => setGuideOpen(false)}
        aria-labelledby="guide-heading"
      >
        <button
          type="button"
          className="dialog-close icon-button"
          aria-label="Close evidence guide"
          onClick={() => setGuideOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="eyebrow">A SMALL, IMPORTANT DISTINCTION</div>
        <h2 id="guide-heading">
          An approved checkout
          <br />
          isn’t a captured payment.
        </h2>
        <p>
          SettleProof compares the expected invoice with fresh sandbox order and
          capture records. Each finding points back to the fields behind it.
        </p>
        <div className="guide-example">
          <div>
            Invoice<span>$120.00 USD expected</span>
          </div>
          <ArrowRight size={19} />
          <div>
            Capture<span>$90.00 USD completed</span>
          </div>
          <ArrowRight size={19} />
          <div>
            Finding<span>$30.00 short</span>
          </div>
        </div>
        <h3>What the checks cover</h3>
        <p>
          Capture status, invoice reference, currency, duplicate capture IDs and
          refund uncertainty. Missing or unsupported data is reported for
          review.
        </p>
        <h3>What AI does</h3>
        <p>
          It explains checked evidence and drafts an internal review note. It
          cannot capture, refund, charge, send messages or mark a payment
          settled.
        </p>
        <h3>What remains your decision</h3>
        <p>
          Verify the invoice and account context, check cited records, and
          review the generated text before using it. This sandbox prototype is
          not an accounting system or settlement guarantee.
        </p>
      </dialog>
    </AgGridProvider>
  );
}
