import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionCard } from "@/components/QuestionCard";
import type { Question } from "@/lib/questions";

const mockQuestion: Question = {
  id: "q1",
  category: "addition",
  statement: "Quanto é 5 + 3?",
  answer: 8,
  explanation: "5 + 3 = 8",
};

describe("QuestionCard", () => {
  it("renderiza enunciado, badge e input", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        index={1}
        value=""
        onChange={() => {}}
        status="idle"
      />
    );

    expect(screen.getByText(mockQuestion.statement)).toBeInTheDocument();
    expect(screen.getByText("Adição")).toBeInTheDocument();
    expect(screen.getByLabelText(/Resposta para a questão 1/i)).toBeInTheDocument();
  });

  it("chama onChange ao digitar", async () => {
    const onChange = vi.fn();
    render(
      <QuestionCard
        question={mockQuestion}
        index={1}
        value=""
        onChange={onChange}
        status="idle"
      />
    );

    const input = screen.getByLabelText(/Resposta para a questão 1/i);
    await userEvent.type(input, "8");

    expect(onChange).toHaveBeenLastCalledWith("8");
  });

  it("aplica estilo verde quando correto", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        index={1}
        value="8"
        onChange={() => {}}
        status="correct"
      />
    );

    expect(screen.getByText("✓")).toBeInTheDocument();
    const article = screen.getByText(mockQuestion.statement).closest("article");
    expect(article).toHaveClass("border-green-400");
  });

  it("mostra explicação quando incorreto", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        index={1}
        value="5"
        onChange={() => {}}
        status="incorrect"
      />
    );

    expect(screen.getByText(/Resposta certa: 8/i)).toBeInTheDocument();
    expect(screen.getByText(mockQuestion.explanation)).toBeInTheDocument();
  });

  it("desabilita input quando disabled", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        index={1}
        value=""
        onChange={() => {}}
        status="idle"
        disabled
      />
    );

    expect(screen.getByLabelText(/Resposta para a questão 1/i)).toBeDisabled();
  });
});
