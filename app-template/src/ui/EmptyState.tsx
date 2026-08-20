import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {description ? <p className="muted" style={{ margin: "0 auto" }}>{description}</p> : null}
      {action ? <div style={{ marginTop: "1rem" }}>{action}</div> : null}
    </div>
  );
}
