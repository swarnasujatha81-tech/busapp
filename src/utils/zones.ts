const ZONE_PRECISION = 100;
const DEFAULT_CITY_CENTER: [number, number] = [17.385, 78.4867];

export function zoneIdForLocation(latitude: number, longitude: number) {
  const lat = Math.floor(latitude * ZONE_PRECISION);
  const lng = Math.floor(longitude * ZONE_PRECISION);
  return `${lat}_${lng}`;
}

export function nearbyZoneIds(location: [number, number] | null, radius = 1) {
  const [latitude, longitude] = location || DEFAULT_CITY_CENTER;
  const baseLat = Math.floor(latitude * ZONE_PRECISION);
  const baseLng = Math.floor(longitude * ZONE_PRECISION);
  const zones: string[] = [];
  for (let lat = baseLat - radius; lat <= baseLat + radius; lat += 1) {
    for (let lng = baseLng - radius; lng <= baseLng + radius; lng += 1) {
      zones.push(`${lat}_${lng}`);
    }
  }
  return zones;
}
