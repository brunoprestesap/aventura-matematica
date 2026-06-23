"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Button } from "@/components/ui/button";
import { ModalSheet } from "@/components/ModalSheet";
import {
  useHistory,
  mergeHistories,
  formatActivityDate,
  type ActivityRecord,
} from "@/lib/history";
import { getGradeConfig } from "@/lib/questions";
import { staggerContainer, listItem } from "@/lib/motion";
import { History, X, Trophy, Calendar } from "lucide-react";

export function HistoryPanel() {
  const [open, setOpen] = useState(false);
  const [cloud, setCloud] = useState<ActivityRecord[]>([]);
  const localHistory = useHistory();

  // Busca lazy: só quando o painel abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/historico")
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.activities)) {
          setCloud(data.activities as ActivityRecord[]);
        }
      })
      .catch(() => {
        // Falha silenciosa — cai para o histórico local
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const history = mergeHistories(localHistory, cloud);

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

      <ModalSheet open={open} onClose={() => setOpen(false)} ariaLabel="Histórico de atividades">
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
            <m.ul
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-2 sm:space-y-3"
            >
              {history.activities.map((activity) => {
                const gradeConfig = getGradeConfig(activity.grade);
                return (
                  <m.li
                    key={activity.id}
                    variants={listItem}
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
                  </m.li>
                );
              })}
            </m.ul>
          )}
        </div>
      </ModalSheet>
    </>
  );
}
