import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { defaultRoutes, hydStops } from '@/data/routes';
import { listenBuses } from '@/services/firebase';
import { colors, crowdMeta } from '@/theme';
import type { Bus, Route, Stop } from '@/types';
import { etaMinutes, haversineKm, nearestStop } from '@/utils/geo';

type CandidateRoute = {
  route: Route;
  score: number;
};

function numberParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function routeNumber(routeName: string) {
  return routeName.split(' ')[0] || routeName;
}

function routeEndpointScore(route: Route, stop: Stop) {
  const text = `${route.origin || ''} ${route.destination || ''} ${route.route_name}`.toLowerCase();
  const stopToken = stop.name.toLowerCase().split(/[^a-z0-9]+/).find((part) => part.length > 3);
  return stopToken && text.includes(stopToken) ? -4 : 0;
}

function scoreRoute(route: Route, board: Stop, alight: Stop): CandidateRoute {
  const boardDistance = Math.min(...route.stops.map((stop) => haversineKm([board.latitude, board.longitude], [stop.latitude, stop.longitude])));
  const alightDistance = Math.min(...route.stops.map((stop) => haversineKm([alight.latitude, alight.longitude], [stop.latitude, stop.longitude])));
  return {
    route,
    score: boardDistance + alightDistance + routeEndpointScore(route, board) + routeEndpointScore(route, alight)
  };
}

function bestRoute(board: Stop, alight: Stop) {
  return defaultRoutes
    .map((route) => scoreRoute(route, board, alight))
    .sort((a, b) => a.score - b.score)[0];
}

function bestInterchange(board: Stop, alight: Stop) {
  const hubs = ['MGBS', 'Koti', 'Secunderabad Bus Stand', 'Mehdipatnam', 'LB Nagar', 'Ameerpet']
    .map((name) => hydStops.find((stop) => stop.name === name))
    .filter((stop): stop is Stop => Boolean(stop));

  return hubs
    .map((hub) => {
      const first = bestRoute(board, hub);
      const second = bestRoute(hub, alight);
      return { hub, first, second, score: first.score + second.score };
    })
    .sort((a, b) => a.score - b.score)[0];
}

function activeLiveBuses(buses: Bus[]) {
  const staleAfterMs = 8 * 60 * 1000;
  const now = Date.now();
  return buses.filter((bus) => (
    bus.is_active &&
    bus.live_source === 'driver_app' &&
    Boolean(bus.live_session_id) &&
    /^\d{4}$/.test(bus.bus_number) &&
    bus.latitude != null &&
    bus.longitude != null &&
    (!bus.updated_at || now - bus.updated_at <= staleAfterMs)
  ));
}

function matchingLiveBus(route: Route, buses: Bus[]) {
  const code = route.route_code.toLowerCase();
  return activeLiveBuses(buses)
    .filter((bus) => routeNumber(bus.route_name).toLowerCase() === code || bus.route_name.toLowerCase().includes(route.route_name.toLowerCase()))
    .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0))[0] || null;
}

