import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary.js";

function Explodes(): never {
  throw new Error("component failed");
}

describe("ErrorBoundary", () => {
  it("keeps a failure inside its own region", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <div>
        <p>still here</p>
        <ErrorBoundary label="Chart">
          <Explodes />
        </ErrorBoundary>
      </div>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Chart could not be displayed");
    expect(screen.getByText("still here")).toBeInTheDocument();
    errors.mockRestore();
  });

  it("renders its children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
