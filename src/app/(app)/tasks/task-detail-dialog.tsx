"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, SkipForward, Clock, CircleSlash, RotateCcw } from "lucide-react";
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
import { formatDay, nextDueFrom } from "@/lib/tasks/date-edit";
import type { FrequencyUnit } from "@/lib/tasks/templates";

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

  // Hand-editing Next Due / Last Completed
  const [editingDates, setEditingDates] = useState(false);
  const [dueInput, setDueInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

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
    setEditingDates(false);
  }, [task?.id]);

  const startEditingDates = () => {
    if (!task) return;
    setDueInput(task.nextDueDate);
    setLastInput(task.lastCompletedDate ?? "");
    setDueTouched(false);
    setEditingDates(true);
  };

  // Changing "last done" suggests a matching next due until they set one.
  const onLastInputChange = (value: string) => {
    setLastInput(value);
    if (task && value && !dueTouched) {
      setDueInput(
        nextDueFrom(value, {
          frequencyValue: task.frequencyValue,
          frequencyUnit: task.frequencyUnit as FrequencyUnit,
        })
      );
    }
  };

  const saveDates = async () => {
    if (!task || !dueInput) return;
    const dates: { nextDueDate?: string; lastCompletedDate?: string | null } = {};
    if (dueInput !== task.nextDueDate) dates.nextDueDate = dueInput;
    const last = lastInput || null;
    if (last !== task.lastCompletedDate) {
      dates.lastCompletedDate = last;
      dates.nextDueDate = dueInput; // what they see is what they get
    }
    if (Object.keys(dates).length === 0) {
      setEditingDates(false);
      return;
    }
    setSavingDates(true);
    const ok = await onSaveDates(task.id, dates);
    setSavingDates(false);
    if (ok) onClose();
  };

  // Populate edit fields when a task is selected
  useEffect(() => {
    if (task) {
      setEditName(task.name);
      setEditFreqValue(task.frequencyValue);
      setEditFreqUnit(task.frequencyUnit);
      setEditNotes(task.notes || "");
      setEditing(false);
    }
  }, [task]);

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
                <div>
                  <p className="text-xs text-muted-foreground">Next Due</p>
                  <p className="text-sm font-medium text-foreground">
                    {longDate(task.nextDueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">
                    {getCategoryLabel(task.category)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Last Completed
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {task.lastCompletedDate ? longDate(task.lastCompletedDate) : "Never"}
                    {task.lastCompletedBy ? ` · by ${task.lastCompletedBy}` : ""}
                  </p>
                </div>
              </div>

              {/* Hand-edit the dates */}
              {editingDates ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <label htmlFor="edit-last-done" className="text-xs text-muted-foreground">
                      Last completed
                    </label>
                    <input
                      id="edit-last-done"
                      type="date"
                      value={lastInput}
                      max={formatDay(new Date())}
                      onChange={(e) => onLastInputChange(e.target.value)}
                      className={dateInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-next-due" className="text-xs text-muted-foreground">
                      Next due
                    </label>
                    <input
                      id="edit-next-due"
                      type="date"
                      value={dueInput}
                      onChange={(e) => {
                        setDueInput(e.target.value);
                        setDueTouched(true);
                      }}
                      className={dateInputClass}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Changing the last-completed date fills this in from the task&rsquo;s frequency. You can still pick any date.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={saveDates}
                      disabled={!dueInput || savingDates}
                    >
                      {savingDates ? "Saving..." : "Save dates"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setEditingDates(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                (task.isActive || task.lastAction) && !task.dismissedAt && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    {task.lastAction ? (
                      confirmingRevert ? (
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
                              onClose();
                            }}
                          >
                            Undo it
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmingRevert(false)}>
                            Keep it
                          </Button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
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
                      )
                    ) : (
                      <span />
                    )}
                    {task.isActive && (
                      <Button variant="ghost" size="sm" onClick={startEditingDates}>
                        Change dates
                      </Button>
                    )}
                  </div>
                )
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
