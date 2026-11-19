"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Copy,
  Download,
  Power,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { downloadFile } from "@/lib/download";
import { usePermissions } from "@/hooks/use-permissions";

// ─────────────────────────────────────────────────────────────────────
// EvaluationFormsManager — CRUD + export for performance evaluation forms
// Rendered inside Evaluation Management, above the period list.
// ─────────────────────────────────────────────────────────────────────

interface FormRow {
  id: string;
  name: string;
  version: number;
  active: boolean;
  criteriaCount?: number;
  periodsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CriterionDraft {
  key: string;
  category: string;
  description: string;
  maxScore: number;
  weight: number;
}

interface FormDetail extends FormRow {
  criteria: CriterionDraft[];
  evaluationsCount?: number;
}

const inputClass =
  "w-full px-3 py-2 bg-rcc-bg border border-rcc-border rounded-md text-sm text-rcc-text-primary focus:outline-none focus:ring-2 focus:ring-rcc-accent/40";

const smallInputClass =
  "px-2 py-1 bg-rcc-bg border border-rcc-border rounded-md text-xs text-rcc-text-primary focus:outline-none focus:ring-2 focus:ring-rcc-accent/40";

let draftSeq = 0;
function draftKey() {
  draftSeq += 1;
  return `draft-${draftSeq}`;
}

function blankCriterion(): CriterionDraft {
  return { key: draftKey(), category: "", description: "", maxScore: 5, weight: 1 };
}

export function EvaluationFormsManager({ onChanged }: { onChanged?: () => void }) {
  const { has } = usePermissions();
  const canManage = has("evaluation.manage_forms");
  const canExport = has("evaluation.export_forms") || canManage;

  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState("");
  const [editorActive, setEditorActive] = useState(true);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [usedCount, setUsedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ forms: FormRow[] }>("/api/evaluation-forms?scope=all");
      setForms(data.forms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(criteria.map((c) => c.category).filter(Boolean))),
    [criteria]
  );

