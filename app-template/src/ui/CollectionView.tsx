import { Fragment, useMemo, useState } from "react";
import type { ActionSpec, EntitySpec, StoredRecord } from "../kernel/types.js";
import { titleOf } from "../kernel/config.js";
import { useRepository } from "../kernel/useRepository.js";
import {
  actionApplies,
  applyFilters,
  canonicalize,
  knownValues,
  resolveActionValues,
  sortRecords,
  validateValue,
  type ActiveFilter,
  type FieldValue,
} from "../data/operations.js";
import { searchRecords } from "../data/searchIndex.js";
import { Alert } from "./Alert.js";
import { EmptyState } from "./EmptyState.js";
import { Field } from "./Field.js";
import { ConfirmDialog, type ConfirmTone } from "./Modal.js";
import { RecordForm } from "./RecordForm.js";
import { StatRow } from "./StatRow.js";

interface Props {
  entity: EntitySpec;
  searchEnabled?: boolean;
  canEdit?: boolean;
}

/** One pending row action: which record, which action, and what has been typed into it. */
interface PendingAction {
  recordId: string;
  actionId: string;
  value: FieldValue;
  error?: string;
}

/** Delete, or a confirm-gated action with no inline prompt — the two cases the confirm modal covers. */
type ConfirmTarget = { kind: "delete"; record: StoredRecord } | { kind: "action"; action: ActionSpec; record: StoredRecord };

function describeConfirm(
  entity: EntitySpec,
  target: ConfirmTarget,
): { title: string; description?: string; confirmText: string; confirmAriaLabel: string; tone: ConfirmTone } {
  const title = titleOf(entity, target.record);
  if (target.kind === "delete") {
    return {
      title: `Remove ${title}?`,
      description: "This removes the record permanently. This cannot be undone.",
      confirmText: "Remove",
      confirmAriaLabel: `Confirm removing ${title}`,
      tone: "danger",
    };
  }
  return {
    title: `${target.action.label}?`,
    confirmText: target.action.label,
    confirmAriaLabel: `Confirm ${target.action.label.toLowerCase()}: ${title}`,
    tone: target.action.style === "primary" ? "primary" : "danger",
  };
}

