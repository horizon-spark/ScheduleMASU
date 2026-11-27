// src/api/schedule.ts
import { api } from "./client";
import { withRetry } from "./retry";
import {
  normalizeBuildingsResponse,
  normalizeCoursesResponse,
  normalizeDatesResponse,
  normalizeFacultiesResponse,
  normalizeGroupsResponse,
  normalizeRoomsResponse,
  normalizeScheduleResponse,
  normalizeTeachersResponse,
  normalizeUpdateResponse,
} from "./normalize";
import type {
  BuildingsResponse,
  CoursesResponse,
  DatesResponse,
  FacultiesResponse,
  GroupsResponse,
  RoomsResponse,
  ScheduleResponse,
  TeachersResponse,
  UpdateResponse,
} from "./types";

/** Безопасно подставляет значение в сегмент URL. */
const seg = (value: string | number) => encodeURIComponent(String(value));

type QueryOptions = { fresh?: boolean };

/** `?fresh=1` — обойти кеш прокси (pull-to-refresh). */
const freshParams = (options: QueryOptions) =>
  options.fresh ? { params: { fresh: 1 } } : undefined;

type RequestConfig = Parameters<typeof api.get>[1];

/** GET-запросы расписания идемпотентны: повторяем только временные сбои. */
async function getData(url: string, config?: RequestConfig) {
  const response = await withRetry(() => api.get<unknown>(url, config), {
    attempts: 2,
    baseDelayMs: 800,
    maxDelayMs: 2500,
    jitterMs: 250,
  });

  return response.data;
}

// ── Институты, курсы, группы ──────────────────────────────
export const getFaculties = async (): Promise<FacultiesResponse> => {
  const data = await getData("/faculties");
  return normalizeFacultiesResponse(data);
};

export const getCourses = async (): Promise<CoursesResponse> => {
  const data = await getData("/courses");
  return normalizeCoursesResponse(data);
};

export const getGroups = async (
  facId: number,
  courseId: number,
): Promise<GroupsResponse> => {
  const data = await getData(
    `/faculties/${seg(facId)}/courses/${seg(courseId)}/groups`,
  );
  return normalizeGroupsResponse(data);
};

/** Все группы института/факультета. */
export const getGroupsByFaculty = async (
  facId: number,
): Promise<GroupsResponse> => {
  const data = await getData(`/faculties/${seg(facId)}/groups`);
  return normalizeGroupsResponse(data);
};

/** Только основные группы института/факультета (UID_mg = ""). */
export const getMainGroupsByFaculty = async (
  facId: number,
): Promise<GroupsResponse> => {
  const data = await getData(`/faculties/${seg(facId)}/groups/main`);
  return normalizeGroupsResponse(data);
};

/** Только основные группы института/факультета по курсу. */
export const getMainGroups = async (
  facId: number,
  courseId: number,
): Promise<GroupsResponse> => {
  const data = await getData(
    `/faculties/${seg(facId)}/courses/${seg(courseId)}/groups/main`,
  );
  return normalizeGroupsResponse(data);
};

/** Подгруппы основной группы. */
export const getSubgroups = async (uid: string): Promise<GroupsResponse> => {
  const data = await getData(`/groups/${seg(uid)}/subgroups`);
  return normalizeGroupsResponse(data);
};

// ── Корпуса и аудитории ───────────────────────────────────
export const getBuildings = async (): Promise<BuildingsResponse> => {
  const data = await getData("/buildings");
  return normalizeBuildingsResponse(data);
};

export const getRooms = async (buiId: number): Promise<RoomsResponse> => {
  const data = await getData(`/buildings/${seg(buiId)}/rooms`);
  return normalizeRoomsResponse(data);
};

// ── Преподаватели ─────────────────────────────────────────
export const getTeachers = async (): Promise<TeachersResponse> => {
  const data = await getData("/teachers");
  return normalizeTeachersResponse(data);
};

/** Поиск преподавателей по части ФИО (минимум 2 символа). */
export const searchTeachers = async (
  name: string,
): Promise<TeachersResponse> => {
  const data = await getData("/teachers/search", { params: { name } });
  return normalizeTeachersResponse(data);
};

// ── Расписание группы ─────────────────────────────────────
/** Даты, на которые есть расписание группы (включая подгруппы). */
export const getGroupDates = async (uid: string): Promise<DatesResponse> => {
  const data = await getData(`/groups/${seg(uid)}/dates`);
  return normalizeDatesResponse(data);
};

export const getGroupScheduleToday = async (
  uid: string,
): Promise<ScheduleResponse> => {
  const data = await getData(`/groups/${seg(uid)}/schedule/today`);
  return normalizeScheduleResponse(data);
};

export const getSchedule = async (
  uid: string,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const data = await getData(
    `/groups/${seg(uid)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return normalizeScheduleResponse(data);
};

// ── Расписание преподавателя ──────────────────────────────
export const getTeacherDates = async (
  uid: string,
): Promise<DatesResponse> => {
  const data = await getData(`/teachers/${seg(uid)}/dates`);
  return normalizeDatesResponse(data);
};

export const getTeacherScheduleToday = async (
  uid: string,
): Promise<ScheduleResponse> => {
  const data = await getData(`/teachers/${seg(uid)}/schedule/today`);
  return normalizeScheduleResponse(data);
};

export const getTeacherSchedule = async (
  uid: string,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const data = await getData(
    `/teachers/${seg(uid)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return normalizeScheduleResponse(data);
};

// ── Расписание аудитории ──────────────────────────────────
export const getRoomSchedule = async (
  roomId: number,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const data = await getData(
    `/rooms/${seg(roomId)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return normalizeScheduleResponse(data);
};

// ── Служебное ─────────────────────────────────────────────
/** Время последнего обновления расписания на сервере. */
export const getScheduleUpdate = async (): Promise<UpdateResponse> => {
  const data = await getData("/update");
  return normalizeUpdateResponse(data);
};
