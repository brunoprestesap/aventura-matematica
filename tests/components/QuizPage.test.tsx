import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizPage } from "@/components/QuizPage";
import { USER_NAME_KEY } from "@/lib/user";

const GRADE_KEY = "continha-magica-grade";

// Coloca a aplicação direto na tela do quiz (com nome e ano já definidos),
// pulando NamePrompt e GradeSelector.
function entrarNoQuiz() {
  localStorage.setItem(USER_NAME_KEY, "Ana");
  localStorage.setItem(GRADE_KEY, "4");
}

describe("QuizPage — barra de progresso", () => {
  beforeEach(() => {
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
