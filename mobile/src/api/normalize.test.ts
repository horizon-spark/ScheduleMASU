import { describe, expect, it } from "vitest";
import {
  normalizeBuildingsResponse,
  normalizeDatesResponse,
  normalizeFacultiesResponse,
  normalizeGroupsResponse,
  normalizeLesson,
  normalizeScheduleResponse,
  normalizeTeachersResponse,
} from "./normalize";

describe("normalizeLesson", () => {
  it("fills missing fields with safe defaults", () => {
    const lesson = normalizeLesson({
      date: "2026-11-23",
      slot: "09:00 - 10:30",
      day_of_week: "Понедельник",
      disciplines: "Математика",
    });

    expect(lesson).not.toBeNull();
    expect(lesson).toMatchObject({
      date: "2026-11-23",
      slot: "09:00 - 10:30",
      day_of_week: "Понедельник",
      disciplines: "Математика",
      type: "",
      room: "",
      teacher: "",
      subGroups: [],
    });
  });

  it("accepts subGroups as an array or comma-separated string", () => {
    expect(
      normalizeLesson({ subGroups: ["1 подгруппа", "2 подгруппа"] })?.subGroups,
    ).toEqual(["1 подгруппа", "2 подгруппа"]);
    expect(normalizeLesson({ subGroups: "1, 2" })?.subGroups).toEqual([
      "1",
      "2",
    ]);
  });

  it("returns null for non-objects", () => {
    expect(normalizeLesson(null)).toBeNull();
    expect(normalizeLesson("lesson")).toBeNull();
    expect(normalizeLesson([])).toBeNull();
  });
});

describe("normalizeScheduleResponse", () => {
  it("filters broken lessons and keeps valid ones", () => {
    const response = normalizeScheduleResponse({
      success: true,
      update: "2026-11-20 16:43:22",
      timetable: [
        { day_of_week: "Понедельник", disciplines: "Физика" },
        null,
        "broken",
      ],
    });

    expect(response.success).toBe(true);
    expect(response.update).toBe("2026-11-20 16:43:22");
    expect(response.timetable).toHaveLength(1);
    expect(response.timetable[0].disciplines).toBe("Физика");
  });

  it("returns an empty timetable when the field is missing", () => {
    expect(normalizeScheduleResponse({ success: true }).timetable).toEqual([]);
    expect(normalizeScheduleResponse(null).timetable).toEqual([]);
  });

  it("accepts an array response directly", () => {
    const response = normalizeScheduleResponse([
      { day_of_week: "Вторник", disciplines: "Химия" },
    ]);

    expect(response.success).toBe(true);
    expect(response.timetable).toHaveLength(1);
  });

  it("passes the stale flag from the proxy", () => {
    expect(normalizeScheduleResponse({ stale: true }).stale).toBe(true);
    expect(normalizeScheduleResponse({}).stale).toBe(false);
  });
});

describe("normalize collection responses", () => {
  it("coerces numeric strings and filters unusable groups", () => {
    const response = normalizeGroupsResponse({
      groups: [
        {
          group_id: "12",
          group: "1Б-ИВТ",
          UID: "group-1",
          UID_mg: "",
          course_id: "1",
          fac_id: "2",
          maingroup_id: "0",
          speciality: "Информатика",
        },
        { group: "Без UID", UID: "" },
        null,
      ],
    });

    expect(response.groups).toHaveLength(1);
    expect(response.groups[0]).toMatchObject({
      group_id: 12,
      UID: "group-1",
      course_id: 1,
      fac_id: 2,
    });
  });

  it("uses the courses field for faculties", () => {
    const response = normalizeFacultiesResponse({
      courses: [
        { fac_id: "1", facultee: "Институт" },
        { fac_id: 2, facultee: "" },
      ],
    });

    expect(response.courses).toEqual([{ fac_id: 1, facultee: "Институт" }]);
  });

  it("normalizes teachers, buildings and dates", () => {
    expect(
      normalizeTeachersResponse({
        teachers: [
          { teacher_id: 1, teacher: "Иванов И.И.", UID: "t-1" },
          { teacher: "Без UID", UID: "" },
        ],
      }).teachers,
    ).toHaveLength(1);

    expect(
      normalizeBuildingsResponse({
        buildings: [{ bui_id: "3", building: "Корпус А" }],
      }).buildings,
    ).toEqual([{ bui_id: 3, building: "Корпус А" }]);

    expect(
      normalizeDatesResponse({ dates: ["2026-11-23", "", 42] }).dates,
    ).toEqual(["2026-11-23"]);
  });
});