  const openCreate = () => {
    setEditingId(null);
    setEditorName("");
    setEditorActive(true);
    setCriteria([blankCriterion()]);
    setSourceId("");
    setUsedCount(0);
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEdit = async (form: FormRow) => {
    setEditingId(form.id);
    setEditorName(form.name);
    setEditorActive(form.active);
    setCriteria([]);
    setSourceId("");
    setUsedCount(0);
    setEditorError(null);
    setEditorOpen(true);
    try {
      const data = await apiFetch<{ form: FormDetail }>(`/api/evaluation-forms/${form.id}`);
      setCriteria(
        (data.form.criteria ?? []).map((c) => ({
          key: draftKey(),
          category: c.category,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
        }))
      );
      setUsedCount(data.form.evaluationsCount ?? 0);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to load form.");
    }
  };

  const loadSource = async (id: string) => {
    setSourceId(id);
    if (!id) return;
    setSourceLoading(true);
    setEditorError(null);
    try {
      const data = await apiFetch<{ form: FormDetail }>(`/api/evaluation-forms/${id}`);
      setCriteria(
        (data.form.criteria ?? []).map((c) => ({
          key: draftKey(),
          category: c.category,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
        }))
      );
      if (!editorName.trim()) setEditorName(`${data.form.name} (copy)`);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to load source form.");
    } finally {
      setSourceLoading(false);
    }
  };

  const updateCriterion = (key: string, patch: Partial<CriterionDraft>) => {
    setCriteria((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const moveCriterion = (index: number, direction: -1 | 1) => {
    setCriteria((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!editorName.trim()) return setEditorError("Form name is required.");
    const rows = criteria.filter(
      (c) => c.category.trim() && c.description.trim()
    );
    if (rows.length === 0) {
      return setEditorError("Add at least one criterion with a category and description.");
    }
    setSaving(true);
    setEditorError(null);
    try {
      const payload = {
        name: editorName.trim(),
        active: editorActive,
        ...(criteriaLocked
          ? {}
          : {
              criteria: rows.map((c, idx) => ({
                category: c.category.trim(),
                description: c.description.trim(),
                maxScore: Number.isFinite(c.maxScore) ? c.maxScore : 5,
                weight: Number.isFinite(c.weight) ? c.weight : 1,
                sortOrder: idx,
              })),
            }),
      };
      if (editingId) {
        await apiFetch(`/api/evaluation-forms/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/evaluation-forms", {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            criteria: payload.criteria,
            ...(sourceId ? { copyFrom: sourceId } : {}),
          }),
        });
      }
      setEditorOpen(false);
      load();
      onChanged?.();
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = (form: FormRow) => {
    setBusyId(form.id);
    setError(null);
    apiFetch<{ form: FormRow }>("/api/evaluation-forms", {
      method: "POST",
      body: JSON.stringify({ name: `${form.name} (copy)`, copyFrom: form.id }),
    })
      .then(() => {
        load();
        onChanged?.();
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to duplicate form.")
      )
      .finally(() => setBusyId(null));
  };

  const handleToggleActive = (form: FormRow) => {
    setBusyId(form.id);
    setError(null);
    apiFetch(`/api/evaluation-forms/${form.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !form.active }),
    })
      .then(() => {
        load();
        onChanged?.();
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to update form.")
      )
      .finally(() => setBusyId(null));
  };

  const handleExport = async (form: FormRow) => {
    setBusyId(form.id);
    setError(null);
    try {
      const filename = `EVAL-FORM-${form.name.replace(/[^a-zA-Z0-9._-]+/g, "_")}-v${form.version}.csv`;
      await downloadFile(`/api/evaluation-forms/${form.id}/export`, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusyId(null);
    }
  };

  const criteriaLocked = editingId !== null && usedCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-rcc-text-primary uppercase tracking-wide">
            Evaluation Forms
          </h2>
          <p className="text-xs text-rcc-text-muted mt-0.5">
            Create, edit, duplicate and export the performance evaluation forms used by periods.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 border border-rcc-border text-rcc-text-secondary px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-rcc-bg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Form
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-rcc-error">
          {error}
        </div>
      )}

      <div className="bg-rcc-surface rounded-lg border border-rcc-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-rcc-primary border-t-transparent" />
            <span className="ml-2 text-sm text-rcc-text-muted">Loading forms...</span>
          </div>
        ) : forms.length === 0 ? (
          <div className="p-8 text-center text-sm text-rcc-text-muted">
            No evaluation forms yet. Create one to get started.
          </div>
        ) : (
          <div className="divide-y divide-rcc-border">
            {forms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-rcc-text-muted shrink-0" />
                    <span className="text-sm font-semibold text-rcc-text-primary truncate">
                      {form.name}
                    </span>
                    <span className="text-[10px] font-mono text-rcc-text-muted">
                      v{form.version}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        form.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          form.active ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      {form.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-rcc-text-muted mt-1">
                    {form.criteriaCount ?? 0} criteria
                    {typeof form.periodsCount === "number" && (
                      <> &middot; {form.periodsCount} period(s)</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {canExport && (
                    <button
                      onClick={() => handleExport(form)}
                      disabled={busyId === form.id}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium disabled:opacity-50"
                    >
                      <Download className="h-3 w-3" />
                      {busyId === form.id ? "Exporting..." : "Export CSV"}
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => openEdit(form)}
                        className="inline-flex items-center gap-1 text-xs text-rcc-primary hover:underline font-medium"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(form)}
                        disabled={busyId === form.id}
                        className="inline-flex items-center gap-1 text-xs text-rcc-text-secondary hover:underline font-medium disabled:opacity-50"
                      >
                        <Copy className="h-3 w-3" /> Duplicate
                      </button>
                      <button
                        onClick={() => handleToggleActive(form)}
                        disabled={busyId === form.id}
                        className={`inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50 ${
                          form.active ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {form.active ? "Deactivate" : "Activate"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-rcc-surface rounded-lg border border-rcc-border w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-5 py-3 border-b border-rcc-border">
              <h3 className="text-sm font-bold text-rcc-text-primary">
                {editingId ? "Edit Evaluation Form" : "New Evaluation Form"}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="text-rcc-text-muted hover:text-rcc-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editorError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-rcc-error">
                  {editorError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-rcc-text-secondary mb-1">
                    Form name
                  </label>
                  <input
                    type="text"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., RCC Faculty Evaluation Tool"
                  />
                </div>
                {editingId ? (
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-rcc-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editorActive}
                        onChange={(e) => setEditorActive(e.target.checked)}
                        className="rounded border-rcc-border text-rcc-primary focus:ring-rcc-accent/40"
                      />
                      Active (available for new periods)
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-rcc-text-secondary mb-1">
                      Start from
                    </label>
                    <select
                      value={sourceId}
                      onChange={(e) => loadSource(e.target.value)}
                      disabled={sourceLoading}
                      className={inputClass}
                    >
                      <option value="">Blank form</option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id}>
                          Copy of {f.name} (v{f.version})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {criteriaLocked && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    This form already has {usedCount} submitted evaluation(s), so its
                    criteria are read-only to preserve history. Rename or deactivate it
                    here, or use <strong>Duplicate</strong> to create an editable copy.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-rcc-text-secondary">
                    Criteria ({criteria.length})
                  </p>
                  {!criteriaLocked && (
                    <button
                      onClick={() => setCriteria((prev) => [...prev, blankCriterion()])}
                      className="inline-flex items-center gap-1 text-xs text-rcc-primary hover:underline font-medium"
                    >
                      <Plus className="h-3 w-3" /> Add criterion
                    </button>
                  )}
                </div>

                <datalist id="eval-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {criteria.map((c, index) => (
                    <div
                      key={c.key}
                      className="border border-rcc-border rounded-md p-2 space-y-2 bg-rcc-bg/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-rcc-text-muted w-6 shrink-0">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={c.category}
                          list="eval-categories"
                          onChange={(e) => updateCriterion(c.key, { category: e.target.value })}
                          disabled={criteriaLocked}
                          placeholder="Category (e.g., I. Communication Skills)"
                          className={`${smallInputClass} flex-1`}
                        />
                        {!criteriaLocked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => moveCriterion(index, -1)}
                              disabled={index === 0}
                              className="p-1 text-rcc-text-muted hover:text-rcc-primary disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => moveCriterion(index, 1)}
                              disabled={index === criteria.length - 1}
                              className="p-1 text-rcc-text-muted hover:text-rcc-primary disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setCriteria((prev) => prev.filter((x) => x.key !== c.key))
                              }
                              className="p-1 text-rcc-text-muted hover:text-red-600"
                              aria-label="Remove criterion"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={c.description}
                        onChange={(e) => updateCriterion(c.key, { description: e.target.value })}
                        disabled={criteriaLocked}
                        rows={2}
                        placeholder="Criterion description"
                        className={`${inputClass} text-xs`}
                      />
                      <div className="flex items-center gap-3 text-[10px] text-rcc-text-muted">
                        <label className="inline-flex items-center gap-1">
                          Max score
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={c.maxScore}
                            onChange={(e) =>
                              updateCriterion(c.key, { maxScore: Number(e.target.value) })
                            }
                            disabled={criteriaLocked}
                            className={`${smallInputClass} w-16`}
                          />
                        </label>
                        <label className="inline-flex items-center gap-1">
                          Weight
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={c.weight}
                            onChange={(e) =>
                              updateCriterion(c.key, { weight: Number(e.target.value) })
                            }
                            disabled={criteriaLocked}
                            className={`${smallInputClass} w-20`}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  {criteria.length === 0 && (
                    <p className="text-xs text-rcc-text-muted italic">
                      {sourceLoading ? "Loading criteria..." : "No criteria yet."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-rcc-border">
              <button
                onClick={() => setEditorOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-rcc-border text-rcc-text-secondary hover:bg-rcc-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-rcc-primary text-rcc-primary-foreground hover:bg-rcc-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save changes" : "Create form"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
