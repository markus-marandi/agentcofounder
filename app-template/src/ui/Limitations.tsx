import { Alert } from "./Alert.js";

/** Honest product constraints, rendered from the same configuration the model edits. */
export function Limitations({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section data-limitations aria-labelledby="product-limitations-title">
      <Alert tone="neutral" title="Before you rely on this product">
        <span id="product-limitations-title" className="sr-only">
          Product limitations
        </span>
        <ul className="m-0 list-disc space-y-1 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Alert>
    </section>
  );
}
