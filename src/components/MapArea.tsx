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

const MAX_VISIBLE_BUSES = 120;
type BusMarkerZoom = 'sm' | 'md' | 'lg';
type CrowdDotTone = 'green' | 'orange' | 'yellow' | 'red';

const busMarkerImages: Record<BusMarkerZoom, Record<BusType, number>> = {
  sm: {
    ordinary: require('../../assets/markers/bus-ordinary-sm.png'),
    metro_express: require('../../assets/markers/bus-metro-express-sm.png'),
    metro_deluxe: require('../../assets/markers/bus-metro-deluxe-sm.png'),
    ac_bus: require('../../assets/markers/bus-ac-sm.png'),
    electric: require('../../assets/markers/bus-electric-sm.png')
  },
  md: {
    ordinary: require('../../assets/markers/bus-ordinary-md.png'),
    metro_express: require('../../assets/markers/bus-metro-express-md.png'),
    metro_deluxe: require('../../assets/markers/bus-metro-deluxe-md.png'),
    ac_bus: require('../../assets/markers/bus-ac-md.png'),
    electric: require('../../assets/markers/bus-electric-md.png')
  },
  lg: {
    ordinary: require('../../assets/markers/bus-ordinary-lg.png'),
    metro_express: require('../../assets/markers/bus-metro-express-lg.png'),
    metro_deluxe: require('../../assets/markers/bus-metro-deluxe-lg.png'),
    ac_bus: require('../../assets/markers/bus-ac-lg.png'),
    electric: require('../../assets/markers/bus-electric-lg.png')
  }
};

const busCrowdMarkerImages: Record<BusMarkerZoom, Record<BusType, Record<CrowdDotTone, number>>> = {
  sm: {
    ordinary: {
      green: require('../../assets/markers/bus-ordinary-sm-crowd-green.png'),
      orange: require('../../assets/markers/bus-ordinary-sm-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ordinary-sm-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ordinary-sm-crowd-red.png')
    },
    metro_express: {
      green: require('../../assets/markers/bus-metro-express-sm-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-express-sm-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-express-sm-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-express-sm-crowd-red.png')
    },
    metro_deluxe: {
      green: require('../../assets/markers/bus-metro-deluxe-sm-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-deluxe-sm-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-deluxe-sm-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-deluxe-sm-crowd-red.png')
    },
    ac_bus: {
      green: require('../../assets/markers/bus-ac-sm-crowd-green.png'),
      orange: require('../../assets/markers/bus-ac-sm-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ac-sm-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ac-sm-crowd-red.png')
    },
    electric: {
      green: require('../../assets/markers/bus-electric-sm-crowd-green.png'),
      orange: require('../../assets/markers/bus-electric-sm-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-electric-sm-crowd-yellow.png'),
      red: require('../../assets/markers/bus-electric-sm-crowd-red.png')
    }
  },
  md: {
    ordinary: {
      green: require('../../assets/markers/bus-ordinary-md-crowd-green.png'),
      orange: require('../../assets/markers/bus-ordinary-md-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ordinary-md-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ordinary-md-crowd-red.png')
    },
    metro_express: {
      green: require('../../assets/markers/bus-metro-express-md-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-express-md-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-express-md-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-express-md-crowd-red.png')
    },
    metro_deluxe: {
      green: require('../../assets/markers/bus-metro-deluxe-md-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-deluxe-md-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-deluxe-md-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-deluxe-md-crowd-red.png')
    },
    ac_bus: {
      green: require('../../assets/markers/bus-ac-md-crowd-green.png'),
      orange: require('../../assets/markers/bus-ac-md-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ac-md-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ac-md-crowd-red.png')
    },
    electric: {
      green: require('../../assets/markers/bus-electric-md-crowd-green.png'),
      orange: require('../../assets/markers/bus-electric-md-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-electric-md-crowd-yellow.png'),
      red: require('../../assets/markers/bus-electric-md-crowd-red.png')
    }
  },
  lg: {
    ordinary: {
      green: require('../../assets/markers/bus-ordinary-lg-crowd-green.png'),
      orange: require('../../assets/markers/bus-ordinary-lg-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ordinary-lg-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ordinary-lg-crowd-red.png')
    },
    metro_express: {
      green: require('../../assets/markers/bus-metro-express-lg-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-express-lg-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-express-lg-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-express-lg-crowd-red.png')
    },
    metro_deluxe: {
      green: require('../../assets/markers/bus-metro-deluxe-lg-crowd-green.png'),
      orange: require('../../assets/markers/bus-metro-deluxe-lg-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-metro-deluxe-lg-crowd-yellow.png'),
      red: require('../../assets/markers/bus-metro-deluxe-lg-crowd-red.png')
    },
    ac_bus: {
      green: require('../../assets/markers/bus-ac-lg-crowd-green.png'),
      orange: require('../../assets/markers/bus-ac-lg-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-ac-lg-crowd-yellow.png'),
      red: require('../../assets/markers/bus-ac-lg-crowd-red.png')
    },
    electric: {
      green: require('../../assets/markers/bus-electric-lg-crowd-green.png'),
      orange: require('../../assets/markers/bus-electric-lg-crowd-orange.png'),
      yellow: require('../../assets/markers/bus-electric-lg-crowd-yellow.png'),
      red: require('../../assets/markers/bus-electric-lg-crowd-red.png')
    }
  }
};

function busMarkerZoom(latitudeDelta: number): BusMarkerZoom {
  if (latitudeDelta <= 0.08) return 'lg';
  if (latitudeDelta <= 0.22) return 'md';
  return 'sm';
}

