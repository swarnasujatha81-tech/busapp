import { initializeApp } from 'firebase/app';
import { get, getDatabase, limitToLast, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import type { Bus, Route } from '@/types';
import { defaultRoutes } from '@/data/routes';
import { nearbyZoneIds, zoneIdForLocation } from '@/utils/zones';

export const firebaseConfig = {
  apiKey: 'AIzaSyAkpSCBGsGQ5-dsUpoVh85oLpO_OlMNIKA',
  authDomain: 'choose-it-real.firebaseapp.com',
  databaseURL: 'https://choose-it-real-default-rtdb.firebaseio.com',
  projectId: 'choose-it-real',
  storageBucket: 'choose-it-real.firebasestorage.app',
  messagingSenderId: '615755423062',
  appId: '1:615755423062:android:c8bd18a0bd4849c2078af7'
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const busesRef = ref(db, 'buses');
const routesRef = ref(db, 'routes');
const publicLiveRoot = 'publicLive/hyderabad';
const DEFAULT_LIVE_BUS_LIMIT = 500;

function mapRecord<T extends { id: string }>(value: unknown): T[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, Omit<T, 'id'>>).map(([id, data]) => ({ id, ...data }) as T);
}

export function listenBuses(callback: (buses: Bus[]) => void) {
  return onValue(busesRef, (snapshot) => {
    const buses = mapRecord<Bus>(snapshot.val()).sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0));
    callback(buses);
  });
}

export function listenRecentBuses(callback: (buses: Bus[]) => void, limit = DEFAULT_LIVE_BUS_LIMIT) {
  return onValue(query(busesRef, orderByChild('updated_at'), limitToLast(limit)), (snapshot) => {
    const buses = mapRecord<Bus>(snapshot.val()).sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0));
    callback(buses);
  });
}

export function listenNearbyBuses(location: [number, number] | null, callback: (buses: Bus[]) => void) {
  const zones = nearbyZoneIds(location);
  const byZone = new Map<string, Bus[]>();
  const unsubscribers = zones.map((zoneId) =>
    onValue(ref(db, `${publicLiveRoot}/${zoneId}`), (snapshot) => {
      byZone.set(zoneId, mapRecord<Bus>(snapshot.val()));
      const buses = Array.from(byZone.values())
        .flat()
        .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0));
      callback(buses);
    })
  );
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function listenRoutes(callback: (routes: Route[]) => void) {
  return onValue(routesRef, (snapshot) => {
    const routes = mapRecord<Route>(snapshot.val());
    callback(routes.length ? routes : defaultRoutes);
  });
}

export async function seedRoutesIfEmpty() {
  const snapshot = await get(routesRef);
  if (!snapshot.exists()) {
    await Promise.all(defaultRoutes.map((route) => set(ref(db, `routes/${route.id}`), route)));
  }
}

export async function createBus(bus: Omit<Bus, 'id'>) {
  const created = push(busesRef);
  const now = Date.now();
  const payload = { ...bus, created_at: now, updated_at: now };
  await set(created, payload);
  return { id: created.key as string, ...payload };
}

export async function updateBus(id: string, patch: Partial<Bus>) {
  const now = Date.now();
  const updates: Record<string, unknown> = { [`buses/${id}/updated_at`]: now };
  Object.entries(patch).forEach(([key, value]) => {
    updates[`buses/${id}/${key}`] = value ?? null;
  });

  const shouldMirrorPublic =
    patch.latitude != null ||
    patch.longitude != null ||
    patch.passenger_count != null ||
    patch.crowd_level != null ||
    patch.is_active === false;
  if (!shouldMirrorPublic) {
    await update(ref(db), updates);
    return;
  }

  const busSnapshot = await get(ref(db, `buses/${id}`));
  const current = busSnapshot.exists() ? ({ id, ...busSnapshot.val() } as Bus) : null;
  const next = { ...(current || {}), ...patch, id, updated_at: now } as Bus;
  const currentZoneId =
    current?.zone_id || (current?.latitude != null && current.longitude != null ? zoneIdForLocation(current.latitude, current.longitude) : null);

  if (patch.is_active === false && currentZoneId) {
    updates[`${publicLiveRoot}/${currentZoneId}/${id}`] = null;
  } else if (next.latitude != null && next.longitude != null && next.live_source === 'driver_app') {
    const nextZoneId = zoneIdForLocation(next.latitude, next.longitude);
    const publicPayload = { ...next, zone_id: nextZoneId };
    updates[`buses/${id}/zone_id`] = nextZoneId;
    if (currentZoneId && currentZoneId !== nextZoneId) updates[`${publicLiveRoot}/${currentZoneId}/${id}`] = null;
    updates[`${publicLiveRoot}/${nextZoneId}/${id}`] = publicPayload;
  }

  await update(ref(db), updates);
}

export async function deleteBus(id: string) {
  const snapshot = await get(ref(db, `buses/${id}`));
  const current = snapshot.exists() ? ({ id, ...snapshot.val() } as Bus) : null;
  const updates: Record<string, null> = { [`buses/${id}`]: null };
  if (current?.zone_id) updates[`${publicLiveRoot}/${current.zone_id}/${id}`] = null;
  await update(ref(db), updates);
}

export async function deleteBusesByNumber(busNumber: string, exceptId?: string) {
  const snapshot = await get(busesRef);
  const buses = mapRecord<Bus>(snapshot.val());
  const matches = buses.filter((bus) => bus.bus_number === busNumber && bus.id !== exceptId);
  await Promise.all(matches.map((bus) => deleteBus(bus.id)));
}
