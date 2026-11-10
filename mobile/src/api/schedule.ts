// src/api/schedule.ts
import { api } from "./client";
import {
    CoursesResponse,
    FacultiesResponse,
    GroupsResponse,
    ScheduleResponse,
} from "./types";

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
    `/faculties/${facId}/courses/${courseId}/groups`,
  );
  return data;
};

export const getSchedule = async (
  uid: string,
  start: string,
  end: string,
): Promise<ScheduleResponse> => {
  const { data } = await api.get(`/groups/${uid}/schedule/${start}/${end}`);
  return data;
};
