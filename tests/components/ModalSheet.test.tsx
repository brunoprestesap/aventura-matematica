import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "./test-utils";
import { ModalSheet } from "@/components/ModalSheet";

describe("ModalSheet", () => {
  it("renderiza children quando open=true", () => {
    render(
      <ModalSheet open={true} onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </ModalSheet>
    );
    expect(screen.getByText("Conteúdo do modal")).toBeInTheDocument();
  });

  it("não renderiza nada quando open=false", () => {
    render(
      <ModalSheet open={false} onClose={() => {}}>
        <p>Conteúdo do modal</p>
      </ModalSheet>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aplica aria-label no dialog", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} ariaLabel="Meu painel">
        conteúdo
      </ModalSheet>
    );
    expect(screen.getByRole("dialog", { name: "Meu painel" })).toBeInTheDocument();
  });

  it("aplica aria-labelledby no dialog", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} ariaLabelledBy="titulo-id">
        <h2 id="titulo-id">Título</h2>
      </ModalSheet>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "titulo-id");
  });

  it("aplica overlayClassName ao overlay", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} overlayClassName="minha-classe-overlay">
        conteúdo
      </ModalSheet>
    );
    expect(screen.getByRole("dialog")).toHaveClass("minha-classe-overlay");
  });

  it("aplica sheetClassName ao sheet interno", () => {
    render(
      <ModalSheet open={true} onClose={() => {}} sheetClassName="minha-classe-sheet">
        conteúdo
      </ModalSheet>
    );
    const sheet = screen.getByRole("dialog").firstElementChild;
    expect(sheet).toHaveClass("minha-classe-sheet");
  });

  it("chama onClose ao clicar no overlay (fora do sheet)", () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open={true} onClose={onClose}>
        conteúdo
      </ModalSheet>
    );
    // Clica diretamente no overlay (e.target === e.currentTarget)
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("não chama onClose ao clicar dentro do sheet", () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open={true} onClose={onClose}>
        <p>Conteúdo interno</p>
      </ModalSheet>
    );
    // O sheet tem stopPropagation — o clique não deve atingir o overlay
    fireEvent.click(screen.getByText("Conteúdo interno"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("chama onExitComplete após a animação de saída", async () => {
    const onExitComplete = vi.fn();
    const { rerender } = render(
      <ModalSheet open={true} onClose={() => {}} onExitComplete={onExitComplete}>
        conteúdo
      </ModalSheet>
    );

    rerender(
      <ModalSheet open={false} onClose={() => {}} onExitComplete={onExitComplete}>
        conteúdo
      </ModalSheet>
    );

    await waitFor(() => expect(onExitComplete).toHaveBeenCalledOnce());
  });
});
