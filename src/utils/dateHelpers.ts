import { formatDistanceToNow, format, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns'

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy')
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a')
}

export function daysAgo(dateStr: string): number {
  return differenceInDays(new Date(), new Date(dateStr))
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(new Date(dateStr), new Date())
}

export function isOverdue(dateStr: string): boolean {
  return isPast(new Date(dateStr))
}

export function isDueToday(dateStr: string): boolean {
  return isToday(new Date(dateStr))
}

export function isDueTomorrow(dateStr: string): boolean {
  return isTomorrow(new Date(dateStr))
}

export function nextDueDate(lastEventDate: string, intervalDays: number): Date {
  const last = new Date(lastEventDate)
  const next = new Date(last)
  next.setDate(next.getDate() + intervalDays)
  return next
}

export function urgencyLevel(dueDate: Date): 'overdue' | 'today' | 'soon' | 'ok' {
  const days = differenceInDays(dueDate, new Date())
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 2) return 'soon'
  return 'ok'
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
