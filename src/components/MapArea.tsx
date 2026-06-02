import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Bus, BusType, CrowdLevel, Stop } from '@/types';
import { colors, crowdMeta } from '@/theme';

type Props = {
  buses: Bus[];
  stops: Stop[];
  userLocation: [number, number] | null;
  selectedBus?: Bus | null;
  focusCoordinate?: [number, number] | null;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  crowdFilter?: CrowdLevel | 'all';
  mapTheme?: 'standard' | 'satellite' | 'terrain';
  focusUserToken?: number;
  onSelectBus: (bus: Bus) => void;
  onLongPressBus?: (bus: Bus) => void;
};

let NativeMap: any = null;
if (Platform.OS !== 'web') {
  NativeMap = require('react-native-maps');
}

const tileTemplates = {
  standard: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  terrain: 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'
};

const MAX_VISIBLE_STOPS = 70;
const STOP_VISIBILITY_DELTA = 0.32;

export function MapArea({
  buses,
  stops,
  userLocation,
  selectedBus,
  focusCoordinate,
  routeCoordinates = [],
  crowdFilter = 'all',
  mapTheme = 'standard',
  focusUserToken = 0,
  onSelectBus,
  onLongPressBus
}: Props) {
  const visibleBuses = useMemo(
    () => (crowdFilter === 'all' ? buses : buses.filter((bus) => bus.crowd_level === crowdFilter)),
    [buses, crowdFilter]
  );
  const mapRef = useRef<any>(null);
  const [stopMarkersReady, setStopMarkersReady] = useState(true);
  const [busMarkersReady, setBusMarkersReady] = useState(true);
  const [visibleRegion, setVisibleRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  useEffect(() => {
    setStopMarkersReady(true);
    const timer = setTimeout(() => setStopMarkersReady(false), 1800);
    return () => clearTimeout(timer);
  }, [visibleRegion?.latitude, visibleRegion?.longitude, visibleRegion?.latitudeDelta, visibleRegion?.longitudeDelta]);

  useEffect(() => {
    setBusMarkersReady(true);
    const timer = setTimeout(() => setBusMarkersReady(false), 1800);
    return () => clearTimeout(timer);
  }, [visibleBuses.length, visibleBuses.map((bus) => `${bus.id}:${bus.latitude}:${bus.longitude}:${bus.bus_type}`).join('|')]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: userLocation[0],
        longitude: userLocation[1],
        latitudeDelta: 0.012,
        longitudeDelta: 0.012
      },
      900
    );
  }, [focusUserToken, userLocation]);

  useEffect(() => {
    if (userLocation || !focusCoordinate || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusCoordinate[0],
        longitude: focusCoordinate[1],
        latitudeDelta: 0.035,
        longitudeDelta: 0.035
      },
      800
    );
  }, [focusCoordinate, userLocation]);

  if (Platform.OS !== 'web' && NativeMap) {
    const MapView = NativeMap.default;
    const Marker = NativeMap.Marker;
    const Polyline = NativeMap.Polyline;
    const UrlTile = NativeMap.UrlTile;
    const region = {
      latitude: focusCoordinate?.[0] || 17.385,
      longitude: focusCoordinate?.[1] || 78.4867,
      latitudeDelta: 0.14,
      longitudeDelta: 0.14
    };

    const usesCustomTiles = mapTheme !== 'satellite';
    const currentRegion = visibleRegion || region;
    const shouldShowStops =
      currentRegion.latitudeDelta <= STOP_VISIBILITY_DELTA &&
      currentRegion.longitudeDelta <= STOP_VISIBILITY_DELTA;
    const visibleStops = shouldShowStops
      ? stops
          .filter((stop) => stop.roadMatched !== false)
          .filter((stop) => {
            const latRange = currentRegion.latitudeDelta * 0.9;
            const lngRange = currentRegion.longitudeDelta * 0.9;
            return (
              Math.abs(stop.latitude - currentRegion.latitude) <= latRange &&
              Math.abs(stop.longitude - currentRegion.longitude) <= lngRange
            );
          })
          .sort((a, b) => {
            const da = Math.abs(a.latitude - currentRegion.latitude) + Math.abs(a.longitude - currentRegion.longitude);
            const db = Math.abs(b.latitude - currentRegion.latitude) + Math.abs(b.longitude - currentRegion.longitude);
            return da - db;
          })
          .slice(0, MAX_VISIBLE_STOPS)
      : [];

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
        mapType={usesCustomTiles ? 'none' : 'satellite'}
        moveOnMarkerPress={false}
        onRegionChangeComplete={setVisibleRegion}
      >
        {mapTheme !== 'satellite' && UrlTile ? (
          <UrlTile
            urlTemplate={tileTemplates[mapTheme]}
            maximumZ={19}
            flipY={false}
            tileSize={256}
          />
        ) : null}
        {visibleStops.map((stop) => (
          <Marker key={stop.name} coordinate={stop} title={stop.name} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={stopMarkersReady} zIndex={5}>
            <PremiumStopMarker />
          </Marker>
        ))}
        {userLocation ? (
          <Marker coordinate={{ latitude: userLocation[0], longitude: userLocation[1] }} title="Your location" anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges zIndex={30}>
            <View style={styles.userMarkerOuter}>
              <View style={styles.userMarkerMid}>
                <View style={styles.userMarkerCore} />
              </View>
            </View>
          </Marker>
        ) : null}
        {visibleBuses.filter((b) => b.latitude != null && b.longitude != null).map((bus) => (
          <Marker
            key={bus.id}
            coordinate={{ latitude: bus.latitude!, longitude: bus.longitude! }}
            title={`${bus.bus_number} - ${bus.route_name}`}
            description={`${bus.passenger_count} passengers - ${bus.speed || 0} km/h`}
            onPress={() => onSelectBus(bus)}
            onCalloutPress={() => onLongPressBus?.(bus)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges
            zIndex={20}
          >
            <BusMarker passengerCount={bus.passenger_count || 0} crowdLevel={bus.crowd_level} busType={bus.bus_type} />
          </Marker>
        ))}
        {routeCoordinates.length ? <Polyline coordinates={routeCoordinates} strokeColor={colors.cyan} strokeWidth={5} /> : null}
      </MapView>
    );
  }

  return (
    <View style={styles.webMap}>
      <Text style={styles.mapTitle}>Hyderabad Live Fleet</Text>
      <Text style={styles.mapSub}>{visibleBuses.filter((b) => b.is_active).length} active buses - {stops.length} known stops</Text>
      <View style={styles.grid}>
        {visibleBuses.slice(0, 8).map((bus) => (
          <Pressable key={bus.id} onPress={() => onSelectBus(bus)} onLongPress={() => onLongPressBus?.(bus)} style={[styles.busChip, { borderColor: crowdMeta[bus.crowd_level].color }]}>
            <Text style={styles.busChipText}>
            {bus.bus_number}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.mapHint}>{selectedBus ? `Route preview: ${selectedBus.route_name}` : 'Long-press a bus for route preview.'}</Text>
    </View>
  );
}

const PremiumStopMarker = memo(function PremiumStopMarker() {
  return (
    <View style={styles.stopMarkerBox}>
      <View style={styles.stopPulse} />
      <View style={styles.stopCore}>
        <View style={styles.stopInner} />
      </View>
    </View>
  );
});

const BusMarker = memo(function BusMarker({ passengerCount, crowdLevel, busType }: { passengerCount: number; crowdLevel: CrowdLevel; busType: BusType }) {
  const paint = busTypePaint(busType);
  return (
    <View collapsable={false} style={styles.busMarker}>
      <View style={[styles.busBody, { backgroundColor: paint.body, borderColor: paint.border }]}>
        <View style={[styles.busTop, { backgroundColor: paint.top }]} />
        <Ionicons name="bus" size={20} color={colors.text} />
        <View style={styles.busGlass} />
        <Text style={styles.busMarkerCount}>{passengerCount}</Text>
      </View>
      <View style={[styles.busDot, { backgroundColor: crowdMeta[crowdLevel].color }]} />
    </View>
  );
});

function busTypePaint(type: BusType) {
  if (type === 'metro_express') return { body: '#2563eb', top: '#60a5fa', border: '#bfdbfe' };
  if (type === 'electric') return { body: '#16a34a', top: '#4ade80', border: '#bbf7d0' };
  if (type === 'ac_bus') return { body: '#b8860b', top: '#facc15', border: '#fef3c7' };
  if (type === 'metro_deluxe') return { body: '#14532d', top: '#22c55e', border: '#86efac' };
  return { body: '#dc2626', top: '#ef4444', border: '#fecaca' };
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  busMarker: { width: 36, height: 42, alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', backgroundColor: 'transparent' },
  busMarkerCount: { position: 'absolute', right: 1, top: 1, color: colors.text, backgroundColor: '#0f172a', borderRadius: 5, overflow: 'hidden', paddingHorizontal: 4, paddingVertical: 1, fontSize: 8, fontWeight: '900', borderWidth: 1, borderColor: '#334155' },
  busBody: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  busTop: { position: 'absolute', top: 0, left: 5, right: 5, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  busGlass: { position: 'absolute', top: 9, left: 8, right: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(219,234,254,0.75)' },
  busDot: { width: 8, height: 8, borderRadius: 999, borderWidth: 2, borderColor: colors.text, marginTop: 1 },
  stopMarkerBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stopPulse: { position: 'absolute', width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(248,113,113,0.45)' },
  stopCore: { width: 19, height: 19, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fecaca', shadowColor: '#ef4444', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 9 },
  stopInner: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#7f1d1d' },
  userMarkerOuter: { width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)' },
  userMarkerMid: { width: 23, height: 23, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#fff7ed' },
  userMarkerCore: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#78350f' },
  webMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: '#0b1524' },
  mapTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  mapSub: { color: colors.muted, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 },
  busChip: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  busChipText: { color: colors.text, fontWeight: '900' },
  mapHint: { color: colors.muted, marginTop: 16, fontSize: 12, textAlign: 'center' }
});
