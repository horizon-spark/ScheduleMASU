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

export interface Lesson {
  date: string;
  slot: string;
  day_of_week: string;
  type: string;
  disciplines: string;
  room: string;
  teacher: string;
  subGroups: string[];
  id: number;
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
