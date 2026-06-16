import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Pixel, type PixelPose } from "@/components/Pixel";

const POSES: PixelPose[] = ["idle", "correct", "wrong", "thinking"];

describe("Pixel", () => {
  it.each(POSES)("renderiza a pose %s animada e estática", (pose) => {
    // animated=true e animated=false exercitam os ramos `animated ? ... : undefined`
    const animated = render(<Pixel pose={pose} animated />);
    expect(animated.container.querySelector("svg")).toBeInTheDocument();

    const stati = render(<Pixel pose={pose} animated={false} />);
    expect(stati.container.querySelector("svg")).toBeInTheDocument();
  });

  it("usa pose idle e tamanho padrão quando não informados", () => {
    const { container } = render(<Pixel />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label");
  });
});
