import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, signOut } from "next-auth/react";
import { LeaguePanel } from "@/components/LeaguePanel";

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LeaguePanel", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockFetch.mockReset();
    vi.mocked(signIn).mockClear();
    vi.mocked(signOut).mockClear();
  });

  it("usuário não autenticado vê botão de login", () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated" });
    render(<LeaguePanel />);

    expect(screen.getByText(/Entre com sua conta Google/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar com Google/i })).toBeInTheDocument();
  });

  it("usuário autenticado sem grupo vê liga atual", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        authenticated: true,
        hasGroup: false,
        currentLeague: "bronze",
        leagueLabel: "Bronze",
        leagueEmoji: "🥉",
      }),
    });

    render(<LeaguePanel />);

    await waitFor(() => {
      expect(screen.getByText("Bronze")).toBeInTheDocument();
      expect(screen.getByText(/Complete uma sessão de quiz/i)).toBeInTheDocument();
    });
  });

  it("usuário autenticado com grupo vê placar", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        authenticated: true,
        hasGroup: true,
        currentLeague: "bronze",
        leagueLabel: "Bronze",
        leagueEmoji: "🥉",
        promotionSlots: 20,
        demotionSlots: 0,
        placar: [
          { rank: 1, userId: "u1", name: "Ana", image: null, xpWeekly: 100, isCurrentUser: true, zone: "promotion" },
        ],
      }),
    });

    render(<LeaguePanel />);

    await waitFor(() => {
      expect(screen.getByText("Ana")).toBeInTheDocument();
      expect(screen.getByText("100 XP")).toBeInTheDocument();
    });
  });

  it("chama signIn ao clicar em Entrar com Google", async () => {
    mockUseSession.mockReturnValue({ status: "unauthenticated" });
    render(<LeaguePanel />);

    await userEvent.click(screen.getByRole("button", { name: /Entrar com Google/i }));
    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google");
  });

  it("chama signOut na visão sem grupo", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        authenticated: true,
        hasGroup: false,
        leagueLabel: "Bronze",
        leagueEmoji: "🥉",
      }),
    });

    render(<LeaguePanel />);
    await waitFor(() => screen.getByText(/Complete uma sessão de quiz/i));

    await userEvent.click(screen.getByRole("button", { name: /Sair/i }));
    expect(vi.mocked(signOut)).toHaveBeenCalled();
  });

  it("chama signOut na visão com placar e mostra zona de rebaixamento", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        authenticated: true,
        hasGroup: true,
        leagueLabel: "Bronze",
        leagueEmoji: "🥉",
        promotionSlots: 20,
        demotionSlots: 5,
        placar: [
          { rank: 1, userId: "u1", name: "Ana", image: null, xpWeekly: 100, isCurrentUser: true, zone: "promotion" },
        ],
      }),
    });

    render(<LeaguePanel />);
    await waitFor(() => screen.getByText("Ana"));

    // Com demotionSlots > 0, a legenda de rebaixamento é renderizada
    expect(screen.getByText(/Últimos 5 descem/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Sair/i }));
    expect(vi.mocked(signOut)).toHaveBeenCalled();
  });

  it("trata erro de fetch sem quebrar", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });
    mockFetch.mockRejectedValueOnce(new Error("falha"));

    render(<LeaguePanel />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // catch → setData(null): permanece em loading, sem placar nem erro fatal
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
  });
});
