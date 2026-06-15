import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
