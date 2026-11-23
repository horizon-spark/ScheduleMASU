// src/utils/subjects.ts
import type { Group, Room, Teacher } from "../api/types";
import { getSubjectKey } from "../types/schedule";
import type { ScheduleSubject } from "../types/schedule";

export function makeGroupSubject(group: Group): ScheduleSubject {
  return {
    kind: "group",
    uid: group.UID,
    title: group.group,
    subtitle: group.speciality?.trim() || undefined,
  };
}

export function makeTeacherSubject(teacher: Teacher): ScheduleSubject {
  return {
    kind: "teacher",
    uid: teacher.UID,
    title: teacher.teacher,
    subtitle: "Преподаватель",
  };
}

export function makeRoomSubject(room: Room, building: string): ScheduleSubject {
  return {
    kind: "room",
    roomId: room.room_id,
    title: room.room,
    subtitle: building || "Аудитория",
  };
}

/** Совпадают ли субъекты (с учётом отображаемых подписей). */
export function sameSubject(
  a: ScheduleSubject | null,
  b: ScheduleSubject | null,
): boolean {
  if (!a || !b) return a === b;
  return (
    getSubjectKey(a) === getSubjectKey(b) &&
    a.title === b.title &&
    (a.subtitle ?? "") === (b.subtitle ?? "")
  );
}
