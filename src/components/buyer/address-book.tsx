"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBuyerAddress, setDefaultBuyerAddress } from "@/lib/actions/buyer";
import { AddressForm } from "./address-form";
import { Pencil, Trash2, Star, Plus } from "lucide-react";

const COUNTRY_NAMES: Record<string, string> = {
  IE: "Ireland", AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia",
  CY: "Cyprus", CZ: "Czech Republic", DK: "Denmark", EE: "Estonia", FI: "Finland",
  FR: "France", DE: "Germany", GR: "Greece", HU: "Hungary", IT: "Italy",
  LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta", NL: "Netherlands",
  PL: "Poland", PT: "Portugal", RO: "Romania", SK: "Slovakia", SI: "Slovenia",
  ES: "Spain", SE: "Sweden", GB: "United Kingdom", CH: "Switzerland", NO: "Norway",
};

export type AddressItem = {
  id: string;
  name: string | null;
  line1: string;
  houseNumber: string | null;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

export function AddressBook({ addresses }: { addresses: AddressItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(addresses.length === 0);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBuyerAddress(id);
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      await setDefaultBuyerAddress(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div key={addr.id} className="rounded-xl border border-border bg-bg-card">
          {editingId === addr.id ? (
            <div className="p-5">
              <p className="mb-4 text-sm font-semibold text-text-secondary">Edit address</p>
              <AddressForm
                initial={addr}
                onSuccess={() => { setEditingId(null); router.refresh(); }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <address className="not-italic text-sm leading-relaxed text-text-secondary">
                  {addr.name && <p className="font-medium">{addr.name}</p>}
                  <p>{addr.line1}{addr.houseNumber ? ` ${addr.houseNumber}` : ""}</p>
                  {addr.line2 && <p>{addr.line2}</p>}
                  <p>{addr.postalCode} {addr.city}</p>
                  <p>{COUNTRY_NAMES[addr.country] ?? addr.country}</p>
                  {addr.phone && <p className="text-text-muted">{addr.phone}</p>}
                </address>
                {addr.isDefault && (
                  <span className="shrink-0 rounded-full bg-bg-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    Default
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button
                  onClick={() => { setEditingId(addr.id); setConfirmDeleteId(null); }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <Pencil size={12} /> Edit
                </button>

                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary disabled:opacity-40"
                  >
                    <Star size={12} /> Make default
                  </button>
                )}

                {confirmDeleteId === addr.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Delete this address?</span>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                    >
                      {isPending ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-text-muted hover:text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirmDeleteId(addr.id); setEditingId(null); }}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-red-200 hover:text-red-600"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <p className="mb-4 text-sm font-semibold text-text-secondary">Add address</p>
          <AddressForm
            initial={null}
            onSuccess={() => { setShowAdd(false); router.refresh(); }}
            onCancel={addresses.length > 0 ? () => setShowAdd(false) : undefined}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong py-4 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-secondary"
        >
          <Plus size={16} />
          Add address
        </button>
      )}
    </div>
  );
}
