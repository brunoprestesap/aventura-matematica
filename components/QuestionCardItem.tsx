"use client";

import { memo, useCallback } from "react";
import { QuestionCard, AnswerStatus } from "@/components/QuestionCard";
import { Question } from "@/lib/questions";

interface QuestionCardItemProps {
  question: Question;
  index: number;
  value: string;
  status: AnswerStatus;
  disabled: boolean;
  onChange: (questionId: string, value: string) => void;
  setInputRef: (el: HTMLInputElement | null, questionId: string) => void;
}

export const QuestionCardItem = memo(function QuestionCardItem({
  question,
  index,
  value,
  status,
  disabled,
  onChange,
  setInputRef,
}: QuestionCardItemProps) {
  const handleChange = useCallback(
    (newValue: string) => onChange(question.id, newValue),
    [onChange, question.id]
  );

  const handleRef = useCallback(
    (el: HTMLInputElement | null) => setInputRef(el, question.id),
    [setInputRef, question.id]
  );

  return (
    <QuestionCard
      question={question}
      index={index + 1}
      value={value}
      onChange={handleChange}
      status={status}
      disabled={disabled}
      ref={handleRef}
    />
  );
});

QuestionCardItem.displayName = "QuestionCardItem";
