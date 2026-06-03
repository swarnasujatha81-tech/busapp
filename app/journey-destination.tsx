import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { colors } from '@/theme';
import { haversineKm, nearestStop } from '@/utils/geo';

let NativeMap: any = null;
if (Platform.OS !== 'web') {
  NativeMap = require('react-native-maps');
}

type MarkerPoint = {
  latitude: number;
  longitude: number;
};

export default function JourneyDestinationScreen() {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<MarkerPoint | null>(null);
  const [locating, setLocating] = useState(true);

  const destinationStop = useMemo(
    () => nearestStop(destination ? [destination.latitude, destination.longitude] : null, hydStops),
    [destination]
  );

  const locate = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access so the planner can find your boarding stop.');
        return;
      }
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
      if (lastKnown) setUserLocation([lastKnown.coords.latitude, lastKnown.coords.longitude]);
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
      ]);
      if (fresh) setUserLocation([fresh.coords.latitude, fresh.coords.longitude]);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    locate().catch(() => setLocating(false));
  }, []);

  const confirmDestination = () => {
    if (!destination) {
      Alert.alert('Drop destination marker', 'Tap on the map where you want to go, then confirm.');
      return;
    }
    if (userLocation) {
      const distanceMeters = haversineKm(userLocation, [destination.latitude, destination.longitude]) * 1000;
      if (distanceMeters < 400) {
        Alert.alert(
          'Short distance',
          'RTC bus is not good for this short distance. If you want, you can book a bike, auto, or cab instead.'
        );
        return;
      }
    }
    router.push({
      pathname: '/journey-plan',
      params: {
        destLat: String(destination.latitude),
        destLng: String(destination.longitude),
        userLat: userLocation ? String(userLocation[0]) : '',
        userLng: userLocation ? String(userLocation[1]) : ''
      }
    });
  };

  const region = {
    latitude: userLocation?.[0] || 17.385,
    longitude: userLocation?.[1] || 78.4867,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08
  };

  const MapView = NativeMap?.default;
  const Marker = NativeMap?.Marker;

  return (
    <Screen>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Choose Destination</Text>
            <Text style={styles.subtitle}>Tap the map to drop your destination marker.</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={locate}>
            {locating ? <ActivityIndicator color={colors.text} /> : <Ionicons name="locate" size={20} color={colors.text} />}
          </Pressable>
        </View>

        <View style={styles.mapWrap}>
          {Platform.OS !== 'web' && MapView ? (
            <MapView
              style={styles.map}
              initialRegion={region}
              showsUserLocation
              onPress={(event: any) => setDestination(event.nativeEvent.coordinate)}
            >
              {destination ? (
                <Marker coordinate={destination} title="Destination">
                  <View style={styles.destMarker}>
                    <Ionicons name="location" size={24} color={colors.text} />
                  </View>
                </Marker>
              ) : null}
            </MapView>
          ) : (
            <View style={styles.webFallback}>
              <Text style={styles.webFallbackText}>Destination picking is available on the mobile map.</Text>
            </View>
          )}
        </View>

        <View style={styles.confirmPanel}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>{destinationStop?.stop.name || 'No destination selected'}</Text>
            <Text style={styles.panelSub}>
              {destinationStop ? `Nearest destination stop: ${destinationStop.distance.toFixed(2)} km from marker` : 'Drop a marker anywhere on the map.'}
            </Text>
          </View>
          <Pressable style={[styles.confirmButton, !destination && styles.disabled]} onPress={confirmDestination}>
            <Ionicons name="checkmark-circle" size={20} color={colors.text} />
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 82, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  mapWrap: { flex: 1, backgroundColor: '#dbeafe' },
  map: { flex: 1 },
  destMarker: { width: 42, height: 42, borderRadius: 99, backgroundColor: colors.purple, borderWidth: 3, borderColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  webFallbackText: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  confirmPanel: { minHeight: 92, backgroundColor: '#0d1729', borderTopWidth: 1, borderTopColor: '#18263b', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  panelSub: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 17 },
  confirmButton: { height: 48, borderRadius: 8, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13 },
  disabled: { opacity: 0.45 },
  confirmText: { color: colors.text, fontWeight: '900' }
});
