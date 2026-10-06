// Node-free on purpose: the Claude Code hooks module (src/mod/register.ts) imports this.
import {
  CUP_THRESHOLD_LITERS,
  GAL_PER_LITER,
  GAL_THRESHOLD_LITERS,
  LITERS_PER_ALMOND,
  TSP_PER_CUP,
  TSP_PER_LITER,
} from '../config/constants.js';

export function formatAlmonds(n: number): string {
  if (n < 1) return n.toFixed(1);
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}

function formatDay(dayLiters: number): string {
  if (dayLiters < CUP_THRESHOLD_LITERS) {
    return `${(dayLiters * TSP_PER_LITER).toFixed(1)} tsp`;
  }
  if (dayLiters < GAL_THRESHOLD_LITERS) {
    return `${((dayLiters * TSP_PER_LITER) / TSP_PER_CUP).toFixed(1)} cups`;
  }
  return `${(dayLiters * GAL_PER_LITER).toFixed(1)} gal`;
}

export function formatStatusLine(dayLiters: number, weekLiters: number): string {
  const dayDisplay = formatDay(dayLiters);
  const weekGal = (weekLiters * GAL_PER_LITER).toFixed(1);
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `🥜 Day: ${dayDisplay} = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`;
}

export function formatStatusLineShort(dayLiters: number, weekLiters: number): string {
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `D ${dayAlmonds}🥜 | W ${weekAlmonds}🥜`;
}
