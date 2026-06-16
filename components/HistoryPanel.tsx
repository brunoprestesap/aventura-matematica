"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useHistory, formatActivityDate } from "@/lib/history";
import { getGradeConfig } from "@/lib/questions";
import { History, X, Trophy, Calendar } from "lucide-react";

export function HistoryPanel() {
  const [open, setOpen] = useState(false);
  const history = useHistory();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full border-brand-light px-3 text-xs text-brand-dark hover:bg-brand-light hover:text-brand-dark sm:px-4 sm:text-sm"
      >
        <History className="mr-1 size-3.5 sm:size-4" aria-hidden="true" />
        Histórico
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Histórico de atividades"
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-brand-light p-4">
              <div className="flex items-center gap-2 text-brand-dark">
                <History className="size-5" aria-hidden="true" />
                <h2 className="text-base font-black sm:text-lg">
                  Histórico de atividades
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full text-slate-500 hover:bg-brand-light hover:text-brand-dark"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>

            <div className="overflow-y-auto p-3 sm:p-4">
              {history.activities.length === 0 ? (
                <div className="py-8 text-center sm:py-10">
                  <Trophy
                    className="mx-auto mb-3 size-10 text-slate-300 sm:size-12"
                    aria-hidden="true"
                  />
                  <p className="text-base font-semibold text-slate-600">
                    Nenhuma atividade realizada ainda.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete uma rodada de questões para ver seu histórico aqui.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 sm:space-y-3">
                  {history.activities.map((activity) => {
                    const gradeConfig = getGradeConfig(activity.grade);
                    return (
                      <li
                        key={activity.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-brand-light sm:rounded-2xl sm:p-4"
                      >
                        <div className="mb-1 flex items-center justify-between sm:mb-2">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">{gradeConfig.emoji}</span>
                            <span className="text-sm font-bold text-slate-700 sm:text-base">
                              {gradeConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-black text-brand-dark">
                            <Trophy
                              className="size-4"
                              aria-hidden="true"
                            />
                            {activity.score}/{activity.total}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm">
                          <Calendar
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {formatActivityDate(activity.completedAt)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
