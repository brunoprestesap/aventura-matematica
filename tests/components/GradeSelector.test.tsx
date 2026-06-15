import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GradeSelector } from "@/components/GradeSelector";

describe("GradeSelector", () => {
  it("renderiza 9 botões de anos", () => {
    render(<GradeSelector onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(9);
  });

  it("chama onSelect com o ano correto ao clicar", async () => {
    const onSelect = vi.fn();
    render(<GradeSelector onSelect={onSelect} />);

    const button5 = screen.getByRole("button", { name: /5º ano/i });
    await userEvent.click(button5);

    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it("marca visualmente o ano selecionado", () => {
    render(<GradeSelector onSelect={() => {}} currentGrade={3} />);
    const button3 = screen.getByRole("button", { name: /3º ano/i });
    expect(button3).toHaveAttribute("aria-pressed", "true");
  });
});
