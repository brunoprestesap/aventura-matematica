import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NamePrompt } from "@/components/NamePrompt";

describe("NamePrompt", () => {
  it("renderiza título e input", () => {
    render(<NamePrompt onSubmit={() => {}} />);
    expect(screen.getByText(/Bem-vindo ao Continha Mágica!/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seu nome/i)).toBeInTheDocument();
  });

  it("desabilita o botão quando o input está vazio", () => {
    render(<NamePrompt onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /Começar a magia/i })).toBeDisabled();
  });

  it("submete o nome trimado ao clicar no botão", async () => {
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/Seu nome/i);
    await userEvent.type(input, "  Ana  ");

    const button = screen.getByRole("button", { name: /Começar a magia/i });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith("Ana");
  });

  it("não submete quando o nome contém apenas espaços", () => {
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/Seu nome/i);
    fireEvent.change(input, { target: { value: "   " } });
    // Submit direto no form (o botão fica desabilitado): exercita o ramo
    // `if (trimmed)` falso em handleSubmit.
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
