"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Input,
  Select,
  Dialog,
  Textarea,
  useToast,
} from "@/components/ui";
import { CATEGORY_CONFIG } from "./task-constants";

interface AddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
}

export function AddTaskDialog({ open, onClose, onTaskAdded }: AddTaskDialogProps) {
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("heating_cooling");
  const [newPriority, setNewPriority] = useState("prevent_damage");
  const [newFreqValue, setNewFreqValue] = useState<number>(1);
  const [newFreqUnit, setNewFreqUnit] = useState("months");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setNewName("");
    setNewCategory("heating_cooling");
    setNewPriority("prevent_damage");
    setNewFreqValue(1);
    setNewFreqUnit("months");
    setNewNotes("");
  }, []);

  const handleAddTask = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: "",
          category: newCategory,
          priority: newPriority,
          frequencyValue: newFreqValue,
          frequencyUnit: newFreqUnit,
          notes: newNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      resetForm();
      onClose();
      onTaskAdded();
      toast("Task added!", "success");
    } catch {
      toast("Failed to add task", "error");
    } finally {
      setSaving(false);
    }
  }, [newName, newCategory, newPriority, newFreqValue, newFreqUnit, newNotes, resetForm, onClose, onTaskAdded, toast]);

  return (
    <Dialog open={open} onClose={onClose} title="Add Task" size="md">
      <div className="space-y-4 mt-2">
        <Input
          label="Task Name"
          placeholder="e.g. Clean dryer vent"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />

        <Select
          label="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          options={Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => ({
            value,
            label,
          }))}
        />

        <Select
          label="Priority"
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          options={[
            { value: "safety", label: "Critical" },
            { value: "prevent_damage", label: "Preventive" },
            { value: "efficiency", label: "Efficiency" },
            { value: "cosmetic", label: "Cosmetic" },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Frequency"
            type="number"
            min={1}
            placeholder="1"
            value={String(newFreqValue)}
            onChange={(e) =>
              setNewFreqValue(Math.max(1, parseInt(e.target.value) || 1))
            }
          />
          <Select
            label="Unit"
            value={newFreqUnit}
            onChange={(e) => setNewFreqUnit(e.target.value)}
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
          placeholder="Any additional notes..."
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
        />

        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleAddTask}
            disabled={!newName.trim() || saving}
          >
            {saving ? "Saving..." : "Save Task"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
