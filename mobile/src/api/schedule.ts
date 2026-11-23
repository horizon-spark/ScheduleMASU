// src/api/schedule.ts
import { api } from "./client";
import {
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

// ── Институты, курсы, группы ──────────────────────────────
export const getFaculties = async (): Promise<FacultiesResponse> => {
  const { data } = await api.get("/faculties");
  return data;
};

export const getCourses = async (): Promise<CoursesResponse> => {
  const { data } = await api.get("/courses");
  return data;
};

export const getGroups = async (
  facId: number,
  courseId: number,
): Promise<GroupsResponse> => {
  const { data } = await api.get(
    `/faculties/${seg(facId)}/courses/${seg(courseId)}/groups`,
  );
  return data;
};

/** Все группы института/факультета. */
export const getGroupsByFaculty = async (
  facId: number,
): Promise<GroupsResponse> => {
  const { data } = await api.get(`/faculties/${seg(facId)}/groups`);
  return data;
};

/** Только основные группы института/факультета (UID_mg = ""). */
export const getMainGroupsByFaculty = async (
  facId: number,
): Promise<GroupsResponse> => {
  const { data } = await api.get(`/faculties/${seg(facId)}/groups/main`);
  return data;
};

/** Только основные группы института/факультета по курсу. */
export const getMainGroups = async (
  facId: number,
  courseId: number,
): Promise<GroupsResponse> => {
  const { data } = await api.get(
    `/faculties/${seg(facId)}/courses/${seg(courseId)}/groups/main`,
  );
  return data;
};

/** Подгруппы основной группы. */
export const getSubgroups = async (uid: string): Promise<GroupsResponse> => {
  const { data } = await api.get(`/groups/${seg(uid)}/subgroups`);
  return data;
};

// ── Корпуса и аудитории ───────────────────────────────────
export const getBuildings = async (): Promise<BuildingsResponse> => {
  const { data } = await api.get("/buildings");
  return data;
};

export const getRooms = async (buiId: number): Promise<RoomsResponse> => {
  const { data } = await api.get(`/buildings/${seg(buiId)}/rooms`);
  return data;
};

// ── Преподаватели ─────────────────────────────────────────
export const getTeachers = async (): Promise<TeachersResponse> => {
  const { data } = await api.get("/teachers");
  return data;
};

/** Поиск преподавателей по части ФИО (минимум 2 символа). */
export const searchTeachers = async (
  name: string,
): Promise<TeachersResponse> => {
  const { data } = await api.get("/teachers/search", { params: { name } });
  return data;
};

// ── Расписание группы ─────────────────────────────────────
/** Даты, на которые есть расписание группы (включая подгруппы). */
export const getGroupDates = async (uid: string): Promise<DatesResponse> => {
  const { data } = await api.get(`/groups/${seg(uid)}/dates`);
  return data;
};

export const getGroupScheduleToday = async (
  uid: string,
): Promise<ScheduleResponse> => {
  const { data } = await api.get(`/groups/${seg(uid)}/schedule/today`);
  return data;
};

export const getSchedule = async (
  uid: string,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const { data } = await api.get(
    `/groups/${seg(uid)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return data;
};

// ── Расписание преподавателя ──────────────────────────────
export const getTeacherDates = async (
  uid: string,
): Promise<DatesResponse> => {
  const { data } = await api.get(`/teachers/${seg(uid)}/dates`);
  return data;
};

export const getTeacherScheduleToday = async (
  uid: string,
): Promise<ScheduleResponse> => {
  const { data } = await api.get(`/teachers/${seg(uid)}/schedule/today`);
  return data;
};

export const getTeacherSchedule = async (
  uid: string,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const { data } = await api.get(
    `/teachers/${seg(uid)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return data;
};

// ── Расписание аудитории ──────────────────────────────────
export const getRoomSchedule = async (
  roomId: number,
  start: string,
  end: string,
  options: QueryOptions = {},
): Promise<ScheduleResponse> => {
  const { data } = await api.get(
    `/rooms/${seg(roomId)}/schedule/${seg(start)}/${seg(end)}`,
    freshParams(options),
  );
  return data;
};

// ── Служебное ─────────────────────────────────────────────
/** Время последнего обновления расписания на сервере. */
export const getScheduleUpdate = async (): Promise<UpdateResponse> => {
  const { data } = await api.get("/update");
  return data;
};
