export interface ApiResponse<T> {
  update: string;
  success: boolean;
}

export interface Faculty {
  fac_id: number;
  facultee: string;
}

export interface Course {
  course_id: number;
  course: string;
}

export interface Group {
  group_id: number;
  group: string;
  speciality: string;
  course_id: number;
  fac_id: number;
  maingroup_id: number;
  UID: string;
  UID_mg: string;
}

export interface Building {
  bui_id: number;
  building: string;
}

export interface Room {
  room_id: number;
  room: string;
  room_type: string;
  bui_id: number;
}

export interface Teacher {
  teacher_id: number;
  teacher: string;
  UID: string;
}

export interface Lesson {
  date: string;
  slot: string;
  day_of_week: string;
  type: string;
  disciplines: string;
  room: string;
  teacher: string;
  /**
   * Для расписания группы — подгруппы занятия.
   * Для расписания преподавателя/аудитории — названия групп.
   */
  subGroups: string[];
  /** Есть только в расписании группы. */
  id?: number;
  /** Есть только в расписании преподавателя/аудитории. */
  index?: number;
}

// Ответы API
export interface FacultiesResponse extends ApiResponse<Faculty> {
  courses: Faculty[]; // Обратите внимание: в API поле называется courses, но содержит факультеты
}

export interface CoursesResponse extends ApiResponse<Course> {
  courses: Course[];
}

export interface GroupsResponse extends ApiResponse<Group> {
  groups: Group[];
}

export interface ScheduleResponse extends ApiResponse<Lesson> {
  timetable: Lesson[];
}

export interface BuildingsResponse extends ApiResponse<Building> {
  buildings: Building[];
}

export interface RoomsResponse extends ApiResponse<Room> {
  rooms: Room[];
}

export interface TeachersResponse extends ApiResponse<Teacher> {
  teachers: Teacher[];
}

export interface DatesResponse extends ApiResponse<string> {
  dates: string[];
}

/** Ответ GET /update — время последнего обновления расписания на сервере. */
export type UpdateResponse = ApiResponse<unknown>;
