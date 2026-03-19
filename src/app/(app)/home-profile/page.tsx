"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Input,
  Dialog,
} from "@/components/ui";
import {
  FileText,
  ShieldCheck,
  BookOpen,
  Receipt,
  Upload,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const HOME = {
  name: "Main House",
  type: "Single Family",
  yearBuilt: 1995,
  sqft: "2,400",
  address: "1842 Maple Ridge Dr, Austin, TX 78745",
};

const SYSTEMS: {
  emoji: string;
  name: string;
  subtype: string;
  active: boolean;
}[] = [
  { emoji: "\u{1F321}\u{FE0F}", name: "HVAC", subtype: "Forced Air", active: true },
  { emoji: "\u{1F6BF}", name: "Plumbing", subtype: "Copper / PEX", active: true },
  { emoji: "\u{26A1}", name: "Electrical", subtype: "200 Amp Panel", active: true },
  { emoji: "\u{1F3E0}", name: "Roofing", subtype: "Asphalt Shingle", active: true },
  { emoji: "\u{1F9F1}", name: "Foundation", subtype: "Basement", active: true },
  { emoji: "\u{1F4A7}", name: "Water Supply", subtype: "Municipal", active: true },
  { emoji: "\u{1F527}", name: "Sewer", subtype: "Municipal", active: true },
  { emoji: "\u{1F331}", name: "Irrigation", subtype: "In-Ground Zones", active: true },
  { emoji: "\u{2600}\u{FE0F}", name: "Solar", subtype: "N/A", active: false },
  { emoji: "\u{1F525}", name: "Fireplace", subtype: "N/A", active: false },
];

interface Appliance {
  id: string;
  name: string;
  brand: string;
  model: string;
  room: string;
  warranty: "active" | "expiring" | "expired";
}

const APPLIANCES: Appliance[] = [
  { id: "1", name: "Refrigerator", brand: "Samsung", model: "RF28R7551SR", room: "Kitchen", warranty: "active" },
  { id: "2", name: "Dishwasher", brand: "Bosch", model: "SHPM88Z75N", room: "Kitchen", warranty: "active" },
  { id: "3", name: "Range / Oven", brand: "GE Profile", model: "PGS930", room: "Kitchen", warranty: "expiring" },
  { id: "4", name: "Washing Machine", brand: "LG", model: "WM4000HWA", room: "Laundry", warranty: "active" },
  { id: "5", name: "Dryer", brand: "LG", model: "DLEX4000W", room: "Laundry", warranty: "expired" },
  { id: "6", name: "Water Heater", brand: "Rheem", model: "PROG50-38N", room: "Basement", warranty: "expired" },
];

interface Doc {
  id: string;
  name: string;
  type: "warranty" | "manual" | "receipt" | "insurance";
  size: string;
  category: string;
  date: string;
}

const DOCUMENTS: Doc[] = [
  { id: "1", name: "Homeowners Insurance", type: "insurance", size: "2.4 MB", category: "Insurance", date: "2024-06-15" },
  { id: "2", name: "Samsung Fridge Warranty", type: "warranty", size: "1.1 MB", category: "Warranty", date: "2024-06-15" },
  { id: "3", name: "HVAC System Manual", type: "manual", size: "4.8 MB", category: "Manual", date: "2024-03-10" },
  { id: "4", name: "Roof Replacement Receipt", type: "receipt", size: "340 KB", category: "Receipt", date: "2023-11-22" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const AVATAR_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-purple-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-rose-400 to-pink-500",
];

function getInitial(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function docIcon(type: Doc["type"]) {
  switch (type) {
    case "insurance":
      return { Icon: ShieldCheck, bg: "bg-[var(--color-danger-50)]", color: "text-[var(--color-danger-600)]" };
    case "warranty":
      return { Icon: FileText, bg: "bg-[var(--color-success-50)]", color: "text-[var(--color-success-600)]" };
    case "manual":
      return { Icon: BookOpen, bg: "bg-[var(--color-info-50)]", color: "text-[var(--color-info-600)]" };
    case "receipt":
      return { Icon: Receipt, bg: "bg-[var(--color-warning-50)]", color: "text-[var(--color-warning-600)]" };
  }
}

/* ------------------------------------------------------------------ */
/*  Family Members Section (live data)                                 */
/* ------------------------------------------------------------------ */

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface Invite {
  id: string;
  invitedEmail: string;
  status: string;
  createdAt: string;
}

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/home/invite");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
      setInvites(data.invites || []);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const res = await fetch("/api/home/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite");
      } else if (data.autoAccepted) {
        setInviteSuccess(`${inviteEmail} has been added to your home!`);
        setInviteEmail("");
        fetchMembers();
      } else {
        setInviteSuccess(`Invite sent! ${inviteEmail} will be added when they sign up.`);
        setInviteEmail("");
        fetchMembers();
      }
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  const allEntries = [
    ...members.map((m, i) => ({ kind: "member" as const, m, i })),
    ...invites.map((inv, i) => ({ kind: "invite" as const, inv, i: members.length + i })),
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold">Members</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="text-[13px] font-semibold text-[var(--color-primary-600)]"
        >
          Invite &rarr;
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
        {allEntries.length === 0 && (
          <p className="text-sm text-[var(--color-neutral-400)] text-center py-6">
            Invite family members to share this home&apos;s maintenance plan.
          </p>
        )}

        {allEntries.map((entry, idx) => {
          const isLast = idx === allEntries.length - 1;
          if (entry.kind === "member") {
            const m = entry.m;
            const gradientIdx = entry.i % AVATAR_GRADIENTS.length;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
              >
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[gradientIdx]} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white font-bold text-sm">
                    {getInitial(m.name, m.email)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {m.name || m.email}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-400)]">
                    {m.role === "owner" ? "Owner" : "Member"}
                  </p>
                </div>
                {entry.i === 0 && (
                  <span className="bg-[var(--color-primary-50)] text-[var(--color-primary-600)] rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                    You
                  </span>
                )}
              </div>
            );
          } else {
            const inv = entry.inv;
            return (
              <div
                key={inv.id}
                className={`flex items-center gap-3 px-4 py-3 opacity-50 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
              >
                <div className="w-9 h-9 rounded-full bg-[var(--color-neutral-200)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--color-neutral-500)] font-bold text-sm">
                    {inv.invitedEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{inv.invitedEmail}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">Pending invite</p>
                </div>
                <Badge variant="warning" size="sm">Pending</Badge>
              </div>
            );
          }
        })}
      </div>

      <Dialog
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
          setInviteError("");
          setInviteSuccess("");
        }}
        title="Invite Family Member"
        description="They'll see the same home, tasks, and can mark things complete."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="family@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteError}
          />
          {inviteSuccess && (
            <p className="text-sm text-[var(--color-success-600)]">{inviteSuccess}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={inviteLoading} disabled={!inviteEmail.trim()}>
              Send Invite
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomeProfilePage() {
  const [home] = useState(HOME);

  /* group appliances by room */
  const appliancesByRoom = APPLIANCES.reduce<Record<string, Appliance[]>>((acc, a) => {
    (acc[a.room] ??= []).push(a);
    return acc;
  }, {});

  const totalAppliances = APPLIANCES.length;
  const activeSystems = SYSTEMS.filter((s) => s.active).length;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
      {/* ---- Hero Card ---- */}
      <div className="bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)] rounded-2xl p-6 relative overflow-hidden mb-5">
        <span className="absolute right-[-10px] bottom-[-10px] text-[80px] opacity-15 select-none pointer-events-none">
          {"\u{1F3E0}"}
        </span>
        <h1 className="text-[22px] font-extrabold text-[#78350f] tracking-tight">
          {home.name}
        </h1>
        <p className="text-[13px] text-[#92400e] font-semibold mt-0.5">
          {home.type} &middot; Built {home.yearBuilt} &middot; {home.sqft} sqft
        </p>
        <div className="flex gap-4 mt-4">
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{activeSystems}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Systems</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{totalAppliances}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Appliances</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{Object.keys(appliancesByRoom).length}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Rooms</p>
          </div>
        </div>
      </div>

      {/* ---- Systems ---- */}
      <section>
        <h2 className="text-[15px] font-bold mb-3">Systems</h2>
        <div className="flex flex-wrap gap-2">
          {SYSTEMS.filter((s) => s.active).map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 bg-white border border-[var(--color-neutral-200)] rounded-xl px-3.5 py-2.5"
            >
              <span className="text-[16px]">{s.emoji}</span>
              <span className="text-[13px] font-semibold">{s.name}</span>
            </div>
          ))}
          {SYSTEMS.filter((s) => !s.active).map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 bg-white border border-[var(--color-neutral-200)] rounded-xl px-3.5 py-2.5 opacity-40"
            >
              <span className="text-[16px]">{s.emoji}</span>
              <span className="text-[13px] font-semibold">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Members ---- */}
      <MembersSection />

      {/* ---- Documents ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">Documents</h2>
          <button className="text-[13px] font-semibold text-[var(--color-primary-600)] flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            Upload &rarr;
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
          {DOCUMENTS.map((d, idx) => {
            const { Icon, bg, color } = docIcon(d.type);
            const isLast = idx === DOCUMENTS.length - 1;
            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.name}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">
                    {d.category} &middot; {d.size}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
