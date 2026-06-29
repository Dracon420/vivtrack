import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:demonfreaked@gmail.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const WINDOW_MS = 5 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────────────────────

function nextDueDateStr(anchorIso: string, intervalDays: number): string {
  const ms = new Date(anchorIso).getTime() + intervalDays * 86_400_000
  return new Date(ms).toISOString().split('T')[0]
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Convert a local "YYYY-MM-DD"+"HH:mm" to a UTC ms timestamp using tz offset
// tzOffset = getTimezoneOffset() = minutes to ADD to local to get UTC
function localToUTCMs(dateStr: string, timeStr: string, tzOffset: number): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  // Date.UTC treats inputs as UTC; then we shift by tzOffset to get actual UTC
  return Date.UTC(y, mo - 1, d, hh, mm, 0) + tzOffset * 60_000
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth, timezone_offset')

  if (!subs?.length) return new Response('no subscriptions', { status: 200 })

  const now = Date.now()
  const windowEnd = now + WINDOW_MS
  const userIds = [...new Set(subs.map((s: any) => s.user_id as string))]

  let sent = 0
  const errors: string[] = []

  for (const userId of userIds) {
    const userSubs = subs.filter((s: any) => s.user_id === userId)
    const tzOffset: number = userSubs[0]?.timezone_offset ?? 0

    // User preferences (for lead minutes)
    const { data: prefRow } = await supabase
      .from('user_preferences')
      .select('data')
      .eq('user_id', userId)
      .single()

    const leadMs = ((prefRow?.data as any)?.notificationLeadMinutes ?? 60) * 60_000

    // Animal data
    const [animalsRes, schedulesRes, eventsRes] = await Promise.all([
      supabase.from('animals').select('data').eq('user_id', userId),
      supabase.from('animal_care_schedules').select('data').eq('user_id', userId),
      supabase.from('care_events').select('data').eq('user_id', userId),
    ])

    const animals = ((animalsRes.data ?? []) as any[])
      .map(r => r.data)
      .filter(a => a.status === 'active' || a.status === 'quarantine')
    const schedules = ((schedulesRes.data ?? []) as any[]).map(r => r.data)
    const allEvents = ((eventsRes.data ?? []) as any[]).map(r => r.data)

    for (const animal of animals) {
      const sched = schedules.find((s: any) => s.animalId === animal.id)
      if (!sched) continue

      const animalEvents = allEvents.filter((e: any) => e.animalId === animal.id)
      const lastOf = (type: string): string | undefined =>
        animalEvents
          .filter((e: any) => e.type === type)
          .sort((a: any, b: any) => b.occurredAt.localeCompare(a.occurredAt))[0]
          ?.occurredAt

      const checkTask = (
        type: string,
        label: string,
        intervalDays: number,
        anchor: string | undefined,
        dueTime: string | undefined
      ) => {
        if (!dueTime || !anchor) return
        const dueDateStr = nextDueDateStr(anchor, intervalDays)
        const dueUTC = localToUTCMs(dueDateStr, dueTime, tzOffset)
        const notifyAt = dueUTC - leadMs
        if (notifyAt >= now && notifyAt < windowEnd) {
          notificationsQueue.push({
            title: `${animal.name} — ${label}`,
            body: `Due at ${fmt12(dueTime)}`,
            tag: `vivtrack-${animal.id}-${type}-${dueDateStr}`,
          })
        }
      }

      const notificationsQueue: { title: string; body: string; tag: string }[] = []

      const start = sched.scheduleStartDate

      if (sched.feedingIntervalDays)
        checkTask('feeding', 'Feeding', sched.feedingIntervalDays, lastOf('feeding') ?? start, sched.feedingTime)

      if (sched.mistingIntervalHours)
        checkTask('misting', 'Misting', sched.mistingIntervalHours / 24, lastOf('misting') ?? start, sched.mistingTime)

      if (sched.waterChangeIntervalDays)
        checkTask('watering', 'Water Change', sched.waterChangeIntervalDays, lastOf('watering') ?? start, sched.wateringTime)

      if (sched.substrateCleanIntervalDays) {
        const cleanLast = animalEvents
          .filter((e: any) => e.type === 'substrate_clean' || e.type === 'full_clean')
          .sort((a: any, b: any) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt ?? start
        checkTask('substrate_clean', 'Substrate Clean', sched.substrateCleanIntervalDays, cleanLast, sched.substrateCleanTime)
      }

      if (sched.substrateChangeIntervalDays)
        checkTask('substrate_change', 'Substrate Change', sched.substrateChangeIntervalDays, lastOf('substrate_change') ?? start, sched.substrateChangeTime)

      // Custom tasks
      if (Array.isArray(sched.customTasks)) {
        for (const ct of sched.customTasks) {
          if (!ct.dueTime || !ct.startDate) continue
          let intervalDays = ct.intervalValue
          if (ct.intervalUnit === 'hours') intervalDays = ct.intervalValue / 24
          if (ct.intervalUnit === 'weeks') intervalDays = ct.intervalValue * 7
          if (ct.intervalUnit === 'months') intervalDays = ct.intervalValue * 30
          checkTask(`custom-${ct.id}`, ct.name, intervalDays, ct.startDate, ct.dueTime)
        }
      }

      // Send all notifications for this animal
      for (const notif of notificationsQueue) {
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ ...notif, url: '/tasks' })
            )
            sent++
          } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              // Expired subscription — clean up
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
            errors.push(`${sub.endpoint.slice(-20)}: ${err?.message}`)
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ sent, errors: errors.length, details: errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
