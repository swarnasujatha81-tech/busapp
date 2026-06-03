import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MapArea } from '@/components/MapArea';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { listenNearbyBuses } from '@/services/firebase';
import { cacheBuses, cacheRoute, cacheStops, getCachedBuses, getCachedRoute, getCachedSearch, saveSearch } from '@/services/offlineCache';
import { planJourney, searchTransit, testLocalAi } from '@/services/localAi';
import { colors, crowdMeta } from '@/theme';
import type { Bus, CrowdLevel, Stop } from '@/types';
import { etaMinutes, fetchRoadRoute, nearestStop, routeStopsForBus } from '@/utils/geo';

export default function HomeScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [journey, setJourney] = useState<string[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [crowdFilter, setCrowdFilter] = useState<CrowdLevel | 'all'>('all');
  const [mapTheme, setMapTheme] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [arrivalNotified, setArrivalNotified] = useState<Record<string, boolean>>({});
  const [aiReady, setAiReady] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [focusUserToken, setFocusUserToken] = useState(0);
  const [locating, setLocating] = useState(false);
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCachedBuses().then((cached) => {
      if (cached.length) setBuses(cached);
    });
    cacheStops(hydStops).catch(() => {});
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  useEffect(() => {
    return listenNearbyBuses(userLocation, (next) => {
      setBuses(next);
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
      cacheTimerRef.current = setTimeout(() => cacheBuses(next).catch(() => {}), 1800);
    });
  }, [userLocation?.[0], userLocation?.[1]]);

  useFocusEffect(useCallback(() => {
    testLocalAi().then(setAiReady);
  }, []));

  useEffect(() => {
    Speech.speak('Welcome to TSRTC LiveTrack. Track your bus in real time.', { language });
  }, [language]);

  const activeBuses = useMemo(() => {
    const staleAfterMs = 8 * 60 * 1000;
    const now = Date.now();
    return buses.filter((bus) => (
      bus.is_active &&
      bus.live_source === 'driver_app' &&
      Boolean(bus.live_session_id) &&
      /^\d{4}$/.test(bus.bus_number) &&
      bus.latitude != null &&
      bus.longitude != null &&
      bus.latitude >= 16.9 &&
      bus.latitude <= 17.8 &&
      bus.longitude >= 78.0 &&
      bus.longitude <= 79.0 &&
      (!bus.updated_at || now - bus.updated_at <= staleAfterMs)
    ));
  }, [buses]);
  const stop = useMemo(() => nearestStop(userLocation, hydStops), [userLocation]);
  const filteredBuses = useMemo(
    () => (crowdFilter === 'all' ? activeBuses : activeBuses.filter((bus) => bus.crowd_level === crowdFilter)),
    [activeBuses, crowdFilter]
  );
  const activeBusFocus = useMemo<[number, number] | null>(() => {
    const bus = selectedBus || filteredBuses.find((item) => item.latitude != null && item.longitude != null);
    return bus?.latitude != null && bus.longitude != null ? [bus.latitude, bus.longitude] : null;
  }, [filteredBuses, selectedBus]);

  useEffect(() => {
    if (!selectedBus) {
      setRouteCoordinates([]);
      return;
    }
    const buildRoute = async () => {
      const cached = await getCachedRoute(selectedBus.id);
      if (cached.length) {
        setRouteCoordinates(cached);
        return;
      }
      const routeStops = routeStopsForBus(selectedBus, hydStops).map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
      const roadRoute = await fetchRoadRoute(routeStops).catch(() => []);
      const coords = roadRoute.length ? roadRoute : routeStops;
      setRouteCoordinates(coords);
      cacheRoute(selectedBus.id, coords).catch(() => {});
    };
    buildRoute();
  }, [selectedBus]);

  useEffect(() => {
    if (!stop?.stop) return;
    activeBuses.forEach((bus) => {
      const eta = etaMinutes(bus, stop.stop);
      const key = `${bus.id}:${stop.stop.name}`;
      if (eta && eta <= 2 && !arrivalNotified[key]) {
        setArrivalNotified((prev) => ({ ...prev, [key]: true }));
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Bus ${bus.bus_number} approaching`,
            body: `${bus.route_name} is about ${eta} min from ${stop.stop.name}.`
          },
          trigger: null
        }).catch(() => {});
      }
    });
  }, [activeBuses, arrivalNotified, stop]);

  const applyLocation = (pos: Location.LocationObject) => {
    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
    setFocusUserToken((value) => value + 1);
  };

  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to show your current location on the map.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
      if (lastKnown) applyLocation(lastKnown);

      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
      ]);
      if (fresh) applyLocation(fresh);
      if (!lastKnown && !fresh) Alert.alert('Location is slow', 'GPS did not respond yet. Please check phone location settings and try again.');
    } finally {
      setLocating(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await cacheStops(hydStops).catch(() => {});
    setTimeout(() => setRefreshing(false), 700);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoadingAi(true);
    setAiError(null);
    setAiAnswer(null);
    setJourney(null);
    const localMatch = buses.find((b) => `${b.bus_number} ${b.route_name}`.toLowerCase().includes(query.toLowerCase()));
    try {
      const cached = await getCachedSearch<Awaited<ReturnType<typeof searchTransit>>>(query);
      const result = cached || await searchTransit(query, activeBuses, hydStops, userLocation ?? undefined);
      if (result) saveSearch(query, result).catch(() => {});
      if (result?.bus_number) {
        const bus = buses.find((b) => b.bus_number === result.bus_number);
        if (bus) setSelectedBus(bus);
      } else if (localMatch) {
        setSelectedBus(localMatch);
      }
      setAiAnswer(result?.answer || (localMatch ? `${localMatch.bus_number} is on ${localMatch.route_name}.` : 'No live AI result. Try a bus number, route, or destination.'));
    } catch (error) {
      setAiReady(false);
      setAiError(error instanceof Error ? error.message : 'Local AI search could not finish. Try a route number, bus number, or stop name.');
      setAiAnswer(localMatch ? `${localMatch.bus_number} is on ${localMatch.route_name}.` : 'Local search is still available.');
    } finally {
      setLoadingAi(false);
    }
  };

  const runJourneyPlanner = async () => {
    if (!query.trim()) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const result = await planJourney(query, hydStops, userLocation ?? undefined);
      setJourney(result?.steps || [`Go to ${stop?.stop.name || 'your nearest stop'}.`, `Search for buses toward ${query}.`]);
      setAiAnswer(result?.summary || null);
    } catch (error) {
      setAiReady(false);
      setAiError(error instanceof Error ? error.message : 'Local journey planning could not finish.');
      setJourney([`Go to ${stop?.stop.name || 'your nearest stop'}.`, `Ask for a TSRTC route toward ${query}.`]);
    } finally {
      setLoadingAi(false);
    }
  };

  const speakCurrent = () => {
    if (query.trim() && !aiAnswer && !selectedBus) {
      runSearch();
      return;
    }
    const text = aiAnswer || (selectedBus ? `${selectedBus.bus_number}, ${selectedBus.route_name}, ${crowdMeta[selectedBus.crowd_level].label}` : 'Enter a destination, then tap AI Go.');
    Speech.stop();
    Speech.speak(text, { language });
  };

  const showRoute = (bus: Bus) => {
    setSelectedBus(bus);
    Speech.speak(`Showing route for ${bus.bus_number}`, { language });
  };

  return (
    <Screen>
      <View style={styles.appShell}>
        <View style={styles.topChrome}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>RTC</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('appName')}</Text>
              <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
            </View>
            <Pressable style={[styles.aiPill, { borderColor: aiReady ? colors.green : colors.orange }]} onPress={() => router.push('/(tabs)/settings')}>
              <Ionicons name={aiReady ? 'sparkles' : 'warning'} size={14} color={aiReady ? colors.green : colors.orange} />
              <Text style={[styles.aiPillText, { color: aiReady ? colors.green : colors.orange }]}>{aiReady ? 'AI' : 'KEY'}</Text>
            </Pressable>
          </View>

          <View style={styles.searchPanel}>
            <Ionicons name="search" size={22} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Where do you want to go?"
              placeholderTextColor="#6b7280"
              style={styles.heroInput}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            <Pressable style={styles.micButton} onPress={speakCurrent}>
              <Ionicons name="mic-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable style={styles.aiGoButton} onPress={runSearch}>
              {loadingAi ? <ActivityIndicator color={colors.text} /> : <Text style={styles.aiGoText}>AI Go</Text>}
            </Pressable>
          </View>

          <View style={styles.alertRow}>
            <Pressable style={styles.nearestStopButton} onPress={() => router.push('/nearest-stop')}>
              <Ionicons name="navigate-circle" size={18} color={colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nearestStopText}>Nearest Stop</Text>
                <Text style={styles.nearestStopName} numberOfLines={1}>{stop?.stop.name || 'Tap locate'}</Text>
              </View>
            </Pressable>
            <Pressable style={styles.alertChip} onPress={() => router.push('/(tabs)/alerts')}>
              <Ionicons name="notifications-outline" size={17} color={colors.purple} />
              <Text style={[styles.alertChipText, { fontWeight: '900' }]}>Bus Alerts</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mapStage}>
        <MapArea
          buses={filteredBuses}
          stops={hydStops}
          userLocation={userLocation}
          selectedBus={selectedBus}
          focusCoordinate={activeBusFocus}
          routeCoordinates={routeCoordinates}
          crowdFilter={crowdFilter}
          mapTheme={mapTheme}
          focusUserToken={focusUserToken}
          onSelectBus={setSelectedBus}
          onLongPressBus={showRoute}
        />

          <View style={styles.floatButtons}>
            <Pressable style={[styles.floatButton, styles.pinButton]} onPress={() => router.push('/journey-destination')}>
              <Ionicons name="location-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable style={[styles.floatButton, styles.locateButton]} onPress={locate}>
              {locating ? <ActivityIndicator color={colors.text} /> : <Ionicons name="locate-outline" size={20} color={colors.text} />}
            </Pressable>
          </View>

          {aiError ? (
            <View style={styles.toast}>
              <Ionicons name="warning" size={16} color={colors.orange} />
              <Text style={styles.toastText}>{aiError}</Text>
            </View>
          ) : null}
        </View>

      </View>
    </Screen>
  );
}

function BusRow({ bus, onPress }: { bus: Bus; onPress: () => void }) {
  const meta = crowdMeta[bus.crowd_level];
  return (
    <Pressable onPress={onPress} style={styles.busRow}>
      <View style={[styles.busBadge, { backgroundColor: meta.color }]}><Ionicons name="bus" size={18} color="#08111f" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.busNum}>{bus.bus_number} · {bus.route_name}</Text>
        <Text style={styles.muted}>{bus.speed || 0} km/h · {bus.next_stop || 'Next stop updating'}</Text>
      </View>
      <Text style={[styles.crowd, { color: meta.color }]}>{meta.label}</Text>
    </Pressable>
  );
}

function BusDetail({
  bus,
  nearest,
  routeStops,
  onShowRoute,
  onNotify
}: {
  bus: Bus;
  nearest: Stop | null;
  routeStops: Stop[];
  onShowRoute: () => void;
  onNotify: () => void;
}) {
  const eta = nearest ? etaMinutes(bus, nearest) : null;
  const meta = crowdMeta[bus.crowd_level];
  return (
    <Card>
      <Text style={styles.cardTitle}>{bus.bus_number}</Text>
      <Text style={styles.bigText}>{bus.route_name}</Text>
      <View style={styles.detailGrid}>
        <Text style={styles.detail}>Crowd: <Text style={{ color: meta.color }}>{meta.label}</Text></Text>
        <Text style={styles.detail}>Passengers: {bus.passenger_count}/{bus.max_capacity}</Text>
        <Text style={styles.detail}>Speed: {bus.speed} km/h</Text>
        <Text style={styles.detail}>ETA: {eta ? `${eta} min` : '--'}</Text>
      </View>
      <View style={styles.stopList}>
        {routeStops.slice(0, 5).map((stop, index) => (
          <Text key={`${stop.name}-${index}`} style={styles.stopText}>{index + 1}. {stop.name}</Text>
        ))}
      </View>
      <View style={styles.actionRow}>
        <Button label="Show Route" icon="git-branch" onPress={onShowRoute} />
        <Button label="Notify" icon="notifications" tone="muted" onPress={onNotify} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: '#081120' },
  topChrome: { backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b', paddingHorizontal: 17, paddingTop: 18, paddingBottom: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 },
  logoBox: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d9bf0', shadowColor: '#1d9bf0', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  logoText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  searchPanel: { minHeight: 70, borderRadius: 23, backgroundColor: '#1a2435', borderWidth: 1, borderColor: '#263447', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.26, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  heroInput: { flex: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingVertical: 0 },
  micButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#2a374a', alignItems: 'center', justifyContent: 'center' },
  aiGoButton: { minWidth: 66, height: 42, borderRadius: 17, backgroundColor: '#1f4fbf', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  aiGoText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  alertRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  alertChip: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#192235', borderWidth: 1, borderColor: '#263447', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  alertChipText: { color: colors.text, fontSize: 12, flex: 1 },
  nearestStopButton: { flex: 1.35, height: 40, borderRadius: 12, backgroundColor: '#1f6be3', borderWidth: 1, borderColor: '#60a5fa', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, shadowColor: '#1f6be3', shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  nearestStopText: { color: colors.text, fontSize: 11, fontWeight: '900', lineHeight: 13 },
  nearestStopName: { color: '#dbeafe', fontSize: 9, fontWeight: '800', lineHeight: 11 },
  mapStage: { flex: 1, position: 'relative', backgroundColor: '#dbeafe' },
  floatButtons: { position: 'absolute', right: 17, bottom: 22, flexDirection: 'row', gap: 10 },
  floatButton: { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 10 },
  pinButton: { backgroundColor: '#7c22d8' },
  locateButton: { backgroundColor: '#1f6be3' },
  toast: { position: 'absolute', left: 16, right: 16, top: 85, borderRadius: 12, backgroundColor: '#111827', borderWidth: 1, borderColor: '#7c2d12', padding: 10, flexDirection: 'row', gap: 8 },
  toastText: { color: colors.orange, flex: 1, fontSize: 12, fontWeight: '700' },
  bottomDock: { backgroundColor: '#0d1729', borderTopWidth: 1, borderTopColor: '#19263a', paddingTop: 12, paddingHorizontal: 22, paddingBottom: 12 },
  busCountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  busCountText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  blueRule: { width: '48%', height: 3, borderRadius: 99, backgroundColor: '#3b82f6', marginTop: 12, marginBottom: 8 },
  selectedStrip: { backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1f2f46' },
  selectedTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  selectedSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  bottomNavMock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 58 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  navLabel: { color: colors.muted, fontSize: 13, fontWeight: '800', marginTop: 4 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  mapWrap: { height: 260, overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  statusBand: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  statusSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  aiPillText: { fontSize: 11, fontWeight: '900' },
  sheet: { flex: 1 },
  sheetContent: { padding: 16, gap: 12, paddingBottom: 120 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border, borderWidth: 1, borderRadius: 8, minHeight: 46, paddingHorizontal: 12 },
  iconButton: { width: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purple },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  filterChip: { color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, overflow: 'hidden', textTransform: 'capitalize' },
  filterActive: { backgroundColor: colors.panel2, borderColor: colors.cyan },
  aiAnswer: { color: colors.text, marginTop: 12, lineHeight: 20 },
  errorText: { color: colors.orange, marginTop: 12, lineHeight: 19, fontWeight: '700' },
  step: { color: colors.muted, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11 },
  cardTitle: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  bigText: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  muted: { color: colors.muted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 20 },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  busBadge: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  busNum: { color: colors.text, fontWeight: '900' },
  crowd: { fontWeight: '900', fontSize: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  detail: { color: colors.text, width: '47%' },
  stopList: { marginTop: 12, gap: 4 },
  stopText: { color: colors.muted, fontSize: 12 }
});
