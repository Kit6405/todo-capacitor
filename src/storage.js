import { Preferences } from '@capacitor/preferences';

const KEY = 'tasks_v1';

export async function loadTasks() {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks) {
  await Preferences.set({
    key: KEY,
    value: JSON.stringify(tasks),
  });
}

export async function clearTasks() {
  await Preferences.remove({ key: KEY });
}
