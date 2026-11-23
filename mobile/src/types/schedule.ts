// src/types/schedule.ts
export type ScheduleSubject =
  | { kind: "group"; uid: string; title: string; subtitle?: string }
  | { kind: "teacher"; uid: string; title: string; subtitle?: string }
  | { kind: "room"; roomId: number; title: string; subtitle?: string };

export type ScheduleSubjectKind = ScheduleSubject["kind"];

/** Стабильный ключ субъекта для кеша и сравнения. */
export function getSubjectKey(subject: ScheduleSubject): string {
  switch (subject.kind) {
    case "group":
      return `group:${subject.uid}`;
    case "teacher":
      return `teacher:${subject.uid}`;
    case "room":
      return `room:${subject.roomId}`;
  }
}

export function isScheduleSubject(value: unknown): value is ScheduleSubject {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string") return false;
  if (
    candidate.subtitle !== undefined &&
    typeof candidate.subtitle !== "string"
  ) {
    return false;
  }

  if (candidate.kind === "group" || candidate.kind === "teacher") {
    return typeof candidate.uid === "string" && candidate.uid.length > 0;
  }

  if (candidate.kind === "room") {
    return (
      typeof candidate.roomId === "number" && Number.isFinite(candidate.roomId)
    );
  }

  return false;
}
