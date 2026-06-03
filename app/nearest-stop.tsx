import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { listenBuses } from '@/services/firebase';
import { colors, crowdMeta } from '@/theme';
import type { Bus, CrowdLevel } from '@/types';
import { etaMinutes, nearestStop } from '@/utils/geo';

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
    bus.latitude >= 16.9 &&
    bus.latitude <= 17.8 &&
    bus.longitude >= 78.0 &&
    bus.longitude <= 79.0 &&
    (!bus.updated_at || now - bus.updated_at <= staleAfterMs)
  ));
}

function crowdSignal(level: CrowdLevel) {
  if (level === 'overcrowded') return colors.red;
  if (level === 'standing') return colors.orange;
  return colors.green;
}

function routeNumber(routeName: string) {
  return routeName.split(' ')[0] || routeName;
}

export default function NearestStopScreen() {
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);

  useEffect(() => listenBuses(setBuses), []);

  const locate = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to find your nearest stop.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
      if (lastKnown) setUserLocation([lastKnown.coords.latitude, lastKnown.coords.longitude]);

      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
      ]);
      if (fresh) setUserLocation([fresh.coords.latitude, fresh.coords.longitude]);
      if (!lastKnown && !fresh) Alert.alert('Location is slow', 'GPS did not respond yet. Please check location settings and try again.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    locate().catch(() => setLocating(false));
  }, []);

  const nearest = useMemo(() => nearestStop(userLocation, hydStops), [userLocation]);
  const arrivals = useMemo(() => {
    if (!nearest?.stop) return [];
    return activeLiveBuses(buses)
      .map((bus) => ({ bus, eta: etaMinutes(bus, nearest.stop) }))
      .filter((item): item is { bus: Bus; eta: number } => item.eta != null)
      .sort((a, b) => a.eta - b.eta);
  }, [buses, nearest]);

  const openWalkingNavigation = async () => {
    if (!nearest?.stop) {
      Alert.alert('Stop not ready', 'Find your nearest stop first, then start navigation.');
      return;
    }
    const { latitude, longitude } = nearest.stop;
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
            <Text style={styles.title}>Nearest Stop</Text>
            <Text style={styles.subtitle}>{nearest?.stop.name || 'Finding your nearest stop'}</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={locate}>
            {locating ? <ActivityIndicator color={colors.text} /> : <Ionicons name="locate" size={20} color={colors.text} />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <View style={styles.stopHeader}>
              <View style={styles.stopIcon}>
                <Ionicons name="bus" size={24} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{nearest?.stop.name || 'Location needed'}</Text>
                <Text style={styles.stopMeta}>
                  {nearest ? `${nearest.distance.toFixed(2)} km from you` : 'Tap locate to calculate live arrivals.'}
                </Text>
              </View>
              <Pressable style={styles.walkButton} onPress={openWalkingNavigation}>
                <Ionicons name="walk" size={20} color={colors.text} />
                <Text style={styles.walkButtonText}>Navigate</Text>
              </Pressable>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Live Buses ETA</Text>
          {arrivals.length ? arrivals.map(({ bus, eta }) => {
            const signal = crowdSignal(bus.crowd_level);
            return (
              <Card key={bus.id} style={styles.busCard}>
                <View style={styles.busRow}>
                  <View style={[styles.routeBadge, { borderColor: signal }]}>
                    <Text style={[styles.routeBadgeText, { color: signal }]}>{routeNumber(bus.route_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.busTitle}>Route {routeNumber(bus.route_name)}</Text>
                    <Text style={styles.busSub}>{bus.route_name}</Text>
                    <Text style={styles.busSub}>Live bus {bus.bus_number} - {bus.speed || 0} km/h</Text>
                  </View>
                  <View style={styles.etaBox}>
                    <Text style={styles.etaValue}>{eta}</Text>
                    <Text style={styles.etaLabel}>min</Text>
                  </View>
                </View>
                <View style={styles.crowdRow}>
                  <View style={[styles.crowdDot, { backgroundColor: signal }]} />
                  <Text style={[styles.crowdText, { color: signal }]}>{crowdMeta[bus.crowd_level].label}</Text>
                </View>
              </Card>
            );
          }) : (
            <Card>
              <Text style={styles.emptyTitle}>No live buses found yet</Text>
              <Text style={styles.emptyText}>This page shows buses currently broadcasting from the driver app near your nearest stop.</Text>
            </Card>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 82, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  walkButton: { minWidth: 92, height: 46, borderRadius: 8, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  walkButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  stopName: { color: colors.text, fontSize: 19, fontWeight: '900' },
  stopMeta: { color: colors.muted, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  busCard: { gap: 10 },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeBadge: { width: 56, height: 56, borderRadius: 8, borderWidth: 2, backgroundColor: '#101b2d', alignItems: 'center', justifyContent: 'center' },
  routeBadgeText: { fontSize: 15, fontWeight: '900' },
  busTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  busSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  etaBox: { width: 58, minHeight: 58, borderRadius: 8, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  etaValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  etaLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  crowdRow: { minHeight: 34, borderRadius: 8, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  crowdDot: { width: 10, height: 10, borderRadius: 99 },
  crowdText: { fontWeight: '900' },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyText: { color: colors.muted, lineHeight: 19, marginTop: 6 }
});
