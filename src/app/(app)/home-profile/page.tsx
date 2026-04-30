"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Input,
  Dialog,
  EmptyState,
} from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ShieldCheck,
  BookOpen,
  Receipt,
  Upload,
  Trash2,
  Phone,
  Star,
  Wrench,
  Plus,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HomeData {
  id: string;
  name: string;
  type: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  state: string | null;
  zipCode: string | null;
  climateZone: string | null;
  memberRole: string;
}

interface SystemData {
  id: string;
  systemType: string;
  subtype: string | null;
}

interface ApplianceData {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  warrantyExpiry: string | null;
}

interface DocData {
  id: string;
  name: string;
  type: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  signedUrl: string | null;
  createdAt: string;
}

interface ContractorData {
  id: string;
  name: string;
  company: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
}

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SYSTEM_LABELS: Record<string, { emoji: string; label: string }> = {
  hvac: { emoji: "\u{1F321}\uFE0F", label: "HVAC" },
  plumbing: { emoji: "\u{1F6BF}", label: "Plumbing" },
  electrical: { emoji: "\u26A1", label: "Electrical" },
  roofing: { emoji: "\u{1F3E0}", label: "Roofing" },
  foundation: { emoji: "\u{1F9F1}", label: "Foundation" },
  water_source: { emoji: "\u{1F4A7}", label: "Water Source" },
  sewage: { emoji: "\u{1F527}", label: "Sewer / Septic" },
  irrigation: { emoji: "\u{1F331}", label: "Irrigation" },
  pool: { emoji: "\u{1F3CA}", label: "Pool" },
  security: { emoji: "\u{1F512}", label: "Security" },
};

const APPLIANCE_GROUP_LABELS: Record<string, string> = {
  refrigerator: "Kitchen",
  dishwasher: "Kitchen",
  oven_range: "Kitchen",
  microwave: "Kitchen",
  garbage_disposal: "Kitchen",
  washing_machine: "Laundry",
  dryer: "Laundry",
  water_heater: "Water & Heating",
  furnace: "Water & Heating",
  ac_unit: "Water & Heating",
  water_softener: "Water & Heating",
  water_filter: "Water & Heating",
  humidifier: "Air Quality",
  dehumidifier: "Air Quality",
  garage_door: "Other",
  pool_pump: "Other",
  hot_tub: "Other",
  sump_pump: "Other",
  generator: "Other",
  other: "Other",
};

const AVATAR_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-purple-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-rose-400 to-pink-500",
];

