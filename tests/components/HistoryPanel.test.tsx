import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPanel } from "@/components/HistoryPanel";
import { HISTORY_KEY, HISTORY_VERSION } from "@/lib/history";
import type { ActivityHistory } from "@/lib/history";

function seedLocal(activities: unknown[]) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({ version: HISTORY_VERSION, activities })
  );
}

describe("HistoryPanel", () => {
  it("abre modal e mostra estado vazio quando não há atividades", async () => {
    render(<HistoryPanel />);

    const button = screen.getByRole("button", { name: /Histórico/i });
    await userEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma atividade realizada ainda/i)).toBeInTheDocument();
  });

  it("lista atividades do localStorage", async () => {
    const history: ActivityHistory = {
      version: HISTORY_VERSION,
      activities: [
        { id: "a1", grade: 4, score: 18, total: 20, completedAt: "2024-05-20T14:30:00.000Z" },
      ],
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    render(<HistoryPanel />);

    const button = screen.getByRole("button", { name: /Histórico/i });
    await userEvent.click(button);

    expect(screen.getByText("4º ano")).toBeInTheDocument();
    expect(screen.getByText("18/20")).toBeInTheDocument();
  });

  it("fecha o modal pelo botão X", async () => {
    render(<HistoryPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Fechar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mantém o modal aberto ao clicar no conteúdo interno", async () => {
    render(<HistoryPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));

    // Clique no conteúdo não deve propagar para o overlay (stopPropagation)
    await userEvent.click(
      screen.getByRole("heading", { name: /Histórico de atividades/i })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("fecha o modal ao clicar no overlay", async () => {
    render(<HistoryPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Histórico/i }));

    // Clique direto no overlay (elemento dialog) dispara o fechamento
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("HistoryPanel — nuvem", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mescla registros locais e da nuvem ao abrir o painel", async () => {
    seedLocal([
      { id: "local-1", grade: 4, score: 10, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ]);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: [
          { id: "cloud-1", grade: 5, score: 18, total: 20, completedAt: "2024-02-01T10:00:00.000Z" },
        ],
      }),
    } as Response);

    render(<HistoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /histórico/i }));

    await waitFor(() => expect(screen.getByText("18/20")).toBeInTheDocument());
    expect(screen.getByText("10/20")).toBeInTheDocument();
  });

  it("mostra apenas o local quando o fetch falha (anônimo/erro)", async () => {
    seedLocal([
      { id: "local-1", grade: 4, score: 10, total: 20, completedAt: "2024-01-01T10:00:00.000Z" },
    ]);
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 401 } as Response);

    render(<HistoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /histórico/i }));

    await waitFor(() => expect(screen.getByText("10/20")).toBeInTheDocument());
  });
});
