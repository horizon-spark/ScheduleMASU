// src/api/normalize.ts
// Внешний API расписания не гарантирует форму ответа: поля могут
// отсутствовать, приходить null или строкой вместо числа. Нормализуем
// ответы в одном месте, чтобы экраны не падали на неполных данных.
import type {
  Building,
  Course,
  DatesResponse,
  Faculty,
  Group,
  Lesson,
  Room,
  ScheduleResponse,
  Teacher,
  UpdateResponse,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function responseMeta(data: unknown): {
  record: UnknownRecord;
  success: boolean;
  update: string;
} {
  const record = asRecord(data) ?? {};
  return {
    record,
    // Раньше отсутствие success трактовалось как false; для прокси
    // отсутствие поля не должно скрывать данные.
    success: record.success !== false,
    update: asString(record.update),
  };
}

export function normalizeLesson(value: unknown): Lesson | null {
  const record = asRecord(value);
  if (!record) return null;

  const lesson: Lesson = {
    date: asString(record.date),
    slot: asString(record.slot),
    day_of_week: asString(record.day_of_week),
    type: asString(record.type),
    disciplines: asString(record.disciplines),
    room: asString(record.room),
    teacher: asString(record.teacher),
    subGroups: asStringArray(record.subGroups),
  };

  const id = asOptionalNumber(record.id);
  if (id !== undefined) lesson.id = id;

  const index = asOptionalNumber(record.index);
  if (index !== undefined) lesson.index = index;

  return lesson;
}

function normalizeFaculty(value: unknown): Faculty | null {
  const record = asRecord(value);
  if (!record) return null;

  const faculty: Faculty = {
    fac_id: asNumber(record.fac_id),
    facultee: asString(record.facultee),
  };

  return faculty.facultee ? faculty : null;
}

function normalizeCourse(value: unknown): Course | null {
  const record = asRecord(value);
  if (!record) return null;

  const course: Course = {
    course_id: asNumber(record.course_id),
    course: asString(record.course),
  };

  return course.course ? course : null;
}

function normalizeGroup(value: unknown): Group | null {
  const record = asRecord(value);
  if (!record) return null;

  const group: Group = {
    group_id: asNumber(record.group_id),
    group: asString(record.group),
    speciality: asString(record.speciality),
    course_id: asNumber(record.course_id),
    fac_id: asNumber(record.fac_id),
    maingroup_id: asNumber(record.maingroup_id),
    UID: asString(record.UID),
    UID_mg: asString(record.UID_mg),
  };

  // Без UID группа непригодна для запроса расписания.
  return group.UID ? group : null;
}

function normalizeBuilding(value: unknown): Building | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    bui_id: asNumber(record.bui_id),
    building: asString(record.building),
  };
}

function normalizeRoom(value: unknown): Room | null {
  const record = asRecord(value);
  if (!record) return null;

  const room: Room = {
    room_id: asNumber(record.room_id),
    room: asString(record.room),
    room_type: asString(record.room_type),
    bui_id: asNumber(record.bui_id),
  };

  return room.room ? room : null;
}

function normalizeTeacher(value: unknown): Teacher | null {
  const record = asRecord(value);
  if (!record) return null;

  const teacher: Teacher = {
    teacher_id: asNumber(record.teacher_id),
    teacher: asString(record.teacher),
    UID: asString(record.UID),
  };

  return teacher.UID && teacher.teacher ? teacher : null;
}

function normalizeCollection<T>(
  value: unknown,
  normalizeItem: (item: unknown) => T | null,
): T[] {
  return asArray(value)
    .map(normalizeItem)
    .filter((item): item is T => item !== null);
}

export function normalizeFacultiesResponse(data: unknown): {
  success: boolean;
  update: string;
  courses: Faculty[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    // Историческая особенность API: факультеты приходят в поле courses.
    courses: normalizeCollection(record.courses, normalizeFaculty),
  };
}

export function normalizeCoursesResponse(data: unknown): {
  success: boolean;
  update: string;
  courses: Course[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    courses: normalizeCollection(record.courses, normalizeCourse),
  };
}

export function normalizeGroupsResponse(data: unknown): {
  success: boolean;
  update: string;
  groups: Group[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    groups: normalizeCollection(record.groups, normalizeGroup),
  };
}

export function normalizeScheduleResponse(data: unknown): ScheduleResponse {
  const { record, success, update } = responseMeta(data);
  // Некоторые прокси/моки отдают массив напрямую.
  const rawTimetable = Array.isArray(data) ? data : record.timetable;

  return {
    success,
    update,
    stale: record.stale === true,
    timetable: normalizeCollection(rawTimetable, normalizeLesson),
  };
}

export function normalizeBuildingsResponse(data: unknown): {
  success: boolean;
  update: string;
  buildings: Building[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    buildings: normalizeCollection(record.buildings, normalizeBuilding),
  };
}

export function normalizeRoomsResponse(data: unknown): {
  success: boolean;
  update: string;
  rooms: Room[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    rooms: normalizeCollection(record.rooms, normalizeRoom),
  };
}

export function normalizeTeachersResponse(data: unknown): {
  success: boolean;
  update: string;
  teachers: Teacher[];
} {
  const { record, success, update } = responseMeta(data);
  return {
    success,
    update,
    teachers: normalizeCollection(record.teachers, normalizeTeacher),
  };
}

export function normalizeDatesResponse(data: unknown): DatesResponse {
  const { record, success, update } = responseMeta(data);
  const dates = asArray(record.dates).filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );

  return { success, update, dates };
}

export function normalizeUpdateResponse(data: unknown): UpdateResponse {
  const { success, update } = responseMeta(data);
  return { success, update };
}
