import { DraftWorkspace } from "../../drafts/DraftWorkspace";
// ============================================================================
// Service object manager. Visual layout tightened to match Addresses/
// Firewall Policy: toolbar above the table (Create New / Edit / Delete),
// row selection, grouped section headers. Real FortiOS groups services
// into Default/Custom; we group by Protocol instead since that's a
// grouping that's actually true of our data model.
// ============================================================================

import { useState } from "react";
import type { ServiceObject, Protocol } from "@fortisim/engine";
import { ScenarioSession } from "../../hooks/useScenarioSession";

interface ServicesPageProps {
  session: ScenarioSession;
}

const PROTOCOLS: Protocol[] = ["TCP", "UDP", "ICMP"];

function emptyDraft(): Omit<ServiceObject, "id"> {
  return { name: "", protocol: "TCP", port: "", comment: "" };
}

export function ServicesPage({ session }: ServicesPageProps) {
  const { services, setServices, loadError } = session;
  const [draft, setDraft] = useState<Omit<ServiceObject, "id">>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingId(null);
    setError(null);
  }

  function startEdit(svc: ServiceObject) {
    const { id, ...rest } = svc;
    setDraft({ ...rest, port: rest.port ?? "", comment: rest.comment ?? "" });
    setEditingId(id);
    setSelectedRow(id);
    setError(null);
  }

  function validatePort(protocol: Protocol, port: string): string | null {
    if (protocol === "ICMP") return null;
    const v = port.trim();
    if (!v) return "Port is required for TCP/UDP services.";
    if (v.includes("-")) {
      const [start, end] = v.split("-").map((s) => Number(s.trim()));
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 65535 || end < start) {
        return 'Port range must look like "1024-65535" with valid bounds.';
      }
    } else {
      const single = Number(v);
      if (!Number.isInteger(single) || single < 1 || single > 65535) {
        return "Port must be a number between 1 and 65535.";
      }
    }
    return null;
  }

  function saveService() {
    if (!draft.name.trim()) {
      setError("Service needs a name.");
      return;
    }
    const portError = validatePort(draft.protocol, draft.port ?? "");
    if (portError) {
      setError(portError);
      return;
    }
    const nameTaken = services.some(
      (s) => s.name.toLowerCase() === draft.name.trim().toLowerCase() && s.id !== editingId
    );
    if (nameTaken) {
      setError(`A service object named "${draft.name}" already exists.`);
      return;
    }

    const toSave = { ...draft, port: draft.protocol === "ICMP" ? undefined : draft.port };

    if (editingId) {
      setServices((prev) => prev.map((s) => (s.id === editingId ? { ...toSave, id: editingId } : s)));
    } else {
      const newSvc: ServiceObject = { ...toSave, id: `svc_${Date.now()}` };
      setServices((prev) => [...prev, newSvc]);
    }
    resetDraft();
  }

  function deleteService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) resetDraft();
    if (selectedRow === id) setSelectedRow(null);
  }

  function deleteSelected() {
    if (!selectedRow) return;
    deleteService(selectedRow);
  }

  if (loadError) {
    return <div className="text-danger">Failed to load scenario: {loadError}</div>;
  }

  const grouped = PROTOCOLS.map((proto) => ({
    protocol: proto,
    items: services.filter((s) => s.protocol === proto),
  })).filter((g) => g.items.length > 0);

  return (
    <DraftWorkspace draft={session.draft}>
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Services</h1>
      <p className="text-muted text-[12.5px] mb-4">
        Service objects define a protocol and port (or port range) — referenced by firewall policies to match traffic type.
      </p>

      <div className="bg-surface border border-line rounded-md overflow-hidden mb-5">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-line bg-sunken">
          <button
            onClick={resetDraft}
            className="text-[12px] px-2.5 py-1 bg-forti-red text-white rounded-sm hover:bg-forti-red/90 flex items-center gap-1"
          >
            <span className="text-[13px] leading-none">+</span> Create New
          </button>
          <button
            onClick={() => {
              const s = services.find((s) => s.id === selectedRow);
              if (s) startEdit(s);
              else alert("Select a service row first.");
            }}
            className="text-[12px] px-2.5 py-1 border border-line-strong rounded-sm text-body hover:bg-sunken"
          >
            Edit
          </button>
          <button
            onClick={deleteSelected}
            disabled={!selectedRow}
            className="text-[12px] px-2.5 py-1 border border-line-strong rounded-sm text-body hover:bg-sunken disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        {services.length === 0 ? (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-sunken text-muted text-left border-b border-line">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Protocol</th>
                <th className="px-3 py-2 font-medium">Port</th>
                <th className="px-3 py-2 font-medium">Comment</th>
                <th className="px-3 py-2 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-faint">
                  No service objects yet. Use "Create New" below to add one.
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          grouped.map((group) => (
            <table key={group.protocol} className="w-full text-[12.5px] border-b border-line last:border-b-0">
              <thead>
                <tr className="bg-sunken text-body text-left">
                  <th className="px-3 py-1.5 font-medium" colSpan={5}>{group.protocol}</th>
                </tr>
                <tr className="bg-sunken text-muted text-left border-b border-line">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Protocol</th>
                  <th className="px-3 py-2 font-medium">Port</th>
                  <th className="px-3 py-2 font-medium">Comment</th>
                  <th className="px-3 py-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((s) => (
                  <tr
                    key={s.id}
                    tabIndex={0} aria-selected={selectedRow===s.id} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();setSelectedRow(s.id);}}} onClick={() => setSelectedRow(s.id)}
                    className={`border-b border-line cursor-pointer ${selectedRow === s.id ? "bg-info-soft" : "hover:bg-sunken"}`}
                  >
                    <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                    <td className="px-3 py-2 text-body">{s.protocol}</td>
                    <td className="px-3 py-2 text-body font-mono">{s.port ?? "—"}</td>
                    <td className="px-3 py-2 text-faint">{s.comment || "—"}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
      </div>

      <div className="bg-surface border border-line rounded-md p-4">
        <div className="text-[13px] font-medium text-body mb-3">
          {editingId ? "Edit Service" : "New Service"}
        </div>

        {error && <div className="text-danger text-[12px] mb-3">{error}</div>}

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-[11px] text-muted mb-1">Name</label>
            <input
              type="text"
              aria-label="Service name" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]"
              placeholder="e.g. MySQL"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Protocol</label>
            <select
              aria-label="Service protocol" value={draft.protocol}
              onChange={(e) => setDraft((d) => ({ ...d, protocol: e.target.value as Protocol }))}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]"
            >
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">
              Port {draft.protocol === "ICMP" && <span className="text-faint">(n/a for ICMP)</span>}
            </label>
            <input
              type="text"
              aria-label="Service port" value={draft.protocol === "ICMP" ? "" : draft.port ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, port: e.target.value }))}
              disabled={draft.protocol === "ICMP"}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px] font-mono disabled:bg-sunken disabled:text-faint"
              placeholder="443 or 1024-65535"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] text-muted mb-1">Comment (optional)</label>
          <input
            type="text"
            aria-label="Comment (optional)" value={draft.comment ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
            className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveService}
            className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90"
          >
            {editingId ? "Save Changes" : "Create Service"}
          </button>
          {editingId && (
            <button
              onClick={resetDraft}
              className="px-3 py-1.5 border border-line-strong rounded-sm text-[12.5px] text-body hover:bg-sunken"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
    </DraftWorkspace>
  );
}