export default function JourneyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    const lat = numberParam(params.userLat);
    const lng = numberParam(params.userLng);
    return lat != null && lng != null ? [lat, lng] : null;
  });
  const [planning, setPlanning] = useState(true);
  const [planningSeconds, setPlanningSeconds] = useState(4);

  const destination = useMemo<[number, number] | null>(() => {
    const lat = numberParam(params.destLat);
    const lng = numberParam(params.destLng);
    return lat != null && lng != null ? [lat, lng] : null;
  }, [params.destLat, params.destLng]);

  useEffect(() => listenBuses(setBuses), []);

  useEffect(() => {
    if (userLocation) return;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]))
      .catch(() => {});
  }, [userLocation]);

  useEffect(() => {
    const seconds = 3 + Math.floor(Math.random() * 4);
    setPlanningSeconds(seconds);
    const timer = setTimeout(() => setPlanning(false), seconds * 1000);
    return () => clearTimeout(timer);
  }, []);

  const plan = useMemo(() => {
    if (!userLocation || !destination) return null;
    const board = nearestStop(userLocation, hydStops)?.stop || hydStops[0];
    const alight = nearestStop(destination, hydStops)?.stop || hydStops[1];
    const direct = bestRoute(board, alight);
    const interchange = bestInterchange(board, alight);
    const useInterchange = direct.score > 5.5 && interchange && interchange.score + 1.2 < direct.score;
    const distanceKm = haversineKm([board.latitude, board.longitude], [alight.latitude, alight.longitude]);
    const walkToStopMin = Math.max(2, Math.round((haversineKm(userLocation, [board.latitude, board.longitude]) / 4.5) * 60));
    const walkAfterMin = Math.max(2, Math.round((haversineKm(destination, [alight.latitude, alight.longitude]) / 4.5) * 60));
    const busMinutes = Math.max(10, Math.round((distanceKm / 20) * 60));
    const interchangeWait = useInterchange ? 8 : 0;
    const totalMinutes = walkToStopMin + busMinutes + walkAfterMin + interchangeWait;
    const lowCost = Math.max(10, Math.round(10 + distanceKm * 1.6));
    const highCost = lowCost + (useInterchange ? 20 : 12);

    return {
      board,
      alight,
      direct,
      interchange: useInterchange ? interchange : null,
      distanceKm,
      walkToStopMin,
      walkAfterMin,
      busMinutes,
      interchangeWait,
      totalMinutes,
      lowCost,
      highCost
    };
  }, [destination, userLocation]);

  const primaryRoute = plan?.interchange?.first.route || plan?.direct.route;
  const secondRoute = plan?.interchange?.second.route || null;
  const liveBus = primaryRoute ? matchingLiveBus(primaryRoute, buses) : null;
  const liveEta = liveBus && plan ? etaMinutes(liveBus, plan.board) : null;

  const openBoardingNavigation = async () => {
    if (!plan?.board) {
      Alert.alert('Boarding stop not ready', 'Wait for the journey plan to finish, then try again.');
      return;
    }
    const { latitude, longitude } = plan.board;
    const appUrl = `google.navigation:q=${latitude},${longitude}&mode=w`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    const canOpenApp = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  };

  const openDestinationNavigation = async () => {
    if (!destination) {
      Alert.alert('Destination not ready', 'The dropped destination marker is not available.');
      return;
    }
    const [latitude, longitude] = destination;
    const appUrl = `google.navigation:q=${latitude},${longitude}&mode=w`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    const canOpenApp = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  };

  return (
    <Screen>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Journey Plan</Text>
            <Text style={styles.subtitle}>{planning ? 'Finding best RTC route' : 'Best available RTC journey'}</Text>
          </View>
        </View>

        {planning ? (
          <View style={styles.loadingPage}>
            <View style={styles.loaderRing}>
              <ActivityIndicator size="large" color={colors.cyan} />
            </View>
            <Text style={styles.loadingTitle}>Planning your journey</Text>
            <Text style={styles.loadingSub}>Checking stops, RTC routes, interchanges and live buses. This takes about {planningSeconds}s.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {plan && primaryRoute ? (
              <>
                <Card>
                  <Text style={styles.cardLabel}>Trip Summary</Text>
                  <Text style={styles.bigTime}>{plan.totalMinutes} min</Text>
                  <Text style={styles.costText}>Estimated fare: Rs {plan.lowCost} - Rs {plan.highCost}</Text>
                  <View style={styles.summaryGrid}>
                    <MiniStat label="Walk" value={`${plan.walkToStopMin + plan.walkAfterMin} min`} />
                    <MiniStat label="Bus" value={`${plan.busMinutes} min`} />
                    <MiniStat label="Distance" value={`${plan.distanceKm.toFixed(1)} km`} />
                  </View>
                </Card>

                <Card>
                  <Text style={styles.cardLabel}>Boarding</Text>
                  <View style={styles.boardingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopTitle}>Go to {plan.board.name}</Text>
                      <Text style={styles.stepText}>Walk about {plan.walkToStopMin} min to your nearest boarding stop.</Text>
                    </View>
                    <Pressable style={styles.walkButton} onPress={openBoardingNavigation}>
                      <Ionicons name="walk" size={19} color={colors.text} />
                      <Text style={styles.walkButtonText}>Navigate</Text>
                    </Pressable>
                  </View>
                </Card>

                <Card>
                  <View style={styles.routeHeader}>
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText}>{primaryRoute.route_code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopTitle}>Board RTC {primaryRoute.route_code}</Text>
                      <Text style={styles.stepText}>{primaryRoute.route_name}</Text>
                    </View>
                  </View>
                  {liveBus ? (
                    <View style={styles.liveBusBox}>
                      <View style={[styles.crowdDot, { backgroundColor: crowdMeta[liveBus.crowd_level].color }]} />
                      <Text style={styles.liveText}>Live bus {liveBus.bus_number}{liveEta ? ` - ETA ${liveEta} min` : ''}</Text>
                      <Text style={[styles.crowdText, { color: crowdMeta[liveBus.crowd_level].color }]}>{crowdMeta[liveBus.crowd_level].label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.stepText}>No live bus is broadcasting on this route right now. Use route number {primaryRoute.route_code} at the stop.</Text>
                  )}
                </Card>

                {plan.interchange && secondRoute ? (
                  <Card>
                    <Text style={styles.cardLabel}>Interchange Required</Text>
                    <Text style={styles.stopTitle}>Change bus at {plan.interchange.hub.name}</Text>
                    <Text style={styles.stepText}>Get down there, wait about {plan.interchangeWait} min, then board RTC {secondRoute.route_code}.</Text>
                    <Text style={styles.stepText}>{secondRoute.route_name}</Text>
                  </Card>
                ) : (
                  <Card>
                    <Text style={styles.cardLabel}>Interchange</Text>
                    <Text style={styles.stopTitle}>No bus interchange required</Text>
                    <Text style={styles.stepText}>Stay on RTC {primaryRoute.route_code} until your alighting stop.</Text>
                  </Card>
                )}

                <Card>
                  <Text style={styles.cardLabel}>After Getting Down</Text>
                  <View style={styles.boardingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopTitle}>Get down at {plan.alight.name}</Text>
                      <Text style={styles.stepText}>Walk about {plan.walkAfterMin} min from the stop to your dropped destination marker.</Text>
                    </View>
                    <Pressable style={styles.walkButton} onPress={openDestinationNavigation}>
                      <Ionicons name="walk" size={19} color={colors.text} />
                      <Text style={styles.walkButtonText}>Navigate</Text>
                    </Pressable>
                  </View>
                </Card>
              </>
            ) : (
              <Card>
                <Text style={styles.stopTitle}>Plan could not be created</Text>
                <Text style={styles.stepText}>Go back, drop the destination marker again, and confirm.</Text>
              </Card>
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 82, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 },
  loaderRing: { width: 96, height: 96, borderRadius: 99, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 18 },
  loadingSub: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  bigTime: { color: colors.cyan, fontSize: 38, fontWeight: '900', marginTop: 4 },
  costText: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 2 },
  summaryGrid: { flexDirection: 'row', gap: 9, marginTop: 14 },
  miniStat: { flex: 1, minHeight: 58, borderRadius: 8, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', padding: 8 },
  miniValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  miniLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  stopTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 5 },
  stepText: { color: colors.muted, lineHeight: 19, marginTop: 7 },
  boardingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walkButton: { minWidth: 92, height: 46, borderRadius: 8, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  walkButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeBadge: { width: 58, height: 58, borderRadius: 8, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  routeBadgeText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  liveBusBox: { minHeight: 42, borderRadius: 8, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginTop: 12 },
  crowdDot: { width: 10, height: 10, borderRadius: 99 },
  liveText: { color: colors.text, fontWeight: '800', flex: 1 },
  crowdText: { fontSize: 12, fontWeight: '900' }
});
