// src/utils/groups.ts
import { getMainGroups } from "../api/schedule";
import type { Group } from "../api/types";

/**
 * Если сохранена подгруппа (UID_mg заполнен), возвращает её основную группу.
 * При ошибке сети или отсутствии основной группы возвращает исходную группу,
 * чтобы расписание не пропало полностью.
 */
export async function resolveMainGroup(
  group: Group | null,
): Promise<Group | null> {
  if (!group || !group.UID_mg) return group;

  try {
    const { groups } = await getMainGroups(group.fac_id, group.course_id);
    return (
      groups.find((item) => item.UID === group.UID_mg) ??
      groups.find((item) => item.group_id === group.maingroup_id) ??
      group
    );
  } catch {
    return group;
  }
}
