/** In-memory unban-all jobs (lost on bot restart). */
type Job = { cancelled: boolean; guildId: string };
const jobs = new Map<string, Job>();

export function createUnbanAllJob(guildId: string): string {
  const id = `${guildId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(id, { cancelled: false, guildId });
  return id;
}

export function cancelUnbanAllJob(guildId: string): boolean {
  for (const [id, j] of jobs) {
    if (j.guildId === guildId && !j.cancelled) {
      j.cancelled = true;
      return true;
    }
  }
  return false;
}

export function getUnbanAllJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function deleteUnbanAllJob(id: string): void {
  jobs.delete(id);
}

export function isUnbanAllCancelled(id: string): boolean {
  return jobs.get(id)?.cancelled ?? true;
}
