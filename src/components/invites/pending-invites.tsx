"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, useToast } from "@/components/ui";

interface PendingInvite {
  id: string;
  homeName: string;
  inviterName: string | null;
}

/**
 * Invites addressed to the signed-in user. Nobody joins a home until they
 * choose Accept here. Renders nothing when there are none.
 */
export function PendingInvites({
  onAccepted,
  className = "",
}: {
  onAccepted: (homeId: string) => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      // 401 = no app user row yet (brand-new sign-up without invites; the
      // auth callback creates the row whenever an invite is pending)
      if (res.status === 401) return;
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvites(data.invites || []);
    } catch {
      toast("Couldn't check for home invites — refresh to try again", "error");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(invite: PendingInvite, action: "accept" | "decline") {
    setBusyId(invite.id);
    try {
      const res = await fetch(`/api/invites/${invite.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      if (action === "accept") {
        toast(`You joined ${invite.homeName}`, "success");
        onAccepted(data.homeId);
      } else {
        toast("Invite declined", "info");
      }
    } catch (err) {
      toast(
        err instanceof Error && err.message ? err.message : `Couldn't ${action} the invite — try again`,
        "error"
      );
      load();
    } finally {
      setBusyId(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5"
        >
          <p className="text-[15px] font-bold text-stone-900">
            {invite.inviterName || "Someone"} invited you to join {invite.homeName}
          </p>
          <p className="mt-1 text-xs text-[var(--color-neutral-600)] leading-relaxed">
            You&apos;ll share this home&apos;s maintenance list and can check off its tasks.
            Only join homes from people you know.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={() => respond(invite, "accept")}
              loading={busyId === invite.id}
              disabled={busyId !== null}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respond(invite, "decline")}
              disabled={busyId !== null}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
