"use client";

import dynamic from "next/dynamic";
import { MotionProvider } from "@/components/MotionProvider";

const QuizPage = dynamic(
  () => import("@/components/QuizPage").then((mod) => mod.QuizPage),
  { ssr: false }
);

export function QuizPageLoader() {
  return (
    <MotionProvider>
      <QuizPage />
    </MotionProvider>
  );
}
