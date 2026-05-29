import { useMemo } from "react";
import type { ContributionCalendar, Plan } from "../lib/types";
import { ORGANIC_COLORS, PLAN_COLORS, levelFor } from "../lib/levels";

type Props = {
  calendar: ContributionCalendar;
  plan: Plan;
  isHolding: boolean;
  onBeginHold: (date: string) => void;
  onEnterDay: (date: string) => void;
};

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function Heatmap({ calendar, plan, isHolding, onBeginHold, onEnterDay }: Props) {
  const monthLabels = useMemo(() => buildMonthLabels(calendar), [calendar]);

  return (
    <div className="overflow-x-auto select-none">
      <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: "auto 1fr" }}>
        <div />
        <div
          className="grid grid-flow-col gap-[3px] text-[10px] text-gray-500"
          style={{
            gridTemplateColumns: `repeat(${calendar.weeks.length}, 13px)`,
          }}
        >
          {monthLabels.map((label, i) => (
            <div key={i} className="h-3">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-rows-7 gap-[3px] text-[10px] text-gray-500 pr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[13px] leading-[13px]">{label}</div>
          ))}
        </div>

        <div
          className="grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 13px)" }}
          onPointerDown={(e) => e.preventDefault()}
        >
          {calendar.weeks.flatMap((week) =>
            week.map((day) => {
              const planned = plan[day.date] ?? 0;
              const total = day.count + planned;
              const lvl = levelFor(total);
              const bg =
                planned > 0
                  ? PLAN_COLORS[Math.max(1, lvl) as 1 | 2 | 3 | 4]
                  : ORGANIC_COLORS[lvl];
              const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
              const title =
                `${day.date} — ${day.count} organic` +
                (planned > 0 ? ` + ${planned} planned = ${total}` : "");
              return (
                <div
                  key={day.date}
                  title={title}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onBeginHold(day.date);
                  }}
                  onPointerEnter={() => onEnterDay(day.date)}
                  className={
                    "rounded-[2px] cursor-pointer transition-transform " +
                    (isHolding ? "" : "hover:ring-1 hover:ring-gray-400")
                  }
                  style={{
                    background: bg,
                    gridRowStart: weekday + 1,
                    width: 13,
                    height: 13,
                    touchAction: "none",
                  }}
                />
              );
            }),
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={`g${l}`}
            className="rounded-[2px] block"
            style={{
              background: ORGANIC_COLORS[l as 0 | 1 | 2 | 3 | 4],
              width: 13,
              height: 13,
            }}
          />
        ))}
        <span>More</span>
        <span className="mx-3 text-gray-400">·</span>
        <span>Planned</span>
        {[1, 2, 3, 4].map((l) => (
          <span
            key={`p${l}`}
            className="rounded-[2px] block"
            style={{
              background: PLAN_COLORS[l as 1 | 2 | 3 | 4],
              width: 13,
              height: 13,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function buildMonthLabels(cal: ContributionCalendar): string[] {
  const labels: string[] = new Array(cal.weeks.length).fill("");
  let lastMonth = -1;
  cal.weeks.forEach((week, wi) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const month = new Date(`${firstDay.date}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth) {
      labels[wi] = MONTH_NAMES[month];
      lastMonth = month;
    }
  });
  return labels;
}
