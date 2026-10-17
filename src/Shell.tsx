import { lazy, Suspense } from "react";
const EvidenceDesk = lazy(() => import("./App"));
const Agreements = lazy(() => import("./Agreements"));

export default function Shell() {
  const evidence = window.location.pathname.replace(/\/$/, "") === "/evidence";
  return <Suspense fallback={<main className="ag-loading" role="status">Opening SettleProof…</main>}>
    {evidence ? <EvidenceDesk /> : <Agreements />}
  </Suspense>;
}
