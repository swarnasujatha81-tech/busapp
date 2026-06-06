import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { listenNearbyBuses } from '@/services/firebase';
import { colors, crowdMeta } from '@/theme';
import type { Bus, CrowdLevel, Stop } from '@/types';
import { etaMinutes, haversineKm, nearestStop, routeStopsForBus } from '@/utils/geo';

function paramValue(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] || fallback : value || fallback;
}

function routeCode(routeName: string, busNumber: string) {
  return routeName.split(' ')[0] || busNumber;
}

function arrivalTime(eta: number | null) {
  if (!eta) return '--';
  return new Date(Date.now() + eta * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function nearestRouteStopIndex(bus: Bus, stops: Stop[]) {
  if (bus.latitude == null || bus.longitude == null || !stops.length) return 0;
  return stops
    .map((stop, index) => ({ index, distance: haversineKm([bus.latitude!, bus.longitude!], [stop.latitude, stop.longitude]) }))
    .sort((a, b) => a.distance - b.distance)[0]?.index || 0;
}

export default function BusDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [liveBuses, setLiveBuses] = useState<Bus[]>([]);
  const [scheduledNotificationId, setScheduledNotificationId] = useState<string | null>(null);
  const notifiedRef = useRef(false);
  const bus = useMemo<Bus>(() => ({
    id: paramValue(params.id),
    bus_number: paramValue(params.busNumber),
    route_name: paramValue(params.routeName),
    bus_type: 'ordinary',
    crowd_level: paramValue(params.crowdLevel, 'empty') as CrowdLevel,
    passenger_count: Number(paramValue(params.passengerCount, '0')),
    max_capacity: Number(paramValue(params.maxCapacity, '50')),
    is_active: true,
    latitude: Number(paramValue(params.latitude)) || undefined,
    longitude: Number(paramValue(params.longitude)) || undefined,
    speed: Number(paramValue(params.speed, '0')),
    heading: 0,
    updated_at: Number(paramValue(params.updatedAt)) || undefined
  }), [params]);

  useEffect(() => {
    if (!notifyEnabled) return undefined;
    return listenNearbyBuses(userLocation, setLiveBuses);
  }, [notifyEnabled, userLocation?.[0], userLocation?.[1]]);

  const liveBus = useMemo(() => liveBuses.find((item) => item.id === bus.id || item.bus_number === bus.bus_number), [bus.id, bus.bus_number, liveBuses]);
  const displayBus = liveBus || bus;
  const riderStop = useMemo(() => nearestStop(userLocation, hydStops)?.stop || null, [userLocation]);
  const riderEta = riderStop ? etaMinutes(displayBus, riderStop) : null;
  const stops = useMemo(() => routeStopsForBus(displayBus, hydStops).slice(0, 14), [displayBus]);
  const currentIndex = useMemo(() => nearestRouteStopIndex(displayBus, stops), [displayBus, stops]);
  const meta = crowdMeta[displayBus.crowd_level] || crowdMeta.empty;

  useEffect(() => {
    if (!notifyEnabled || !riderStop || riderEta == null || notifiedRef.current) return;
    if (riderEta <= 2) {
      notifiedRef.current = true;
      Notifications.scheduleNotificationAsync({
        content: {
          title: `Bus ${displayBus.bus_number} is nearby`,
          body: `${displayBus.route_name} is about ${riderEta} min from ${riderStop.name}.`
        },
        trigger: null
      }).catch(() => {});
    }
  }, [displayBus.bus_number, displayBus.route_name, notifyEnabled, riderEta, riderStop]);

  const toggleArrivalNotification = async (enabled: boolean) => {
    setNotifyEnabled(enabled);
    if (!enabled) {
      notifiedRef.current = false;
      if (scheduledNotificationId) Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
      setScheduledNotificationId(null);
      return;
    }

    const notificationPermission = await Notifications.requestPermissionsAsync();
    if (!notificationPermission.granted) {
      setNotifyEnabled(false);
      Alert.alert('Notifications needed', 'Allow notifications to get bus arrival alerts.');
      return;
    }

    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status !== 'granted') {
      setNotifyEnabled(false);
      Alert.alert('Location needed', 'Allow location access so we can alert when the bus is near your stop.');
      return;
    }

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
    const fresh = lastKnown || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const nextLocation: [number, number] = [fresh.coords.latitude, fresh.coords.longitude];
    setUserLocation(nextLocation);

    const stop = nearestStop(nextLocation, hydStops)?.stop || null;
    const eta = stop ? etaMinutes(displayBus, stop) : null;
    if (!stop || eta == null) {
      Alert.alert('Alert enabled', 'We will notify you when this bus is close.');
      return;
    }

    if (eta <= 2) {
      notifiedRef.current = true;
      await Notifications.scheduleNotificationAsync({
        content: { title: `Bus ${displayBus.bus_number} is nearby`, body: `${displayBus.route_name} is about ${eta} min from ${stop.name}.` },
        trigger: null
      });
      return;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: { title: `Bus ${displayBus.bus_number} approaching`, body: `${displayBus.route_name} should be near ${stop.name} in about 2 minutes.` },
      trigger: { seconds: Math.max(1, (eta - 2) * 60) } as any
    });
    setScheduledNotificationId(id);
    Alert.alert('Alert enabled', `We will notify you before Bus ${displayBus.bus_number} reaches ${stop.name}.`);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>{routeCode(displayBus.route_name, displayBus.bus_number)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{displayBus.bus_number}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{displayBus.route_name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.summaryRow}>
            <Metric label="Speed" value={`${displayBus.speed || 0} km/h`} icon="speedometer-outline" />
            <Metric label="Crowd" value={meta.label} icon="people-outline" color={meta.color} />
          </View>
        </Card>

        <Card>
          <View style={styles.notifyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifyTitle}>Notify before arrival</Text>
              <Text style={styles.notifySub}>
                {notifyEnabled && riderStop ? `On for ${riderStop.name}${riderEta ? ` - about ${riderEta} min` : ''}` : 'Alert me when this bus is within 2 minutes of my nearest stop.'}
              </Text>
            </View>
            <Switch value={notifyEnabled} onValueChange={toggleArrivalNotification} thumbColor={notifyEnabled ? colors.cyan : colors.muted} />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next Stops</Text>
          <Text style={styles.sectionSub}>Estimated from current bus location</Text>
        </View>

        <Card style={styles.timelineCard}>
          {stops.map((stop, index) => {
            const isPassed = index < currentIndex;
            const isNow = index === currentIndex;
            const eta = isPassed ? null : isNow ? 0 : etaMinutes(displayBus, stop);
            return (
              <View key={`${stop.name}-${index}`} style={[styles.stopRow, isNow && styles.currentStopRow]}>
                <View style={styles.rail}>
                  <View style={[styles.stopDot, isPassed && styles.passedDot, isNow && styles.currentDot]} />
                  {index < stops.length - 1 ? <View style={[styles.railLine, isPassed && styles.passedLine]} /> : null}
                </View>
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, isPassed && styles.passedText]}>{stop.name}</Text>
                  <Text style={styles.stopMeta}>
                    {isPassed ? 'Passed' : isNow ? 'Bus is here now' : `Arrives around ${arrivalTime(eta)}`}
                  </Text>
                </View>
                <Text style={[styles.eta, isNow && styles.nowEta]}>
                  {isPassed ? 'passed' : isNow ? 'NOW' : eta ? `~${eta}m` : '--'}
                </Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value, icon, color = colors.text }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 82, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b' },
  backButton: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  routeBadge: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  routeBadgeText: { color: colors.text, fontWeight: '900', fontSize: 15 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3, fontSize: 13 },
  content: { padding: 16, gap: 14, paddingBottom: 42 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  notifyRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  notifySub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  metric: { flex: 1, minHeight: 74, borderRadius: 8, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', padding: 8 },
  metricValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  sectionSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  timelineCard: { paddingVertical: 8 },
  stopRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentStopRow: { backgroundColor: '#172d52', borderRadius: 8, marginHorizontal: -6, paddingHorizontal: 6 },
  rail: { width: 20, minHeight: 58, alignItems: 'center' },
  stopDot: { width: 11, height: 11, borderRadius: 99, backgroundColor: colors.green, marginTop: 14 },
  currentDot: { width: 16, height: 16, backgroundColor: '#60a5fa', borderWidth: 3, borderColor: '#bfdbfe' },
  passedDot: { backgroundColor: '#475569' },
  railLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  passedLine: { backgroundColor: '#334155' },
  stopInfo: { flex: 1 },
  stopName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  passedText: { color: '#64748b', textDecorationLine: 'line-through' },
  stopMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  eta: { color: colors.green, fontSize: 12, fontWeight: '900', minWidth: 54, textAlign: 'right' },
  nowEta: { color: '#60a5fa' }
});
