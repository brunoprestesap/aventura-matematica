"use client";

import dynamic from "next/dynamic";

const QuizPage = dynamic(
  () => import("@/components/QuizPage").then((mod) => mod.QuizPage),
  { ssr: false }
);

export function QuizPageLoader() {
  return <QuizPage />;
}
