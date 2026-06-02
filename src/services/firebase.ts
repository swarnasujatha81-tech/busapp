import { initializeApp } from 'firebase/app';
import { get, getDatabase, onValue, push, ref, remove, set, update } from 'firebase/database';
import type { Bus, Route } from '@/types';
import { defaultRoutes } from '@/data/routes';

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
  await update(ref(db, `buses/${id}`), { ...patch, updated_at: Date.now() });
}

export async function deleteBus(id: string) {
  await remove(ref(db, `buses/${id}`));
}