const DOC_TYPE_VALUES = [
  "warranty", "manual", "receipt", "inspection_report",
  "insurance", "permit", "photo", "other",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitial(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(type: string | null) {
  switch (type) {
    case "insurance":
      return { Icon: ShieldCheck, bg: "bg-red-50", color: "text-red-500" };
    case "warranty":
      return { Icon: FileText, bg: "bg-green-50", color: "text-green-500" };
    case "manual":
      return { Icon: BookOpen, bg: "bg-blue-50", color: "text-blue-500" };
    case "receipt":
      return { Icon: Receipt, bg: "bg-amber-50", color: "text-amber-500" };
    default:
      return { Icon: FileText, bg: "bg-neutral-100", color: "text-neutral-500" };
  }
}

function warrantyStatus(expiry: string | null): { label: string; variant: "success" | "warning" | "danger" | "default" } {
  if (!expiry) return { label: "Unknown", variant: "default" };
  const exp = new Date(expiry);
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (exp < now) return { label: "Expired", variant: "danger" };
  if (exp < threeMonths) return { label: "Expiring", variant: "warning" };
  return { label: "Active", variant: "success" };
}

function homeTypeLabel(type: string | null): string {
  if (!type) return "Home";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Members Section                                                    */
/* ------------------------------------------------------------------ */

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
      } else {
        setInviteSuccess("Invite sent!");
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
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[gradientIdx]} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{getInitial(m.name, m.email)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.name || m.email}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">{m.role === "owner" ? "Owner" : "Member"}</p>
                </div>
                {entry.i === 0 && (
                  <span className="bg-[var(--color-primary-50)] text-[var(--color-primary-600)] rounded-full px-2.5 py-0.5 text-[11px] font-bold">You</span>
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
                  <span className="text-[var(--color-neutral-500)] font-bold text-sm">{inv.invitedEmail.charAt(0).toUpperCase()}</span>
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
        onClose={() => { setShowInvite(false); setInviteError(""); setInviteSuccess(""); }}
        title="Invite Family Member"
        description="They'll see the same home, tasks, and can mark things complete."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input label="Email address" type="email" placeholder="family@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} error={inviteError} />
          {inviteSuccess && <p className="text-sm text-[var(--color-success-600)]">{inviteSuccess}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} loading={inviteLoading} disabled={!inviteEmail.trim()}>Send Invite</Button>
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
  const [home, setHome] = useState<HomeData | null>(null);
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [applianceList, setApplianceList] = useState<ApplianceData[]>([]);
  const [docs, setDocs] = useState<DocData[]>([]);
  const [contractorList, setContractorList] = useState<ContractorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // System add/delete state
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [newSystemType, setNewSystemType] = useState("");
  const [newSystemSubtype, setNewSystemSubtype] = useState("");
  const [addingSystem, setAddingSystem] = useState(false);
  const [deletingSystemId, setDeletingSystemId] = useState<string | null>(null);

  // Appliance add/delete state
  const [addApplianceOpen, setAddApplianceOpen] = useState(false);
  const [newApplianceName, setNewApplianceName] = useState("");
  const [newApplianceCategory, setNewApplianceCategory] = useState("");
  const [addingAppliance, setAddingAppliance] = useState(false);
  const [deletingApplianceId, setDeletingApplianceId] = useState<string | null>(null);

  // Home edit state
  const [editingHome, setEditingHome] = useState(false);
  const [editHomeName, setEditHomeName] = useState("");
  const [editYearBuilt, setEditYearBuilt] = useState("");
  const [editSqft, setEditSqft] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editState, setEditState] = useState("");
  const [savingHome, setSavingHome] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<string>("other");

  useEffect(() => {
    if (home) {
      setEditHomeName(home.name);
      setEditYearBuilt(home.yearBuilt?.toString() || "");
      setEditSqft(home.squareFootage?.toString() || "");
      setEditZip(home.zipCode || "");
      setEditState(home.state || "");
    }
  }, [home]);

  const fetchAll = useCallback(async () => {
    try {
      const profileRes = await fetch("/api/home-profile");
      if (!profileRes.ok) return;
      const profileData = await profileRes.json();

      setHome(profileData.home);
      setSystems(profileData.systems || []);
      setApplianceList(profileData.appliances || []);

      if (profileData.home?.id) {
        const [docsRes, contractorsRes] = await Promise.all([
          fetch(`/api/documents?homeId=${profileData.home.id}`),
          fetch(`/api/contractors?homeId=${profileData.home.id}`),
        ]);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocs(docsData.documents || []);
        }
        if (contractorsRes.ok) {
          const cData = await contractorsRes.json();
          setContractorList(cData.contractors || []);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveHomeEdit = useCallback(async () => {
    setSavingHome(true);
    try {
      const res = await fetch("/api/home-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editHomeName.trim(),
          yearBuilt: editYearBuilt ? Number(editYearBuilt) : null,
          squareFootage: editSqft ? Number(editSqft) : null,
          zipCode: editZip.trim(),
          state: editState,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingHome(false);
      fetchAll();
    } catch {
      // stay in edit mode
    } finally {
      setSavingHome(false);
    }
  }, [editHomeName, editYearBuilt, editSqft, editZip, editState, fetchAll]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim() || !home) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("homeId", home.id);
      formData.append("name", uploadName.trim());
      formData.append("type", uploadType);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (res.ok) {
        setUploadOpen(false);
        setUploadFile(null);
        setUploadName("");
        setUploadType("other");
        const docsRes = await fetch(`/api/documents?homeId=${home.id}`);
        if (docsRes.ok) setDocs((await docsRes.json()).documents || []);
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleAddSystem = async () => {
    if (!newSystemType || !home) return;
    setAddingSystem(true);
    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId: home.id,
          systemType: newSystemType,
          subtype: newSystemSubtype || "standard",
        }),
      });
      if (res.ok) {
        setAddSystemOpen(false);
        setNewSystemType("");
        setNewSystemSubtype("");
        fetchAll();
      }
    } catch {
      // silently fail
    } finally {
      setAddingSystem(false);
    }
  };

  const handleDeleteSystem = async (systemId: string) => {
    setDeletingSystemId(systemId);
    try {
      const res = await fetch("/api/systems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: systemId }),
      });
      if (res.ok) {
        setSystems((prev) => prev.filter((s) => s.id !== systemId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingSystemId(null);
    }
  };

  const handleAddAppliance = async () => {
    if (!newApplianceName.trim() || !newApplianceCategory || !home) return;
    setAddingAppliance(true);
    try {
      const res = await fetch("/api/appliances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId: home.id,
          name: newApplianceName.trim(),
          category: newApplianceCategory,
        }),
      });
      if (res.ok) {
        setAddApplianceOpen(false);
        setNewApplianceName("");
        setNewApplianceCategory("");
        fetchAll();
      }
    } catch {
      // silently fail
    } finally {
      setAddingAppliance(false);
    }
  };

  const handleDeleteAppliance = async (applianceId: string) => {
    setDeletingApplianceId(applianceId);
    try {
      const res = await fetch("/api/appliances", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applianceId }),
      });
      if (res.ok) {
        setApplianceList((prev) => prev.filter((a) => a.id !== applianceId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingApplianceId(null);
    }
  };

  // Available system types not yet added
  const availableSystemTypes = Object.keys(SYSTEM_LABELS).filter(
    (key) => !systems.some((s) => s.systemType === key)
  );

  // Group appliances by area
  const appliancesByGroup = applianceList.reduce<Record<string, ApplianceData[]>>((acc, a) => {
    const group = APPLIANCE_GROUP_LABELS[a.category ?? "other"] ?? "Other";
    (acc[group] ??= []).push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <EmptyState
          title="No home set up"
          description="Complete onboarding to see your home profile."
          action={{ label: "Get Started", onClick: () => { window.location.href = "/onboarding"; } }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
      {/* ---- Hero Card ---- */}
      <div className="bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)] rounded-2xl p-6 relative overflow-hidden mb-2">
        <span className="absolute right-[-10px] bottom-[-10px] text-[80px] opacity-15 select-none pointer-events-none">
          {"\u{1F3E0}"}
        </span>

        {editingHome ? (
          <div className="flex flex-col gap-3 relative z-10">
            <Input
              label="Home name"
              value={editHomeName}
              onChange={(e) => setEditHomeName(e.target.value)}
              placeholder="My Home"
            />
            <div className="flex gap-2">
              <Input
                label="Year built"
                type="number"
                value={editYearBuilt}
                onChange={(e) => setEditYearBuilt(e.target.value)}
                placeholder="e.g. 1995"
              />
              <Input
                label="Square footage"
                type="number"
                value={editSqft}
                onChange={(e) => setEditSqft(e.target.value)}
                placeholder="e.g. 1800"
              />
            </div>
            <div className="flex gap-2">
              <Input
                label="State"
                value={editState}
                onChange={(e) => setEditState(e.target.value)}
                placeholder="e.g. TX"
              />
              <Input
                label="ZIP code"
                value={editZip}
                onChange={(e) => setEditZip(e.target.value)}
                placeholder="e.g. 78701"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <Button
                variant="primary"
                onClick={saveHomeEdit}
                loading={savingHome}
                disabled={!editHomeName.trim()}
                className="flex-1"
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingHome(false)}
                disabled={savingHome}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h1 className="text-[22px] font-extrabold text-[#78350f] tracking-tight">
                {home.name}
              </h1>
              <button
                onClick={() => setEditingHome(true)}
                className="text-[12px] font-semibold text-[#92400e] opacity-70 hover:opacity-100 transition-opacity ml-2 mt-1 shrink-0"
              >
                Edit
              </button>
            </div>
            <p className="text-[13px] text-[#92400e] font-semibold mt-0.5">
              {homeTypeLabel(home.type)}
              {home.yearBuilt ? ` \u00B7 Built ${home.yearBuilt}` : ""}
              {home.squareFootage ? ` \u00B7 ${home.squareFootage.toLocaleString()} sqft` : ""}
            </p>
            {home.state && (
              <p className="text-[12px] text-[#92400e] mt-1">
                {[home.state, home.zipCode].filter(Boolean).join(", ")}
              </p>
            )}
            <div className="flex gap-4 mt-4">
              <div>
                <p className="text-xl font-extrabold text-[#78350f]">{systems.length}</p>
                <p className="text-[11px] text-[#92400e] font-semibold">Systems</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#78350f]">{applianceList.length}</p>
                <p className="text-[11px] text-[#92400e] font-semibold">Appliances</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#78350f]">{docs.length}</p>
                <p className="text-[11px] text-[#92400e] font-semibold">Documents</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- Systems ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">Systems</h2>
          {availableSystemTypes.length > 0 && (
            <button
              onClick={() => setAddSystemOpen(true)}
              className="text-[13px] font-semibold text-[var(--color-primary-600)] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add &rarr;
            </button>
          )}
        </div>
        {systems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-6 text-center">
            <Wrench className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="text-sm text-[var(--color-neutral-400)]">
              No systems yet. Add your home systems to get tailored tasks.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {systems.map((s) => {
              const info = SYSTEM_LABELS[s.systemType] ?? { emoji: "\u{1F527}", label: s.systemType };
              const isDeleting = deletingSystemId === s.id;
              return (
                <div key={s.id} className={`flex items-center gap-2 bg-white border border-[var(--color-neutral-200)] rounded-xl px-3.5 py-2.5 ${isDeleting ? "opacity-30" : ""}`}>
                  <span className="text-[16px]">{info.emoji}</span>
                  <div>
                    <span className="text-[13px] font-semibold">{info.label}</span>
                    {s.subtype && s.subtype !== "standard" && <span className="text-[11px] text-[var(--color-neutral-400)] ml-1.5">{s.subtype}</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteSystem(s.id)}
                    disabled={isDeleting}
                    className="p-0.5 text-neutral-300 hover:text-red-500 transition-colors ml-1"
                    title="Remove system"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add System Dialog */}
        <Dialog open={addSystemOpen} onClose={() => setAddSystemOpen(false)} title="Add System" size="sm">
          <div className="space-y-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">System Type</label>
              <select
                value={newSystemType}
                onChange={(e) => setNewSystemType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Select a system...</option>
                {availableSystemTypes.map((key) => (
                  <option key={key} value={key}>
                    {SYSTEM_LABELS[key]?.emoji} {SYSTEM_LABELS[key]?.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Subtype (optional)"
              placeholder="e.g. central, split, tankless"
              value={newSystemSubtype}
              onChange={(e) => setNewSystemSubtype(e.target.value)}
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleAddSystem}
                disabled={!newSystemType || addingSystem}
              >
                {addingSystem ? "Adding..." : "Add System"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAddSystemOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </section>

      {/* ---- Appliances ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">Appliances</h2>
          <button
            onClick={() => setAddApplianceOpen(true)}
            className="text-[13px] font-semibold text-[var(--color-primary-600)] flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add &rarr;
          </button>
        </div>
        {applianceList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-6 text-center">
            <Wrench className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="text-sm text-[var(--color-neutral-400)]">
              No appliances yet. Add your appliances to track warranties and maintenance.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {Object.entries(appliancesByGroup).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-neutral-400)] px-4 pt-3 pb-1">
                  {group}
                </p>
                {items.map((a, idx) => {
                  const warranty = warrantyStatus(a.warrantyExpiry);
                  const isLast = idx === items.length - 1;
                  const isDeleting = deletingApplianceId === a.id;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"} ${isDeleting ? "opacity-30" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{a.name}</p>
                        <p className="text-xs text-[var(--color-neutral-400)]">
                          {[a.brand, a.model].filter(Boolean).join(" ") || "No details"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.warrantyExpiry && (
                          <Badge variant={warranty.variant} size="sm">
                            {warranty.label}
                          </Badge>
                        )}
                        <button
                          onClick={() => handleDeleteAppliance(a.id)}
                          disabled={isDeleting}
                          className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                          title="Remove appliance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Add Appliance Dialog */}
        <Dialog open={addApplianceOpen} onClose={() => setAddApplianceOpen(false)} title="Add Appliance" size="sm">
          <div className="space-y-4 mt-2">
            <Input
              label="Appliance Name"
              placeholder="e.g. Samsung Refrigerator"
              value={newApplianceName}
              onChange={(e) => setNewApplianceName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                value={newApplianceCategory}
                onChange={(e) => setNewApplianceCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Select a category...</option>
                {Object.entries(APPLIANCE_GROUP_LABELS).map(([key, group]) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} ({group})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleAddAppliance}
                disabled={!newApplianceName.trim() || !newApplianceCategory || addingAppliance}
              >
                {addingAppliance ? "Adding..." : "Add Appliance"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAddApplianceOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </section>

      {/* ---- Members ---- */}
      <MembersSection />

      {/* ---- Contractors ---- */}
      {contractorList.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold mb-3">Contractors</h2>
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {contractorList.map((c, idx) => {
              const isLast = idx === contractorList.length - 1;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {[c.specialty?.replace(/_/g, " "), c.company].filter(Boolean).join(" \u00B7 ") || "General"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {c.rating}
                      </span>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="p-1.5 text-[var(--color-primary-600)]">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Documents ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">Documents</h2>
          <button
            onClick={() => setUploadOpen(true)}
            className="text-[13px] font-semibold text-[var(--color-primary-600)] flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload &rarr;
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="text-sm text-[var(--color-neutral-400)]">
              No documents yet. Upload warranties, manuals, or receipts.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {docs.map((d, idx) => {
              const { Icon, bg, color } = docIcon(d.type);
              const isLast = idx === docs.length - 1;
              const isDeleting = deletingDocId === d.id;
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"} ${isDeleting ? "opacity-30" : ""}`}
                >
                  {d.signedUrl ? (
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </a>
                  ) : (
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.name}</p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {d.type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Document"}
                      {d.fileSizeBytes ? ` \u00B7 ${formatFileSize(d.fileSizeBytes)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(d.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document" size="md">
          <div className="space-y-4 mt-2">
            <Input
              label="Document Name"
              placeholder="e.g. Furnace Warranty"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {DOC_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {uploadFile && (
                <p className="text-xs text-[var(--color-neutral-400)]">
                  {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName.trim() || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </section>
    </div>
  );
}
