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
} from "./task-constants";

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (id: string, completedDate?: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  actionLoading: string | null;
}

export function TaskDetailDialog({
  task,
  onClose,
  onComplete,
  onSkip,
  onSnooze,
  onDismiss,
  actionLoading,
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

  // Reset completion date when selecting a new task
  useEffect(() => {
    setCompletionDate("");
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
                    Every {task.frequencyValue} {task.frequencyUnit}
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

              {/* Actions */}
              {task.isActive && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      onComplete(task.id, completionDate || undefined);
                      onClose();
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onSkip(task.id);
                      onClose();
                    }}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      onSnooze(task.id);
                      onClose();
                    }}
                  >
                    <Clock className="h-4 w-4" />
                    Snooze
                  </Button>
                </div>
              )}

              {/* Dismiss option — only for system-generated tasks */}
              {task.isActive && !task.isCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss(task.id);
                    onClose();
                  }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  Not relevant — I don&apos;t have this
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