function actionClasses(style: ActionSpec["style"]): string {
  if (style === "primary") {
    return "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink hover:brightness-110";
  }
  if (style === "danger") {
    return "rounded-md border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft";
  }
  return "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunk";
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * The default collection screen: add, list, edit, delete, filter, search, and
 * derived totals. Derived values are computed over the filtered set so the
 * numbers always describe what is on screen.
 */
export function CollectionView({ entity, searchEnabled = false, canEdit = true }: Props) {
  const { records, storageError, dismissStorageError, run, repository } = useRepository(entity.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmTarget | null>(null);
  const [query, setQuery] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);

  const editing = editingId ? records.find((record) => record.id === editingId) : undefined;
  const filterSpecs = entity.filters ?? [];
  const actions = entity.actions ?? [];

  const visible = useMemo(() => {
    const active: ActiveFilter[] = filterSpecs
      .filter((spec) => (choices[spec.field] ?? "") !== "")
      .map((spec) => {
        const mode = spec.mode ?? "equals";
        return mode === "truthy" || mode === "falsy"
          ? { field: spec.field, mode }
          : { field: spec.field, mode, value: choices[spec.field] };
      });
    const filtered = applyFilters(records, active);
    const found = searchEnabled && query.trim() !== "" ? searchRecords(entity, filtered, query) : filtered;
    return sortRecords(found, entity.sort);
  }, [records, filterSpecs, choices, searchEnabled, query, entity]);

  const optionsFor = (field: string): string[] => {
    const declared = entity.fields.find((candidate) => candidate.name === field);
    // A `select` is a closed set, so its declared order is meaningful and kept.
    // Anything else — a `combobox` above all — has to offer the values records
    // actually hold, or a user-invented category becomes unfilterable.
    if (declared?.type === "select" && declared.options) return declared.options;
    const used = records.map((record) => String(record[field] ?? ""));
    return [...new Set([...(declared?.options ?? []), ...used])].filter((value) => value !== "").sort();
  };

  const fieldNamed = (name: string | undefined) =>
    name ? entity.fields.find((candidate) => candidate.name === name) : undefined;

  /** Writes an action's changes through the repository — the same boundary the form uses. */
  const applyAction = (action: ActionSpec, record: StoredRecord, promptValue?: FieldValue): void => {
    const values: Record<string, FieldValue> = resolveActionValues(action);
    if (action.prompt) values[action.prompt] = promptValue ?? null;
    run(() => repository.update(record.id, values));
    setPending(null);
  };

  const startAction = (action: ActionSpec, record: StoredRecord): void => {
    if (!action.prompt && !action.confirm) {
      applyAction(action, record);
      return;
    }
    if (!action.prompt) {
      // action.confirm is true and there's nothing to collect inline — gate it on the shared confirm dialog.
      setConfirming({ kind: "action", action, record });
      return;
    }
    const field = fieldNamed(action.prompt);
    const current = action.prompt ? record[action.prompt] : undefined;
    setPending({
      recordId: record.id,
      actionId: action.id,
      value:
        current === undefined || current === null
          ? field?.type === "number"
            ? null
            : ""
          : (current as FieldValue),
    });
  };

  const submitAction = (action: ActionSpec, record: StoredRecord): void => {
    const field = fieldNamed(action.prompt);
    const typed = pending?.value ?? null;
    if (field) {
      const problem = validateValue(field, typed);
      if (problem) {
        setPending((current) => (current ? { ...current, error: problem } : current));
        return;
      }
      if (field.type === "combobox") {
        applyAction(action, record, canonicalize(String(typed ?? ""), knownValues(field, records)));
        return;
      }
    }
    applyAction(action, record, typed);
  };

  const submit = (values: Record<string, FieldValue>): void => {
    run(() => {
      if (editing) repository.update(editing.id, values);
      else repository.create(values);
    });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {storageError ? (
        <Alert tone="danger" title={storageError}>
          <button
            type="button"
            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
            onClick={dismissStorageError}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      <StatRow specs={entity.derived ?? []} records={visible} />

      {canEdit ? (
        <section className="rounded-lg border border-line bg-surface p-6" aria-labelledby="form-title">
          <h2 id="form-title" className="text-base font-semibold text-ink m-0 mb-4">
            {editing ? `Edit ${entity.label.toLowerCase()}` : `Add a ${entity.label.toLowerCase()}`}
          </h2>
          <RecordForm
            entity={entity}
            existing={records}
            editing={editing}
            onSubmit={submit}
            onCancel={editing ? () => setEditingId(null) : undefined}
          />
        </section>
      ) : null}

      {(searchEnabled || filterSpecs.length > 0) && records.length > 0 ? (
        <section
          className="rounded-lg border border-line bg-surface p-4 flex flex-wrap items-end gap-4"
          aria-label={`Narrow ${entity.labelPlural.toLowerCase()}`}
        >
          {searchEnabled ? (
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="collection-search" className="block text-sm font-medium text-ink">
                Search
              </label>
              <input
                id="collection-search"
                type="search"
                value={query}
                placeholder={`Search ${entity.labelPlural.toLowerCase()}`}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-soft focus:outline-none sm:text-sm"
              />
            </div>
          ) : null}

          {filterSpecs.map((spec) => {
            const mode = spec.mode ?? "equals";
            const id = `filter-${spec.field}`;
            if (mode === "truthy" || mode === "falsy") {
              return (
                <div className="flex items-center gap-3" key={spec.field}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={(choices[spec.field] ?? "") !== ""}
                    onChange={(event) =>
                      setChoices((current) => ({ ...current, [spec.field]: event.target.checked ? "on" : "" }))
                    }
                    className="h-4 w-4 rounded border-line text-accent"
                  />
                  <label htmlFor={id} className="text-sm font-medium text-ink">
                    {spec.label}
                  </label>
                </div>
              );
            }
            return (
              <div className="w-[200px]" key={spec.field}>
                <label htmlFor={id} className="block text-sm font-medium text-ink">
                  {spec.label}
                </label>
                <select
                  id={id}
                  value={choices[spec.field] ?? ""}
                  onChange={(event) => setChoices((current) => ({ ...current, [spec.field]: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink focus:outline-none sm:text-sm"
                >
                  <option value="">All</option>
                  {optionsFor(spec.field).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </section>
      ) : null}

      <section aria-labelledby="collection-title" className="flex flex-col gap-4">
        <h2 id="collection-title" className="text-base font-semibold text-ink m-0">
          {entity.labelPlural}{" "}
          <span className="font-normal text-base text-ink-soft">
            ({visible.length}
            {visible.length === records.length ? "" : ` of ${records.length}`})
          </span>
        </h2>

        {records.length === 0 ? (
          <EmptyState
            title={`No ${entity.labelPlural.toLowerCase()} yet`}
            description={`Add your first ${entity.label.toLowerCase()} using the form above.`}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description="No records match the current search or filters."
            action={
              <button
                type="button"
                className="rounded-md border border-line bg-surface px-4 py-2 font-semibold text-ink hover:bg-surface-sunk"
                onClick={() => {
                  setQuery("");
                  setChoices({});
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left">
              <thead className="border-b border-line">
                <tr>
                  {entity.fields.map((field) => (
                    <th key={field.name} scope="col" className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-ink">
                      {field.label}
                    </th>
                  ))}
                  {canEdit ? (
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((record: StoredRecord) => {
                  const offered = actions.filter((action) => actionApplies(action, record));
                  const open = pending?.recordId === record.id
                    ? offered.find((action) => action.id === pending.actionId)
                    : undefined;
                  const promptField = fieldNamed(open?.prompt);
                  const titleField = entity.titleField ?? entity.fields[0]?.name;

                  return (
                    <Fragment key={record.id}>
                      <tr>
                        {entity.fields.map((field) => (
                          <td key={field.name} className="whitespace-nowrap px-4 py-3 text-sm text-ink">
                            {field.name === titleField ? (
                              <span className="font-semibold">{titleOf(entity, record)}</span>
                            ) : (
                              displayValue(record[field.name])
                            )}
                          </td>
                        ))}
                        {canEdit ? (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              {offered.map((action) =>
                                open?.id === action.id && action.prompt ? null : (
                                  <button
                                    key={action.id}
                                    type="button"
                                    className={actionClasses(action.style)}
                                    onClick={() => startAction(action, record)}
                                    aria-label={`${action.label}: ${titleOf(entity, record)}`}
                                  >
                                    {action.label}
                                  </button>
                                ),
                              )}

                              <button
                                type="button"
                                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunk"
                                onClick={() => setEditingId(record.id)}
                                aria-label={`Edit ${titleOf(entity, record)}`}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="rounded-md border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft"
                                onClick={() => setConfirming({ kind: "delete", record })}
                                aria-label={`Remove ${titleOf(entity, record)}`}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>

                      {canEdit && open && open.prompt && promptField ? (
                        <tr>
                          <td colSpan={entity.fields.length + 1} className="bg-surface-sunk px-4 py-4">
                            <form
                              className="flex flex-col gap-3 sm:flex-row sm:items-end"
                              noValidate
                              onSubmit={(event) => {
                                event.preventDefault();
                                submitAction(open, record);
                              }}
                            >
                              <div className="flex-1">
                                <Field
                                  field={promptField}
                                  value={pending?.value ?? null}
                                  error={pending?.error}
                                  suggestions={
                                    promptField.type === "combobox" ? knownValues(promptField, records) : undefined
                                  }
                                  onChange={(value) =>
                                    setPending((current) => (current ? { ...current, value, error: undefined } : current))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="submit"
                                  className={actionClasses(open.style ?? "primary")}
                                  aria-label={`Confirm ${open.label.toLowerCase()}: ${titleOf(entity, record)}`}
                                >
                                  {open.label}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
                                  onClick={() => setPending(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirming !== null}
        {...(confirming ? describeConfirm(entity, confirming) : { title: "", confirmText: "", confirmAriaLabel: "" })}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          if (confirming.kind === "delete") {
            run(() => repository.remove(confirming.record.id));
            if (editingId === confirming.record.id) setEditingId(null);
          } else {
            applyAction(confirming.action, confirming.record);
          }
          setConfirming(null);
        }}
      />
    </div>
  );
}
