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
        className="rounded-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
      >
        <History className="mr-1 size-4" aria-hidden="true" />
        Histórico
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-purple-50 p-4">
              <div className="flex items-center gap-2 text-purple-700">
                <History className="size-5" aria-hidden="true" />
                <h2 className="text-lg font-black">Histórico de atividades</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full text-slate-500 hover:bg-purple-100 hover:text-purple-700"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>

            <div className="overflow-y-auto p-4">
              {history.activities.length === 0 ? (
                <div className="py-10 text-center">
                  <Trophy
                    className="mx-auto mb-3 size-12 text-slate-300"
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
                <ul className="space-y-3">
                  {history.activities.map((activity) => {
                    const gradeConfig = getGradeConfig(activity.grade);
                    return (
                      <li
                        key={activity.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-purple-50"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">{gradeConfig.emoji}</span>
                            <span className="font-bold text-slate-700">
                              {gradeConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-black text-purple-700">
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
