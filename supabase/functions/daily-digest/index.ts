import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://vivtrack.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextDueDate(anchor: string, intervalDays: number): Date {
  const d = new Date(anchor)
  d.setDate(d.getDate() + Math.ceil(intervalDays))
  return d
}

function toIntervalDays(value: number, unit: string): number {
  if (unit === 'hours')  return value / 24
  if (unit === 'weeks')  return value * 7
  if (unit === 'months') return value * 30
  return value
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

const now = new Date()
const today = startOfDay(now)
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

function isOverdue(d: Date): boolean  { return startOfDay(d) < today }
function isToday(d: Date): boolean    { return isSameDay(d, today) }
function isTomorrow(d: Date): boolean { return isSameDay(d, tomorrow) }

const EMOJI: Record<string, string> = {
  feeding: '🍖', watering: '🫙', misting: '💧',
  substrate_clean: '🧹', substrate_change: '🪨', custom_task: '✅',
}

// ── Task computation ──────────────────────────────────────────────────────────

interface Task { animalName: string; type: string; label: string; dueAt: Date }

function computeTasks(
  animals: any[],
  schedules: any[],
  events: any[],
): { overdue: Task[]; today: Task[]; tomorrow: Task[] } {
  const overdue: Task[] = []
  const todayList: Task[] = []
  const tomorrowList: Task[] = []

  for (const animal of animals) {
    if (animal.status !== 'active') continue
    const schedule = schedules.find((s: any) => s.animalId === animal.id)
    if (!schedule) continue

    const animalEvents: any[] = events.filter((e: any) => e.animalId === animal.id)
    const lastOf = (type: string) =>
      animalEvents.filter(e => e.type === type).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
    const doneToday = (type: string) =>
      animalEvents.some(e => e.type === type && isSameDay(new Date(e.occurredAt), today))

    const intervals: { type: string; label: string; intervalDays: number; anchor: string | undefined }[] = []
    const start = schedule.scheduleStartDate

    if (schedule.feedingIntervalDays)
      intervals.push({ type: 'feeding', label: 'Feeding', intervalDays: schedule.feedingIntervalDays, anchor: lastOf('feeding')?.occurredAt ?? start })
    if (schedule.substrateCleanIntervalDays)
      intervals.push({ type: 'substrate_clean', label: 'Substrate Clean', intervalDays: schedule.substrateCleanIntervalDays,
        anchor: animalEvents.filter(e => e.type === 'substrate_clean' || e.type === 'full_clean').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt ?? start })
    if (schedule.substrateChangeIntervalDays)
      intervals.push({ type: 'substrate_change', label: 'Substrate Change', intervalDays: schedule.substrateChangeIntervalDays, anchor: lastOf('substrate_change')?.occurredAt ?? start })
    if (schedule.mistingIntervalHours)
      intervals.push({ type: 'misting', label: 'Misting', intervalDays: schedule.mistingIntervalHours / 24, anchor: lastOf('misting')?.occurredAt ?? start })
    if (schedule.waterChangeIntervalDays)
      intervals.push({ type: 'watering', label: 'Water Change', intervalDays: schedule.waterChangeIntervalDays, anchor: lastOf('watering')?.occurredAt ?? start })

    for (const { type, label, intervalDays, anchor } of intervals) {
      if (!anchor || doneToday(type)) continue
      const due = nextDueDate(anchor, intervalDays)
      const task = { animalName: animal.name, type, label, dueAt: due }
      if (isOverdue(due))   overdue.push(task)
      else if (isToday(due))    todayList.push(task)
      else if (isTomorrow(due)) tomorrowList.push(task)
    }

    for (const ct of schedule.customTasks ?? []) {
      const intervalDays = toIntervalDays(ct.intervalValue, ct.intervalUnit)
      const last = animalEvents.filter(e => e.type === 'custom_task' && e.customTaskId === ct.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
      const anchor = last?.occurredAt ?? ct.startDate
      if (!anchor) continue
      if (animalEvents.some(e => e.type === 'custom_task' && e.customTaskId === ct.id && isSameDay(new Date(e.occurredAt), today))) continue
      const due = nextDueDate(anchor, intervalDays)
      const task = { animalName: animal.name, type: 'custom_task', label: ct.name, dueAt: due }
      if (isOverdue(due))   overdue.push(task)
      else if (isToday(due))    todayList.push(task)
      else if (isTomorrow(due)) tomorrowList.push(task)
    }
  }

  return { overdue, today: todayList, tomorrow: tomorrowList }
}

// ── Email template ────────────────────────────────────────────────────────────

function taskRow(t: Task): string {
  const emoji = EMOJI[t.type] ?? '📋'
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <span style="font-size:18px;margin-right:10px;vertical-align:middle;">${emoji}</span>
      <strong style="color:#111827;font-size:14px;">${t.animalName}</strong>
      <span style="color:#6b7280;font-size:14px;"> — ${t.label}</span>
    </td>
  </tr>`
}

function section(title: string, color: string, tasks: Task[]): string {
  if (tasks.length === 0) return ''
  return `<div style="margin-bottom:28px;">
    <div style="border-left:4px solid ${color};padding:2px 0 2px 14px;margin-bottom:14px;">
      <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.08em;">${title} (${tasks.length})</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tbody>${tasks.map(taskRow).join('')}</tbody>
    </table>
  </div>`
}

function buildEmail(tasks: { overdue: Task[]; today: Task[]; tomorrow: Task[] }, userEmail: string): { html: string; text: string; subject: string } {
  const total = tasks.overdue.length + tasks.today.length
  const subject = tasks.overdue.length > 0
    ? `🚨 ${tasks.overdue.length} overdue + ${tasks.today.length} due today — VivTrack`
    : `📋 ${tasks.today.length} task${tasks.today.length !== 1 ? 's' : ''} due today — VivTrack`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td style="background:#111827;border-radius:16px 16px 0 0;padding:28px 32px;">
          <span style="color:#10b981;font-size:22px;font-weight:800;letter-spacing:-0.5px;">VivTrack</span>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">
            Daily care summary &nbsp;·&nbsp; ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 32px 24px;">
          ${section('Overdue', '#ef4444', tasks.overdue)}
          ${section('Due Today', '#f59e0b', tasks.today)}
          ${section('Due Tomorrow', '#10b981', tasks.tomorrow)}

          ${total === 0 ? '<p style="color:#6b7280;font-size:14px;text-align:center;">No urgent tasks right now — great job staying on top of things!</p>' : ''}

          <div style="text-align:center;padding-top:20px;border-top:1px solid #f3f4f6;margin-top:8px;">
            <a href="${APP_URL}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;">Open VivTrack</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            Sent to ${userEmail} &nbsp;·&nbsp;
            <a href="${APP_URL}/settings" style="color:#6b7280;text-decoration:none;">Manage preferences</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const lines: string[] = [`VivTrack — ${subject}`, '']
  if (tasks.overdue.length)   { lines.push('OVERDUE'); tasks.overdue.forEach(t => lines.push(`  ${t.animalName} — ${t.label}`)); lines.push('') }
  if (tasks.today.length)     { lines.push('DUE TODAY'); tasks.today.forEach(t => lines.push(`  ${t.animalName} — ${t.label}`)); lines.push('') }
  if (tasks.tomorrow.length)  { lines.push('DUE TOMORROW'); tasks.tomorrow.forEach(t => lines.push(`  ${t.animalName} — ${t.label}`)) }
  lines.push('', `Open VivTrack: ${APP_URL}`)

  return { html, text: lines.join('\n'), subject }
}

// ── Brevo send ────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'VivTrack', email: BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo error ${res.status}: ${body}`)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // Get all users with email digest enabled
    const { data: allPrefs, error: prefErr } = await supabase
      .from('user_preferences')
      .select('user_id, data')
    if (prefErr) throw prefErr

    const enabledPrefs = (allPrefs ?? []).filter((p: any) => p.data?.emailDigestEnabled === true)

    const results: { email: string; sent: boolean; error?: string }[] = []

    for (const pref of enabledPrefs) {
      try {
        // Resolve user email from auth
        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(pref.user_id)
        if (userErr || !user?.email) continue

        // Fetch user data
        const [animalsRes, schedulesRes, eventsRes] = await Promise.all([
          supabase.from('animals').select('data').eq('user_id', pref.user_id),
          supabase.from('animal_care_schedules').select('data').eq('user_id', pref.user_id),
          supabase.from('care_events').select('data').eq('user_id', pref.user_id)
            .order('occurred_at', { ascending: false }).limit(1000),
        ])

        const animals   = (animalsRes.data ?? []).map((r: any) => r.data)
        const schedules = (schedulesRes.data ?? []).map((r: any) => r.data)
        const events    = (eventsRes.data ?? []).map((r: any) => r.data)

        const tasks = computeTasks(animals, schedules, events)

        // Only send if there's something to report
        const hasContent = tasks.overdue.length + tasks.today.length + tasks.tomorrow.length > 0
        if (!hasContent) {
          results.push({ email: user.email, sent: false })
          continue
        }

        const { html, text, subject } = buildEmail(tasks, user.email)
        await sendEmail(user.email, subject, html, text)
        results.push({ email: user.email, sent: true })
      } catch (err: any) {
        results.push({ email: pref.user_id, sent: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
