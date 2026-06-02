import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bus, Stop } from '@/types';

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
  await AsyncStorage.setItem(keys.buses, JSON.stringify(buses.slice(0, 80)));
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
  return cached.coords;
}

export async function saveSearch(query: string, result: unknown) {
  await AsyncStorage.setItem(keys.search(query), JSON.stringify({ result, savedAt: Date.now() }));
}

export async function getCachedSearch<T>(query: string) {
  const cached = await readJson<{ result: T; savedAt: number } | null>(keys.search(query), null);
  return cached?.result || null;
}
