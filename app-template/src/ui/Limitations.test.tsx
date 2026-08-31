import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Limitations } from "./Limitations.js";

describe("limitations", () => {
  it("renders every configured product constraint", () => {
    const { container } = render(<Limitations items={["Only saved here.", "No shared accounts."]} />);

    expect(container.querySelector("[data-limitations]")).toBeInTheDocument();
    expect(screen.getByText("Only saved here.")).toBeInTheDocument();
    expect(screen.getByText("No shared accounts.")).toBeInTheDocument();
  });

  it("renders nothing when the product declares no limitations", () => {
    const { container } = render(<Limitations />);
    expect(container).toBeEmptyDOMElement();
  });
});
