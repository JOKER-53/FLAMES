import { DraftWorkspace } from "../../drafts/DraftWorkspace";
// ============================================================================
// Address object manager. Visual layout tightened against real FortiGate
// reference screenshots: objects are grouped under a labeled section
// header ("IP Range/Subnet"), matching the real Addresses page's grouped
// structure. Our v1 data model only supports subnet/range types, so we
// show one group for now -- this leaves room to add Device MAC Address,
// FQDN, and Address Group sections in a later phase without restructuring
// the page again.
// ============================================================================

import { useState } from "react";
import type { AddressObject } from "@fortisim/engine";
import { ScenarioSession } from "../../hooks/useScenarioSession";

interface AddressesPageProps {
  session: ScenarioSession;
}

function emptyDraft(): Omit<AddressObject, "id"> {
  return { name: "", type: "subnet", value: "", comment: "" };
}

export function AddressesPage({ session }: AddressesPageProps) {
  const { addresses, setAddresses, loadError } = session;
  const [draft, setDraft] = useState<Omit<AddressObject, "id">>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingId(null);
    setError(null);
  }

  function startEdit(addr: AddressObject) {
    const { id, ...rest } = addr;
    setDraft({ ...rest, comment: rest.comment ?? "" });
    setEditingId(id);
    setSelectedRow(id);
    setError(null);
  }

  function validateValue(type: "subnet" | "range", value: string): string | null {
    const v = value.trim();
    if (v.toLowerCase() === "all" || v.toLowerCase() === "any") return null;
    if (type === "subnet") {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(v)) {
        return 'Subnet must look like "10.0.2.0/24" (or "all")';
      }
    } else {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}-\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) {
        return 'Range must look like "10.0.1.10-10.0.1.20"';
      }
    }
    return null;
  }

  function saveAddress() {
    if (!draft.name.trim()) {
      setError("Address needs a name.");
      return;
    }
    const validationError = validateValue(draft.type, draft.value);
    if (validationError) {
      setError(validationError);
      return;
    }
    const nameTaken = addresses.some(
      (a) => a.name.toLowerCase() === draft.name.trim().toLowerCase() && a.id !== editingId
    );
    if (nameTaken) {
      setError(`An address object named "${draft.name}" already exists.`);
      return;
    }

    if (editingId) {
      setAddresses((prev) => prev.map((a) => (a.id === editingId ? { ...draft, id: editingId } : a)));
    } else {
      const newAddr: AddressObject = { ...draft, id: `addr_${Date.now()}` };
      setAddresses((prev) => [...prev, newAddr]);
    }
    resetDraft();
  }

  function deleteAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) resetDraft();
    if (selectedRow === id) setSelectedRow(null);
  }

  function deleteSelected() {
    if (!selectedRow) return;
    deleteAddress(selectedRow);
  }

  if (loadError) {
    return <div className="text-danger">Failed to load scenario: {loadError}</div>;
  }

  return (
    <DraftWorkspace draft={session.draft}>
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Addresses</h1>
      <p className="text-muted text-[12.5px] mb-4">
        Address objects represent IP subnets, ranges, or "all" — referenced by source/destination in firewall policies.
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
              const a = addresses.find((a) => a.id === selectedRow);
              if (a) startEdit(a);
              else alert("Select an address row first.");
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

        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-sunken text-body text-left">
              <th className="px-3 py-1.5 font-medium" colSpan={5}>IP Range/Subnet</th>
            </tr>
            <tr className="bg-sunken text-muted text-left border-b border-line">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Details</th>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {addresses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-faint">
                  No address objects yet. Use "Create New" below to add one.
                </td>
              </tr>
            )}
            {addresses.map((a) => (
              <tr
                key={a.id}
                tabIndex={0} aria-selected={selectedRow===a.id} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();setSelectedRow(a.id);}}} onClick={() => setSelectedRow(a.id)}
                className={`border-b border-line cursor-pointer ${selectedRow === a.id ? "bg-info-soft" : "hover:bg-sunken"}`}
              >
                <td className="px-3 py-2 font-medium text-ink">{a.name}</td>
                <td className="px-3 py-2 text-body">{a.type === "subnet" ? "Subnet" : "IP Range"}</td>
                <td className="px-3 py-2 text-body font-mono">{a.value}</td>
                <td className="px-3 py-2 text-faint">{a.comment || "—"}</td>
                <td className="px-3 py-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-line rounded-md p-4">
        <div className="text-[13px] font-medium text-body mb-3">
          {editingId ? "Edit Address" : "New Address"}
        </div>

        {error && <div className="text-danger text-[12px] mb-3">{error}</div>}

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-[11px] text-muted mb-1">Name</label>
            <input
              type="text"
              aria-label="Address name" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]"
              placeholder="e.g. DB-Server"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Type</label>
            <select
              aria-label="Address type" value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as "subnet" | "range" }))}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]"
            >
              <option value="subnet">Subnet (CIDR)</option>
              <option value="range">IP Range</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Value</label>
            <input
              type="text"
              aria-label="Address value" value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px] font-mono"
              placeholder={draft.type === "subnet" ? "10.0.2.0/24" : "10.0.1.10-10.0.1.20"}
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
            onClick={saveAddress}
            className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90"
          >
            {editingId ? "Save Changes" : "Create Address"}
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
