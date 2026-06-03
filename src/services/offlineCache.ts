import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bus, Stop } from '@/types';

const BUS_CACHE_LIMIT = 300;
const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const keys = {
  buses: 'offline:buses',
  stops: 'offline:stops',
  route: (id: string) => `offline:route:${id}`,
  search: (query: string) => `offline:search:${query.toLowerCase().trim()}`
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function cacheBuses(buses: Bus[]) {
  const compact = buses
    .filter((bus) => bus.is_active || bus.updated_at)
    .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0))
    .slice(0, BUS_CACHE_LIMIT);
  await AsyncStorage.setItem(keys.buses, JSON.stringify(compact));
}

export async function getCachedBuses() {
  return readJson<Bus[]>(keys.buses, []);
}

export async function cacheStops(stops: Stop[]) {
  await AsyncStorage.setItem(keys.stops, JSON.stringify(stops));
}

export async function getCachedStops() {
  return readJson<Stop[]>(keys.stops, []);
}

export async function cacheRoute(busId: string, coords: Array<{ latitude: number; longitude: number }>) {
  await AsyncStorage.setItem(keys.route(busId), JSON.stringify({ coords, savedAt: Date.now() }));
}

export async function getCachedRoute(busId: string) {
  const cached = await readJson<{ coords: Array<{ latitude: number; longitude: number }>; savedAt: number } | null>(keys.route(busId), null);
  if (!cached) return [];
  if (Date.now() - cached.savedAt > ROUTE_CACHE_TTL_MS) return [];
  return cached.coords;
}

export async function saveSearch(query: string, result: unknown) {
  await AsyncStorage.setItem(keys.search(query), JSON.stringify({ result, savedAt: Date.now() }));
}

export async function getCachedSearch<T>(query: string) {
  const cached = await readJson<{ result: T; savedAt: number } | null>(keys.search(query), null);
  if (!cached || Date.now() - cached.savedAt > SEARCH_CACHE_TTL_MS) return null;
  return cached?.result || null;
}
