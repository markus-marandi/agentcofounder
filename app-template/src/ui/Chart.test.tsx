import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chart } from "./Chart.js";

const points = [
  { label: "Mon", value: 3 },
  { label: "Tue", value: 7 },
];

describe("Chart", () => {
  it.each(["line", "area", "bar", "donut", "sparkline"] as const)("renders %s with an accessible summary", (kind) => {
    render(<Chart kind={kind} points={points} title="Visits" unit="visits" />);
    expect(screen.getByRole("img", { name: /Visits/u })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Mon: 3 visits/u })).toBeInTheDocument();
  });

  it("says so rather than drawing an empty frame when there is no data", () => {
    render(<Chart kind="line" points={[]} title="Visits" />);
    expect(screen.getByRole("img", { name: /no data yet/iu })).toBeInTheDocument();
  });

  it("renders a stat as a single total", () => {
    render(<Chart kind="stat" points={points} title="Total" />);
    expect(screen.getByLabelText("Total: 10")).toBeInTheDocument();
  });

  it("survives every point sharing the same value", () => {
    render(<Chart kind="line" points={[{ label: "a", value: 5 }, { label: "b", value: 5 }]} title="Flat" />);
    expect(screen.getByRole("img", { name: /Flat/u })).toBeInTheDocument();
  });
});
