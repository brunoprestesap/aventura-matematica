import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NamePrompt } from "@/components/NamePrompt";

describe("NamePrompt", () => {
  it("renderiza título e input", () => {
    render(<NamePrompt onSubmit={() => {}} />);
    expect(screen.getByText(/Como devo te chamar\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seu nome/i)).toBeInTheDocument();
  });

  it("desabilita o botão quando o input está vazio", () => {
    render(<NamePrompt onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /Começar aventura/i })).toBeDisabled();
  });

  it("submete o nome trimado ao clicar no botão", async () => {
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/Seu nome/i);
    await userEvent.type(input, "  Ana  ");

    const button = screen.getByRole("button", { name: /Começar aventura/i });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith("Ana");
  });
});
