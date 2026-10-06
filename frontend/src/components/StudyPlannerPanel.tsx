import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";
import type { StudyPlan, StudyPlanWithTasks } from "../types";

interface StudyPlannerPanelProps {
  onClose: () => void;
}

export default function StudyPlannerPanel({ onClose }: StudyPlannerPanelProps) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlanWithTasks | null>(null);
  const [goal, setGoal] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlans = () => api.listStudyPlans().then(setPlans).catch(() => setPlans([]));

  useEffect(() => {
    refreshPlans();
  }, []);

  const generate = async () => {
    const subjectList = subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!goal.trim() || subjectList.length === 0) {
      setError("Enter a goal and at least one subject.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await api.generateStudyPlan(goal, subjectList, hoursPerDay, days);
      setActivePlan(plan);
      refreshPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a plan.");
    } finally {
      setLoading(false);
    }
  };

  const openPlan = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setActivePlan(await api.getStudyPlan(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load plan.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      tasks: activePlan.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
    });
    await api.setStudyTaskDone(taskId, done);
  };

  const removePlan = async (id: string) => {
    await api.deleteStudyPlan(id);
    if (activePlan?.id === id) setActivePlan(null);
    refreshPlans();
  };

  const tasksByDay = activePlan
    ? activePlan.tasks.reduce<Record<number, typeof activePlan.tasks>>((acc, t) => {
        (acc[t.day_number] ??= []).push(t);
        return acc;
      }, {})
    : {};

  const progress = activePlan?.tasks.length
    ? Math.round((activePlan.tasks.filter((t) => t.done).length / activePlan.tasks.length) * 100)
    : 0;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex h-[85vh] w-[90vw] max-w-3xl overflow-hidden rounded-2xl shadow-glass"
      >
        <div className="w-56 shrink-0 border-r border-white/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-ember-500" />
            <h2 className="font-display text-sm font-semibold text-ink-100">Study Planner</h2>
          </div>
          <button
            onClick={() => setActivePlan(null)}
            className="mb-3 w-full rounded-lg bg-obsidian-700 px-3 py-2 text-xs font-medium text-ink-100 hover:bg-obsidian-600"
          >
            + New plan
          </button>
          <div className="scrollbar-thin space-y-1 overflow-y-auto">
            {plans.map((p) => (
              <div
                key={p.id}
                onClick={() => openPlan(p.id)}
                className={clsx(
                  "group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs",
                  activePlan?.id === p.id
                    ? "bg-obsidian-700 text-ink-100"
                    : "text-ink-500 hover:bg-obsidian-700/50 hover:text-ink-100"
                )}
              >
                <span className="truncate">{p.goal}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePlan(p.id);
                  }}
                  className="ml-1 shrink-0 opacity-0 hover:text-ember-500 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex justify-end">
            <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-obsidian-700 hover:text-ink-100">
              <X size={18} />
            </button>
          </div>

          {!activePlan ? (
            <div className="mx-auto max-w-md space-y-3">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Goal (e.g. Clear AKTU semester exams)"
                className="w-full rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:outline-none"
              />
              <input
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Subjects, comma separated"
                className="w-full rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:outline-none"
              />
              <div className="flex gap-3">
                <label className="flex-1 text-xs text-ink-500">
                  Hours/day
                  <input
                    type="number"
                    min={0.5}
                    max={16}
                    step={0.5}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-sm text-ink-100 focus:outline-none"
                  />
                </label>
                <label className="flex-1 text-xs text-ink-500">
                  Days
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-sm text-ink-100 focus:outline-none"
                  />
                </label>
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-ember-gradient px-4 py-2 text-sm font-semibold text-obsidian-950 disabled:opacity-40"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Generate plan
              </button>
              {error && <p className="text-sm text-ember-400">{error}</p>}
            </div>
          ) : (
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-100">{activePlan.goal}</h3>
              <p className="mb-1 text-xs text-ink-500">
                {activePlan.subjects.join(", ")} · {activePlan.hours_per_day}h/day · {activePlan.days} days
              </p>
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-700">
                <div className="h-full bg-ember-gradient" style={{ width: `${progress}%` }} />
              </div>

              <div className="space-y-4">
                {Object.entries(tasksByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, tasks]) => (
                    <div key={day}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700">
                        Day {day}
                      </p>
                      <div className="space-y-1">
                        {tasks.map((t) => (
                          <label
                            key={t.id}
                            className="flex items-start gap-2 rounded-lg bg-obsidian-900/40 px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={(e) => toggleTask(t.id, e.target.checked)}
                              className="mt-0.5 accent-ember-500"
                            />
                            <span className={clsx(t.done && "text-ink-700 line-through")}>
                              <span className="text-arcane-400">{t.subject}:</span> {t.task}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
