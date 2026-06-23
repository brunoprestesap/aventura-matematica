"use client";

import { type ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";
import { overlayFade, modalSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  overlayClassName?: string;
  sheetClassName?: string;
  onExitComplete?: () => void;
}

export function ModalSheet({
  open,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  children,
  overlayClassName,
  sheetClassName,
  onExitComplete,
}: ModalSheetProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <m.div
          variants={overlayFade}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4",
            overlayClassName
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
        >
          <m.div
            variants={modalSpring}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] pb-[env(safe-area-inset-bottom)]",
              sheetClassName
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