function crowdDotTone(passengerCount: number): CrowdDotTone {
  if (passengerCount > 40) return 'red';
  if (passengerCount < 25) return 'green';
  if (passengerCount < 30) return 'orange';
  return 'yellow';
}

function distanceToRegion(
  item: { latitude?: number; longitude?: number },
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
) {
  if (item.latitude == null || item.longitude == null) return Number.MAX_SAFE_INTEGER;
  return Math.abs(item.latitude - region.latitude) + Math.abs(item.longitude - region.longitude);
}

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
  const [displayPositions, setDisplayPositions] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const mapRef = useRef<any>(null);
  const [visibleRegion, setVisibleRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const regionUpdateRef = useRef(0);

  useEffect(() => {
    const regionForSort = visibleRegion || {
      latitude: focusCoordinate?.[0] || 17.385,
      longitude: focusCoordinate?.[1] || 78.4867,
      latitudeDelta: 0.14,
      longitudeDelta: 0.14
    };
    const targets = visibleBuses
      .filter((bus) => bus.latitude != null && bus.longitude != null)
      .sort((a, b) => distanceToRegion(a, regionForSort) - distanceToRegion(b, regionForSort))
      .slice(0, MAX_VISIBLE_BUSES);
    if (!targets.length) {
      setDisplayPositions({});
      return;
    }

    const startPositions: Record<string, { latitude: number; longitude: number }> = {};
    const targetPositions: Record<string, { latitude: number; longitude: number }> = {};
    targets.forEach((bus) => {
      const target = { latitude: bus.latitude!, longitude: bus.longitude! };
      startPositions[bus.id] = displayPositions[bus.id] || target;
      targetPositions[bus.id] = target;
    });

    let frame = 0;
    const totalFrames = 10;
    const timer = setInterval(() => {
      frame += 1;
      const t = Math.min(1, frame / totalFrames);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayPositions(() => {
        const next: Record<string, { latitude: number; longitude: number }> = {};
        Object.entries(targetPositions).forEach(([id, target]) => {
          const start = startPositions[id] || target;
          next[id] = {
            latitude: start.latitude + (target.latitude - start.latitude) * eased,
            longitude: start.longitude + (target.longitude - start.longitude) * eased
          };
        });
        return next;
      });
      if (frame >= totalFrames) clearInterval(timer);
    }, 250);

    return () => clearInterval(timer);
  }, [visibleBuses.map((bus) => `${bus.id}:${bus.latitude}:${bus.longitude}:${bus.updated_at}`).join('|'), visibleRegion?.latitude, visibleRegion?.longitude]);

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
    const region = {
      latitude: focusCoordinate?.[0] || 17.385,
      longitude: focusCoordinate?.[1] || 78.4867,
      latitudeDelta: 0.14,
      longitudeDelta: 0.14
    };

    const currentRegion = visibleRegion || region;
    const mapBuses = visibleBuses
      .filter((bus) => bus.latitude != null && bus.longitude != null)
      .sort((a, b) => distanceToRegion(a, currentRegion) - distanceToRegion(b, currentRegion))
      .slice(0, MAX_VISIBLE_BUSES);
    const markerZoom = busMarkerZoom(currentRegion.latitudeDelta);
    return (
      <View style={styles.map}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={false}
          mapType={mapTheme}
          moveOnMarkerPress={false}
          onRegionChangeComplete={(nextRegion: typeof currentRegion) => {
            const now = Date.now();
            if (now - regionUpdateRef.current < 350) return;
            regionUpdateRef.current = now;
            setVisibleRegion(nextRegion);
          }}
        >
          {userLocation ? (
            <Marker coordinate={{ latitude: userLocation[0], longitude: userLocation[1] }} title="Your location" anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges zIndex={30}>
              <View style={styles.userMarkerOuter}>
                <View style={styles.userMarkerMid}>
                  <View style={styles.userMarkerCore} />
                </View>
              </View>
            </Marker>
          ) : null}
          {mapBuses.map((bus) => {
            const displayPosition = displayPositions[bus.id] || { latitude: bus.latitude!, longitude: bus.longitude! };
            const tone = crowdDotTone(bus.passenger_count);
            return (
              <Marker
                key={`${bus.id}-${tone}`}
                coordinate={displayPosition}
                title={`${bus.bus_number} - ${bus.route_name}`}
                description={`${bus.passenger_count} passengers - ${bus.speed || 0} km/h`}
                onPress={() => onSelectBus(bus)}
                onCalloutPress={() => onLongPressBus?.(bus)}
                anchor={{ x: 0.5, y: 0.82 }}
                image={busCrowdMarkerImages[markerZoom][bus.bus_type]?.[tone] || busMarkerImages[markerZoom][bus.bus_type] || busMarkerImages[markerZoom].ordinary}
                zIndex={20}
              />
            );
          })}
          {routeCoordinates.length ? <Polyline coordinates={routeCoordinates} strokeColor={colors.cyan} strokeWidth={5} /> : null}
        </MapView>
      </View>
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

const styles = StyleSheet.create({
  map: { flex: 1, position: 'relative' },
  userMarkerOuter: { width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(147,197,253,0.55)' },
  userMarkerMid: { width: 23, height: 23, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#eff6ff' },
  userMarkerCore: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#dbeafe' },
  webMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: '#0b1524' },
  mapTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  mapSub: { color: colors.muted, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 },
  busChip: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  busChipText: { color: colors.text, fontWeight: '900' },
  mapHint: { color: colors.muted, marginTop: 16, fontSize: 12, textAlign: 'center' }
});
