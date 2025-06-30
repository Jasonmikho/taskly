export function getSavedTasks() {
  const raw = localStorage.getItem('savedTasks');
  if (!raw) return [];

  const parsed = JSON.parse(raw);

  // Deduplicate by ID (latest task wins)
  const seen = new Map();
  for (const task of parsed) {
    seen.set(task.id, task); // overwrites if duplicate ID exists
  }

  return Array.from(seen.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function saveTask(taskObj) {
  const saved = getSavedTasks();

  // Remove any existing task with same ID before saving
  const filtered = saved.filter(t => t.id !== taskObj.id);
  const updated = [...filtered, taskObj].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  localStorage.setItem('savedTasks', JSON.stringify(updated));
  return updated;
}

export function deleteTaskById(id) {
  const saved = getSavedTasks();
  const updated = saved.filter(task => task.id !== id);
  localStorage.setItem('savedTasks', JSON.stringify(updated));
  return updated;
}
