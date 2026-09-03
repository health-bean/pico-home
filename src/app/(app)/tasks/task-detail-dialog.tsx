"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, SkipForward, Clock } from "lucide-react";
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

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (id: string, completedDate?: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  actionLoading?: string | null;
}

export function TaskDetailDialog({
  task,
  onClose,
  onComplete,
  onSkip,
  onSnooze,
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

  // Completion date state
  const [completionDate, setCompletionDate] = useState("");

  // Safety-task dismissal requires an explicit confirm
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);

  // Reset per-task state when selecting a new task
  useEffect(() => {
    setCompletionDate("");
    setConfirmingDismiss(false);
  }, [task?.id]);

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
                    {new Date(
                      task.nextDueDate + "T00:00:00"
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
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
                    {task.lastCompletedDate
                      ? new Date(
                          task.lastCompletedDate + "T00:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                    {task.lastCompletedBy ? ` · by ${task.lastCompletedBy}` : ""}
                  </p>
                </div>
              </div>

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

              {/* Backdate option */}
              {task.isActive && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    When did you last do this? (optional)
                  </label>
                  <input
                    type="date"
                    value={completionDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              {/* Actions — each explains its consequence */}
              {task.isActive && (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onComplete(task.id, completionDate || undefined);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-left text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">Complete</span>
                      <span className="block text-xs opacity-85">
                        Logs it and schedules the next one
                      </span>
                    </span>
                  </button>
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

              {/* Dismiss option — only for system-generated tasks; safety
                  tasks require an explicit confirm */}
              {task.isActive && !task.isCustom && (
                confirmingDismiss ? (
                  <div className="rounded-xl border border-[var(--color-danger-500)]/30 bg-[var(--color-danger-50)] p-3 text-center">
                    <p className="text-xs font-semibold text-[var(--color-danger-700)]">
                      This is a safety task. Dismiss it anyway?
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
                        Dismiss
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
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  >
                    Not relevant — I don&apos;t have this
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
