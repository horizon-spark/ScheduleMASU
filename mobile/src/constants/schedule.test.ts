import { describe, expect, it } from "vitest";
import {
  formatUpdateTime,
  formatWeekRange,
  getDayIndex,
  getMondayOfWeek,
  getSemesterWeeks,
  getWeekParity,
} from "./schedule";

describe("getMondayOfWeek", () => {
  it("returns the Monday of the current week", () => {
    // Четверг, 26 ноября 2026
    expect(getMondayOfWeek(new Date(2026, 10, 26)).getDate()).toBe(23);
  });

  it("handles Sunday as the end of the week", () => {
    // Воскресенье, 29 ноября 2026
    expect(getMondayOfWeek(new Date(2026, 10, 29)).getDate()).toBe(23);
  });
});

describe("getDayIndex", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    expect(getDayIndex(new Date(2026, 10, 23))).toBe(0);
    expect(getDayIndex(new Date(2026, 10, 29))).toBe(6);
  });
});

describe("getWeekParity", () => {
  it("counts the week of 31 August as even", () => {
    expect(getWeekParity(new Date(2026, 7, 31))).toBe("чётная");
  });

  it("alternates parity on the next week", () => {
    expect(getWeekParity(new Date(2026, 8, 7))).toBe("нечётная");
  });

  it("is stable for any day inside the same week", () => {
    const monday = getWeekParity(new Date(2026, 10, 23));
    const sunday = getWeekParity(new Date(2026, 10, 29));

    expect(monday).toBe(sunday);
  });
});

describe("getSemesterWeeks", () => {
  it("returns autumn Mondays up to the end of January", () => {
    const weeks = getSemesterWeeks(new Date(2026, 10, 26));

    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]).toEqual(getMondayOfWeek(new Date(2026, 7, 31)));
    expect(weeks.every((week) => week.getDay() === 1)).toBe(true);
    expect(weeks[weeks.length - 1].getTime()).toBeLessThanOrEqual(
      new Date(2027, 0, 31).getTime(),
    );
  });

  it("returns spring Mondays up to the end of June", () => {
    const weeks = getSemesterWeeks(new Date(2026, 2, 10));

    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]).toEqual(getMondayOfWeek(new Date(2026, 1, 1)));
    expect(weeks.every((week) => week.getDay() === 1)).toBe(true);
    expect(weeks[weeks.length - 1].getTime()).toBeLessThanOrEqual(
      new Date(2026, 5, 30).getTime(),
    );
  });
});

describe("formatting", () => {
  it("formats a week range", () => {
    expect(formatWeekRange(new Date(2026, 10, 23))).toBe("23.11 – 29.11");
  });

  it("formats the upstream update time", () => {
    expect(formatUpdateTime("2026-11-20 16:43:22")).toBe(
      "20.11.2026 16:43",
    );
    expect(formatUpdateTime("unknown")).toBe("unknown");
  });
});
