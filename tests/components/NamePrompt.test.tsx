import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { NamePrompt } from "@/components/NamePrompt";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("NamePrompt", () => {
  it("renderiza título (h1) e input", () => {
    render(<NamePrompt onSubmit={() => {}} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Bem-vindo ao Continha Mágica!/i);
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

  it("dispara o login com o Google ao clicar em Entrar com o Google", async () => {
    render(<NamePrompt onSubmit={() => {}} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Entrar com o Google/i })
    );
    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google");
  });

  it("oculta a opção do Google quando showGoogle é false (modo edição)", () => {
    render(<NamePrompt onSubmit={() => {}} showGoogle={false} />);
    expect(
      screen.queryByRole("button", { name: /Entrar com o Google/i })
    ).not.toBeInTheDocument();
  });

  it("mostra o rótulo da etapa e pré-preenche o nome inicial", () => {
    render(
      <NamePrompt onSubmit={() => {}} stepLabel="Passo 1 de 2" initialName="Téo" />
    );
    expect(screen.getByText("Passo 1 de 2")).toBeInTheDocument();
    expect(screen.getByLabelText(/Seu nome/i)).toHaveValue("Téo");
  });

  it("chama onCancel ao clicar em Voltar (modo edição)", async () => {
    const onCancel = vi.fn();
    render(<NamePrompt onSubmit={() => {}} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: /Voltar/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
