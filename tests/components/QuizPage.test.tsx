import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { QuizPage } from "@/components/QuizPage";
import { USER_NAME_KEY } from "@/lib/user";
import { ONBOARDING_KEY } from "@/lib/onboarding";

const GRADE_KEY = "continha-magica-grade";

// Sessão NextAuth controlável por teste.
const mockUseSession = vi.fn(() => ({ data: null, status: "unauthenticated" }));

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Coloca a aplicação direto na tela do quiz (com nome e ano já definidos),
// pulando NamePrompt e GradeSelector.
function entrarNoQuiz() {
  localStorage.setItem(USER_NAME_KEY, "Ana");
  localStorage.setItem(GRADE_KEY, "4");
}

describe("QuizPage — barra de progresso", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    entrarNoQuiz();
  });

  // Regressão: o optional chaining em answeredCount fazia
  // undefined?.trim() !== "" ser sempre true, contando questões não
  // respondidas e travando a barra em "20 de 20".
  it("começa em 0 de 20 quando nada foi respondido", () => {
    render(<QuizPage />);

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "20");
    expect(screen.getByText("0 de 20")).toBeInTheDocument();
  });

  it("incrementa o progresso ao responder uma questão", async () => {
    render(<QuizPage />);

    const primeiroInput = screen.getByLabelText(/Resposta para a questão 1:/);
    await userEvent.type(primeiroInput, "8");

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("1 de 20")).toBeInTheDocument();
  });

  it("não conta espaços em branco como questão respondida", async () => {
    render(<QuizPage />);

    const primeiroInput = screen.getByLabelText(/Resposta para a questão 1:/);
    // O input sanitiza para apenas dígitos, então espaços não viram resposta.
    await userEvent.type(primeiroInput, "   ");

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0 de 20")).toBeInTheDocument();
  });
});

describe("QuizPage — onboarding e personalização", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    entrarNoQuiz();
  });

  it("saúda o usuário pelo nome no cabeçalho", () => {
    render(<QuizPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Hora de praticar, Ana!/i })
    ).toBeInTheDocument();
  });

  it("exibe o coachmark na primeira vez e o dispensa ao confirmar", async () => {
    render(<QuizPage />);

    expect(screen.getByText("Como funciona")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Entendi!/i }));

    expect(screen.queryByText("Como funciona")).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe("1");
  });

  it("não exibe o coachmark quando já foi visto", () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    render(<QuizPage />);
    expect(screen.queryByText("Como funciona")).not.toBeInTheDocument();
  });

  it("permite reabrir a tela de nome pelo botão Trocar nome", async () => {
    render(<QuizPage />);

    await userEvent.click(screen.getByRole("button", { name: /Trocar nome/i }));

    // A tela de boas-vindas (NamePrompt) reaparece, já preenchida com o nome atual.
    expect(
      screen.getByRole("heading", { level: 1, name: /Bem-vindo ao Continha Mágica!/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Seu nome/i)).toHaveValue("Ana");
  });
});

describe("QuizPage — herança do nome da conta Google", () => {
  beforeEach(() => {
    // Sem nome local, mas com sessão Google autenticada.
    localStorage.setItem(GRADE_KEY, "4");
    mockUseSession.mockReturnValue({
      data: { user: { name: "Maria do Google" } },
      status: "authenticated",
    });
  });

  it("usa o nome da conta Google quando não há nome local", async () => {
    render(<QuizPage />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Hora de praticar, Maria do Google!/i,
      })
    ).toBeInTheDocument();
    expect(localStorage.getItem(USER_NAME_KEY)).toBe("Maria do Google");
  });
});
