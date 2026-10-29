"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, SkipForward, Clock, CircleSlash, RotateCcw, Pencil } from "lucide-react";
import {
  Button,
  Badge,
  Input,
  Select,
  Dialog,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  type Task,
  getCategoryLabel,
  categoryBadgeVariant,
  priorityLabels,
  formatFrequency,
} from "./task-constants";
import { formatDay } from "@/lib/tasks/date-edit";

const longDate = (day: string) =>
  new Date(day + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const dateInputClass =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (id: string, completedDate?: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
  onSaveDates: (
    id: string,
    dates: { nextDueDate?: string; lastCompletedDate?: string | null }
  ) => Promise<boolean>;
  onRevertLast: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  actionLoading?: string | null;
}

export function TaskDetailDialog({
  task,
  onClose,
  onComplete,
  onSkip,
  onSnooze,
  onSaveDates,
  onRevertLast,
  onDismiss,
}: TaskDetailDialogProps) {
  const { toast } = useToast();

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFreqValue, setEditFreqValue] = useState(1);
  const [editFreqUnit, setEditFreqUnit] = useState("months");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Completion date: today unless they say they did it on another day
  const [completionDate, setCompletionDate] = useState("");
  const [doneEarlier, setDoneEarlier] = useState(false);

  // Lasting undo of the last Complete/Skip asks once before it acts
  const [confirmingRevert, setConfirmingRevert] = useState(false);

  // Safety-task dismissal requires an explicit confirm
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);

  // Reset per-task state when selecting a new task
  useEffect(() => {
    setCompletionDate("");
    setDoneEarlier(false);
    setConfirmingDismiss(false);
    setConfirmingRevert(false);
  }, [task?.id]);

  const saveTaskEdit = useCallback(async () => {
    if (!task) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          frequencyValue: editFreqValue,
          frequencyUnit: editFreqUnit,
          notes: editNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditing(false);
      onClose();
      toast("Task updated", "success");
    } catch {
      toast("Failed to update task", "error");
    } finally {
      setEditSaving(false);
    }
  }, [task, editName, editFreqValue, editFreqUnit, editNotes, onClose, toast]);

  const handleClose = useCallback(() => {
    setEditing(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={!!task}
      onClose={handleClose}
      title={editing ? "Edit Task" : task?.name}
      size="lg"
    >
      {task && (
        <div className="space-y-5 mt-2">
          {editing ? (
            <div className="space-y-4">
              <Input
                label="Task Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Frequency"
                  type="number"
                  min={1}
                  value={String(editFreqValue)}
                  onChange={(e) =>
                    setEditFreqValue(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                />
                <Select
                  label="Unit"
                  value={editFreqUnit}
                  onChange={(e) => setEditFreqUnit(e.target.value)}
                  options={[
                    { value: "days", label: "Days" },
                    { value: "weeks", label: "Weeks" },
                    { value: "months", label: "Months" },
                    { value: "years", label: "Years" },
                  ]}
                />
              </div>
              <Textarea
                label="Notes"
                placeholder="Any notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={saveTaskEdit}
                  disabled={!editName.trim() || editSaving}
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={categoryBadgeVariant[task.category] || "default"}
                  size="md"
                >
                  {getCategoryLabel(task.category)}
                </Badge>
                <Badge
                  variant={
                    task.priority === "safety"
                      ? "danger"
                      : task.priority === "prevent_damage"
                        ? "warning"
                        : task.priority === "efficiency"
                          ? "info"
                          : "success"
                  }
                  size="md"
                >
                  {priorityLabels[task.priority] || task.priority} Priority
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frequency</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatFrequency(task.frequencyValue, task.frequencyUnit)}
                  </p>
                </div>
                <InlineDateField
                  label="Next Due"
                  value={task.nextDueDate}
                  editable={task.isActive}
                  onSave={(v) => (v ? onSaveDates(task.id, { nextDueDate: v }) : Promise.resolve(false))}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">
                    {getCategoryLabel(task.category)}
                  </p>
                </div>
                <InlineDateField
                  label="Last Completed"
                  value={task.lastCompletedDate}
                  emptyText="Never"
                  suffix={task.lastCompletedBy ? ` · by ${task.lastCompletedBy}` : ""}
                  max={formatDay(new Date())}
                  editable={task.isActive}
                  onSave={(v) => onSaveDates(task.id, { lastCompletedDate: v })}
                />
              </div>

              {/* Last Complete/Skip, revertable any time */}
              {task.lastAction && !task.dismissedAt && (
                <div className="text-xs text-muted-foreground">
                  {confirmingRevert ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        Undo the {task.lastAction.type === "skipped" ? "skip" : "completion"} on{" "}
                        {longDate(task.lastAction.date)}?
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          onRevertLast(task.id);
                          setConfirmingRevert(false);
                        }}
                      >
                        Undo it
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmingRevert(false)}>
                        Keep it
                      </Button>
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      {task.lastAction.type === "skipped" ? "Skipped" : "Completed"}{" "}
                      {longDate(task.lastAction.date)}
                      {task.lastAction.by ? ` by ${task.lastAction.by}` : ""}
                      <button
                        type="button"
                        onClick={() => setConfirmingRevert(true)}
                        className="ml-1 inline-flex items-center gap-1 rounded px-1 font-semibold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Undo
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Why It Matters */}
              {task.whyItMatters && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    Why It Matters
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {task.whyItMatters}
                  </p>
                </div>
              )}

              {/* Tips */}
              {task.tips && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    Tips
                  </h4>
                  <p className="text-sm text-muted-foreground">{task.tips}</p>
                </div>
              )}

              {/* Notes */}
              {task.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-muted-foreground">{task.notes}</p>
                </div>
              )}

              {/* Actions — each explains its consequence */}
              {task.isActive && (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onComplete(task.id, (doneEarlier && completionDate) || undefined);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-left text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">
                        {doneEarlier && completionDate
                          ? `Complete — done ${longDate(completionDate)}`
                          : "Complete"}
                      </span>
                      <span className="block text-xs opacity-85">
                        Logs it and schedules the next one
                      </span>
                    </span>
                  </button>
                  {doneEarlier ? (
                    <div>
                      <label htmlFor="backdate-date" className="text-xs text-muted-foreground">
                        When did you do it?
                      </label>
                      <input
                        id="backdate-date"
                        type="date"
                        value={completionDate}
                        max={formatDay(new Date())}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className={dateInputClass}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Then tap Complete. The next due date counts from this day.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDoneEarlier(true)}
                      className="self-start rounded px-1 text-xs font-semibold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Did it on another day?
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSkip(task.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SkipForward className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">Skip</span>
                      <span className="block text-xs text-muted-foreground">
                        Not this time — moves to the next cycle, no credit
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSnooze(task.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">Snooze</span>
                      <span className="block text-xs text-muted-foreground">
                        Remind me again in 7 days
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {/* Remove from plan — separated from the cycle actions above.
                  Undo lives in the toast; safety tasks still confirm first. */}
              {task.isActive && (
                <div className="border-t border-border pt-2">
                  {confirmingDismiss ? (
                    <div className="rounded-xl border border-[var(--color-danger-500)]/30 bg-[var(--color-danger-50)] p-3 text-center">
                      <p className="text-xs font-semibold text-[var(--color-danger-700)]">
                        This is a safety task. Remove it from your plan anyway?
                      </p>
                      <div className="mt-2 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            onDismiss(task.id);
                            onClose();
                          }}
                        >
                          Remove it
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmingDismiss(false)}>
                          Keep it
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (task.priority === "safety") {
                          setConfirmingDismiss(true);
                        } else {
                          onDismiss(task.id);
                          onClose();
                        }
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CircleSlash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold">
                          {task.isCustom ? "Remove this task" : "I don\u2019t have this"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Takes it off your plan. You can undo, or restore it later.
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

const isCompleteDay = (v: string) => {
  const year = Number(v.slice(0, 4));
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && year >= 2000 && year <= 2100;
};

/**
 * A date in the details grid that edits in place: tap the value (or its
 * pencil) and the picker opens; picking a date saves it. Esc cancels.
 */
function InlineDateField({
  label,
  value,
  emptyText = "",
  suffix = "",
  max,
  editable,
  onSave,
}: {
  label: string;
  value: string | null;
  emptyText?: string;
  suffix?: string;
  max?: string;
  editable: boolean;
  onSave: (value: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useRef(false);
  // Typing changes one segment at a time, and each step can already look
  // like a whole date — so typed edits save on Enter/blur, picks save at once.
  const typing = useRef(false);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      // Some browsers only open the picker from a direct tap; focus is enough.
    }
  }, [editing]);

  const commit = async (next: string) => {
    if (committed.current) return;
    committed.current = true;
    const normalized = next || null;
    if (normalized === value || (!normalized && !value)) {
      setEditing(false);
      return;
    }
    // Half-typed dates, or an empty Next Due, just back out.
    if ((normalized && !isCompleteDay(normalized)) || (!normalized && label === "Next Due")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(normalized);
    setSaving(false);
    setEditing(false);
  };

  const display = value ? longDate(value) : emptyText;
  const id = `inline-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      {editing ? (
        <input
          ref={inputRef}
          id={id}
          type="date"
          data-own-escape
          value={draft}
          max={max}
          disabled={saving}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (!typing.current && isCompleteDay(v)) commit(v);
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== "Escape" && e.key !== "Tab") {
              typing.current = true;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              committed.current = true;
              setEditing(false);
            }
          }}
          className="-mx-1 block h-5 w-[calc(100%+0.5rem)] rounded border-0 bg-white px-1 text-sm font-medium text-foreground outline-none ring-2 ring-ring"
        />
      ) : editable ? (
        <button
          type="button"
          onClick={() => {
            committed.current = false;
            typing.current = false;
            setDraft(value ?? "");
            setEditing(true);
          }}
          aria-label={`${label}: ${display || "not set"}. Edit`}
          className="group -mx-1 flex items-center gap-1.5 rounded px-1 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            {display}
            {suffix}
          </span>
          <Pencil
            aria-hidden="true"
            className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground"
          />
        </button>
      ) : (
        <p className="text-sm font-medium text-foreground">
          {display}
          {suffix}
        </p>
      )}
    </div>
  );
}
