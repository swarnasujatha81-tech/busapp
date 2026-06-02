import type { Bus, Stop } from '@/types';

export function haversineKm(a: [number, number], b: [number, number]) {
  const r = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestStop(location: [number, number] | null, stops: Stop[]) {
  if (!location) return null;
  return stops
    .map((stop) => ({ stop, distance: haversineKm(location, [stop.latitude, stop.longitude]) }))
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

export function etaMinutes(bus: Bus, stop: Stop) {
  if (bus.latitude == null || bus.longitude == null) return null;
  const speed = Math.max(bus.speed || 18, 8);
  return Math.max(1, Math.round((haversineKm([bus.latitude, bus.longitude], [stop.latitude, stop.longitude]) / speed) * 60));
}

export function routeStopsForBus(bus: Pick<Bus, 'route_name'>, stops: Stop[]) {
  const words = bus.route_name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const matched = stops.filter((stop) => {
    const name = stop.name.toLowerCase();
    return words.some((word) => name.includes(word));
  });
  return matched.length >= 2 ? matched : stops.slice(0, 6);
}

export async function fetchRoadRoute(waypoints: Array<{ latitude: number; longitude: number }>) {
  if (waypoints.length < 2) return [];
  const coords = waypoints.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const route = json.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(route)) return [];
  return route.map(([longitude, latitude]: [number, number]) => ({ latitude, longitude }));
}
