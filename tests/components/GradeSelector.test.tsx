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

  it("exibe a descrição de dificuldade de cada ano (visível no mobile)", () => {
    render(<GradeSelector onSelect={() => {}} />);
    // A descrição não deve estar oculta atrás de breakpoint (`hidden sm:inline`).
    const desc = screen.getByText("Números pequenos e operações simples");
    expect(desc).toBeVisible();
    expect(desc).not.toHaveClass("hidden");
  });

  it("personaliza a saudação com o nome do usuário", () => {
    render(<GradeSelector onSelect={() => {}} userName="Ana" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Em qual ano você está, Ana\?/i);
  });

  it("mostra o rótulo da etapa quando fornecido", () => {
    render(<GradeSelector onSelect={() => {}} stepLabel="Passo 2 de 2" />);
    expect(screen.getByText("Passo 2 de 2")).toBeInTheDocument();
  });

  it("chama onBack ao clicar em Voltar", async () => {
    const onBack = vi.fn();
    render(<GradeSelector onSelect={() => {}} onBack={onBack} />);

    await userEvent.click(screen.getByRole("button", { name: /Voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
