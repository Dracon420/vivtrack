export const cmToIn = (cm: number) => Math.round(cm / 2.54 * 10) / 10
export const inToCm = (inches: number) => Math.round(inches * 2.54)
export const cToF = (c: number) => Math.round(c * 9 / 5 + 32)
export const fToC = (f: number) => Math.round((f - 32) * 5 / 9)

export function displayDims(lwh: [number, number, number], unit: 'cm' | 'in'): string {
  if (unit === 'cm') return `${lwh[0]} × ${lwh[1]} × ${lwh[2]} cm`
  return `${cmToIn(lwh[0])} × ${cmToIn(lwh[1])} × ${cmToIn(lwh[2])} in`
}

export function displayTemp(c: number, unit: 'C' | 'F'): string {
  return unit === 'C' ? `${c}°C` : `${cToF(c)}°F`
}
