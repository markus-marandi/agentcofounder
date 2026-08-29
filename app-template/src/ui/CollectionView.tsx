import { useMemo, useState } from "react";
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
import { EmptyState } from "./EmptyState.js";
import { Field } from "./Field.js";
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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
        <div className="rounded-md border border-danger bg-danger-soft px-4 py-3" role="alert">
          <p className="m-0 text-sm text-danger">{storageError}</p>
          <button
            type="button"
            className="mt-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
            onClick={dismissStorageError}
          >
            Dismiss
          </button>
        </div>
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
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface overflow-hidden">
            {visible.map((record: StoredRecord) => {
              const offered = actions.filter((action) => actionApplies(action, record));
              const open = pending?.recordId === record.id
                ? offered.find((action) => action.id === pending.actionId)
                : undefined;
              const promptField = fieldNamed(open?.prompt);

              return (
              <li className="flex flex-col gap-3 p-4" key={record.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-ink">{titleOf(entity, record)}</span>
                  <dl className="flex flex-col gap-1">
                    {entity.fields
                      .filter((field) => field.name !== (entity.titleField ?? entity.fields[0]?.name))
                      .map((field) => (
                        <div key={field.name} className="flex flex-wrap gap-2">
                          <dt className="text-sm text-ink-soft m-0">{field.label}</dt>
                          <dd className="text-sm text-ink m-0">{displayValue(record[field.name])}</dd>
                        </div>
                      ))}
                  </dl>
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {offered.map((action) =>
                      open?.id === action.id && action.prompt ? null : open?.id === action.id ? (
                        <span className="flex flex-wrap items-center gap-3" key={action.id}>
                          <span className="text-sm text-ink-soft">{action.label}?</span>
                          <button
                            type="button"
                            className={actionClasses(action.style)}
                            onClick={() => applyAction(action, record)}
                            aria-label={`Confirm ${action.label.toLowerCase()}: ${titleOf(entity, record)}`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
                            onClick={() => setPending(null)}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
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

                    {confirmingId === record.id ? (
                      <>
                        <span className="text-sm text-ink-soft">Remove this permanently?</span>
                        <button
                          type="button"
                          className="rounded-md border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft"
                          onClick={() => {
                            run(() => repository.remove(record.id));
                            setConfirmingId(null);
                            if (editingId === record.id) setEditingId(null);
                          }}
                          aria-label={`Confirm removing ${titleOf(entity, record)}`}
                        >
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
                          onClick={() => setConfirmingId(null)}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md border border-danger px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger-soft"
                        onClick={() => setConfirmingId(record.id)}
                        aria-label={`Remove ${titleOf(entity, record)}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : null}
                </div>

                {canEdit && open && open.prompt && promptField ? (
                  <form
                    className="flex flex-col gap-3 rounded-md border border-line bg-surface-sunk p-4 sm:flex-row sm:items-end"
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
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
