/**
 * Sort goals by priority for automated transfers
 * Priority order: priority level → status → due date
 */
export function sortGoalsByPriority(goals) {
  return goals.sort((a, b) => {
    // 1. Sort by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // 2. Sort by status (in_progress > planned > completed > archived)
    const statusOrder = { in_progress: 1, planned: 2, completed: 3, archived: 4 };
    const statusA = statusOrder[a.status] || 5;
    const statusB = statusOrder[b.status] || 5;
    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // 3. Sort by due date (earlier dates first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return 0;
  });
}