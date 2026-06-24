import type { Metadata } from "next";
import { QuizPageLoader } from "@/components/QuizPageLoader";

export const metadata: Metadata = {
  title: "Jogar Agora",
  robots: { index: false, follow: false },
};

export default function JogarPage() {
  return <QuizPageLoader />;
}
