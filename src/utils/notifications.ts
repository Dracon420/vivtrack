export interface NotifiableTask {
  id: string
  animalName: string
  label: string
  dueAt: Date
  dueTime?: string
  done?: boolean
}

export function scheduleTaskNotifications(tasks: NotifiableTask[], leadMinutes: number) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const now = Date.now()
  const leadMs = leadMinutes * 60 * 1000

  for (const task of tasks) {
    if (task.done) continue

    // Compute the effective due timestamp — use dueTime if the task has one
    let dueMs = task.dueAt.getTime()
    if (task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number)
      const d = new Date(task.dueAt)
      d.setHours(h, m, 0, 0)
      dueMs = d.getTime()
    }

    const notifyAt = dueMs - leadMs
    const delay = notifyAt - now

    // Only schedule within the next 24 hours to avoid runaway timers
    if (delay < 0 || delay > 24 * 60 * 60 * 1000) continue

    setTimeout(() => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const leadText =
        leadMinutes === 0 ? 'right now'
        : leadMinutes < 60 ? `in ${leadMinutes} min`
        : leadMinutes === 60 ? 'in 1 hour'
        : leadMinutes === 120 ? 'in 2 hours'
        : 'tomorrow'

      new Notification(`${task.animalName} — ${task.label}`, {
        body: `Due ${leadText}`,
        icon: '/icons/icon-192.png',
        tag: `vivtrack-${task.id}`,
        requireInteraction: false,
      })
    }, delay)
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.requestPermission()
}

export function currentPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}
