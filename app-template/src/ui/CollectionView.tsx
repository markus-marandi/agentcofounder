import { useMemo, useState } from "react";
import type { EntitySpec, StoredRecord } from "../kernel/types.js";
import { titleOf } from "../kernel/config.js";
import { useRepository } from "../kernel/useRepository.js";
import { applyFilters, type ActiveFilter, type FieldValue } from "../data/operations.js";
import { searchRecords } from "../data/searchIndex.js";
import { EmptyState } from "./EmptyState.js";
import { RecordForm } from "./RecordForm.js";
import { StatRow } from "./StatRow.js";

interface Props {
  entity: EntitySpec;
  searchEnabled?: boolean;
  canEdit?: boolean;
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

  const editing = editingId ? records.find((record) => record.id === editingId) : undefined;
  const filterSpecs = entity.filters ?? [];

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
    return searchEnabled && query.trim() !== "" ? searchRecords(entity, filtered, query) : filtered;
  }, [records, filterSpecs, choices, searchEnabled, query, entity]);

  const optionsFor = (field: string): string[] => {
    const declared = entity.fields.find((candidate) => candidate.name === field);
    if (declared?.options) return declared.options;
    return [...new Set(records.map((record) => String(record[field] ?? "")).filter((value) => value !== ""))].sort();
  };

  const submit = (values: Record<string, FieldValue>): void => {
    run(() => {
      if (editing) repository.update(editing.id, values);
      else repository.create(values);
    });
    setEditingId(null);
  };

  return (
    <div className="stack">
      {storageError ? (
        <div className="notice notice-error" role="alert">
          <p style={{ margin: 0 }}>{storageError}</p>
          <button type="button" className="button button-quiet" onClick={dismissStorageError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <StatRow specs={entity.derived ?? []} records={visible} />

      {canEdit ? (
        <section className="panel" aria-labelledby="form-title">
          <h2 id="form-title">
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
        <section className="panel row" aria-label={`Narrow ${entity.labelPlural.toLowerCase()}`}>
          {searchEnabled ? (
            <div className="field" style={{ flex: "1 1 220px" }}>
              <label htmlFor="collection-search">Search</label>
              <input
                id="collection-search"
                type="search"
                value={query}
                placeholder={`Search ${entity.labelPlural.toLowerCase()}`}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          ) : null}

          {filterSpecs.map((spec) => {
            const mode = spec.mode ?? "equals";
            const id = `filter-${spec.field}`;
            if (mode === "truthy" || mode === "falsy") {
              return (
                <div className="field field-checkbox" key={spec.field}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={(choices[spec.field] ?? "") !== ""}
                    onChange={(event) =>
                      setChoices((current) => ({ ...current, [spec.field]: event.target.checked ? "on" : "" }))
                    }
                  />
                  <label htmlFor={id}>{spec.label}</label>
                </div>
              );
            }
            return (
              <div className="field" key={spec.field} style={{ flex: "0 1 200px" }}>
                <label htmlFor={id}>{spec.label}</label>
                <select
                  id={id}
                  value={choices[spec.field] ?? ""}
                  onChange={(event) => setChoices((current) => ({ ...current, [spec.field]: event.target.value }))}
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

      <section aria-labelledby="collection-title" className="stack">
        <h2 id="collection-title">
          {entity.labelPlural}{" "}
          <span className="muted" style={{ fontWeight: 400, fontSize: "1rem" }}>
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
                className="button"
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
          <ul className="record-list">
            {visible.map((record: StoredRecord) => (
              <li className="record" key={record.id}>
                <span className="record-title">{titleOf(entity, record)}</span>
                <dl className="record-fields">
                  {entity.fields
                    .filter((field) => field.name !== (entity.titleField ?? entity.fields[0]?.name))
                    .map((field) => (
                      <div key={field.name}>
                        <dt>{field.label}</dt>
                        <dd>{displayValue(record[field.name])}</dd>
                      </div>
                    ))}
                </dl>

                {canEdit ? (
                  <div className="row">
                    <button
                      type="button"
                      className="button"
                      onClick={() => setEditingId(record.id)}
                      aria-label={`Edit ${titleOf(entity, record)}`}
                    >
                      Edit
                    </button>

                    {confirmingId === record.id ? (
                      <>
                        <span className="muted">Remove this permanently?</span>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => {
                            run(() => repository.remove(record.id));
                            setConfirmingId(null);
                            if (editingId === record.id) setEditingId(null);
                          }}
                          aria-label={`Confirm removing ${titleOf(entity, record)}`}
                        >
                          Yes, remove
                        </button>
                        <button type="button" className="button button-quiet" onClick={() => setConfirmingId(null)}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => setConfirmingId(record.id)}
                        aria-label={`Remove ${titleOf(entity, record)}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
