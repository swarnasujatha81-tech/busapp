import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { routeList } from '@/data/routes';
import { createBus, deleteBus, deleteBusesByNumber, updateBus } from '@/services/firebase';
import { analyzeCrowdImage } from '@/services/localAi';
import { colors, crowdFromCount, crowdMeta } from '@/theme';
import type { CrowdLevel, DriverProfile } from '@/types';
import { haversineKm } from '@/utils/geo';

const DRIVER_CODE = '1234';
const PROFILE_KEY = 'driverProfile';
const CROWD_SCAN_INTERVAL_SECONDS = 25;
const GPS_UPLOAD_INTERVAL_MS = 30000;

type DriverStage = 'login' | 'vehicle' | 'route' | 'ride';

export default function DriverScreen() {
  const [stage, setStage] = useState<DriverStage>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [routeName, setRouteName] = useState(routeList[0]);
  const [busType, setBusType] = useState<DriverProfile['busType']>('ordinary');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [tracking, setTracking] = useState(false);
  const [startingGps, setStartingGps] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>('empty');
  const [passengerCount, setPassengerCount] = useState(0);
  const [headsFound, setHeadsFound] = useState(0);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [scanNote, setScanNote] = useState('Waiting for camera scan.');
  const [scanning, setScanning] = useState(false);
  const [nextScan, setNextScan] = useState(12);
  const [rideStartTime, setRideStartTime] = useState<number | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<ComponentRef<typeof CameraView> | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);
  const passengerCountRef = useRef(passengerCount);
  const lastPointRef = useRef<[number, number] | null>(null);
  const distanceKmRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as DriverProfile;
      setProfile(saved);
      setVehicleNumber(saved.busNumber);
      setRouteName(saved.routeName);
      setBusType(saved.busType);
      setCrowdLevel(saved.crowdLevel);
      setPassengerCount(saved.passengerCount);
    });
    return () => {
      watcherRef.current?.remove();
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (scanRef.current) clearInterval(scanRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    passengerCountRef.current = passengerCount;
  }, [passengerCount]);

  useEffect(() => {
    if (!tracking || stage !== 'ride') {
      if (scanRef.current) clearInterval(scanRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      scanRef.current = null;
      tickRef.current = null;
      return;
    }

    setNextScan(CROWD_SCAN_INTERVAL_SECONDS);
    setTimeout(() => scanCrowd(true).catch(() => {}), 700);
    scanRef.current = setInterval(() => {
      setNextScan(CROWD_SCAN_INTERVAL_SECONDS);
      scanCrowd(true).catch(() => {});
    }, CROWD_SCAN_INTERVAL_SECONDS * 1000);
    tickRef.current = setInterval(() => {
      setNextScan((value) => (value <= 1 ? CROWD_SCAN_INTERVAL_SECONDS : value - 1));
    }, 1000);

    return () => {
      if (scanRef.current) clearInterval(scanRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      scanRef.current = null;
      tickRef.current = null;
    };
  }, [tracking, stage, cameraPermission?.granted, profile?.busId]);

  const login = () => {
    if (username.trim() === DRIVER_CODE && password.trim() === DRIVER_CODE) {
      setStage(profile ? 'route' : 'vehicle');
      return;
    }
    Alert.alert('Invalid login', 'Enter username 1234 and password 1234.');
  };

  const registerVehicle = async () => {
    const cleanNumber = vehicleNumber.replace(/\D/g, '').slice(0, 4);
    if (cleanNumber.length !== 4) {
      Alert.alert('Vehicle number needed', 'Enter the 4 digit vehicle number.');
      return;
    }
    setVehicleNumber(cleanNumber);
    const bus = await createBus({
      bus_number: cleanNumber,
      route_name: routeName,
      driver_name: `Driver ${cleanNumber}`,
      phone_number: '',
      bus_type: busType,
      crowd_level: crowdLevel,
      passenger_count: passengerCount,
      max_capacity: 50,
      is_active: false,
      live_source: 'driver_app',
      speed: 0,
      heading: 0
    });
    const next: DriverProfile = {
      pin: DRIVER_CODE,
      driverName: `Driver ${cleanNumber}`,
      phoneNumber: '',
      busNumber: cleanNumber,
      routeName,
      busType,
      busId: bus.id,
      crowdLevel,
      passengerCount,
      loginTime: Date.now()
    };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setStage('route');
  };

  const startGps = async () => {
    if (!profile) return;
    setStartingGps(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('GPS permission needed', 'Allow location access to start live tracking.');
        return;
      }
      const camera = await requestCameraPermission();
      if (!camera.granted) Alert.alert('Camera permission needed', 'Camera is needed for the 25 second crowd scan.');

      setTracking(true);
      setStage('ride');
      setRideStartTime(Date.now());
      setSpeed(0);
      distanceKmRef.current = 0;
      lastPointRef.current = null;
      let activeBusId = profile.busId;
      const liveSessionId = `${profile.busNumber}-${Date.now()}`;
      if (!activeBusId) {
        const bus = await createBus({
          bus_number: profile.busNumber,
          route_name: routeName,
          driver_name: profile.driverName,
          phone_number: profile.phoneNumber,
          bus_type: busType,
          crowd_level: crowdLevel,
          passenger_count: passengerCount,
          max_capacity: 50,
          is_active: false,
          live_source: 'driver_app',
          live_session_id: liveSessionId,
          speed: 0,
          heading: 0
        });
        activeBusId = bus.id;
      }
      await deleteBusesByNumber(profile.busNumber, activeBusId);
      const nextProfile = { ...profile, busId: activeBusId, routeName, busType };
      setProfile(nextProfile);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      await updateBus(activeBusId, {
        is_active: true,
        route_name: routeName,
        bus_type: busType,
        crowd_level: crowdLevel,
        passenger_count: passengerCount,
        live_source: 'driver_app',
        live_session_id: liveSessionId
      });

      const publishPosition = async (position: Location.LocationObject) => {
        const kmh = position.coords.speed && position.coords.speed > 0 ? Math.round(position.coords.speed * 3.6) : 0;
        const point: [number, number] = [position.coords.latitude, position.coords.longitude];
        if (lastPointRef.current) distanceKmRef.current += haversineKm(lastPointRef.current, point);
        lastPointRef.current = point;
        setSpeed(kmh);
        await updateBus(activeBusId!, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: kmh,
          is_active: true,
          live_source: 'driver_app',
          live_session_id: liveSessionId,
          route_name: routeName,
          bus_type: busType,
          crowd_level: crowdLevel,
          passenger_count: passengerCount
        });
      };
      const takeAndPublishGps = async () => {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await publishPosition(position);
      };

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
      if (lastKnown) await publishPosition(lastKnown);

      const firstPosition = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
      if (firstPosition) await publishPosition(firstPosition);
      if (!lastKnown && !firstPosition) {
        Alert.alert('GPS is slow', 'Tracking started, but no GPS point is available yet. Keep location on and wait a few seconds.');
      }

      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = setInterval(() => {
        takeAndPublishGps().catch(() => {});
      }, GPS_UPLOAD_INTERVAL_MS);
    } finally {
      setStartingGps(false);
    }
  };

  const stopRide = async () => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    gpsIntervalRef.current = null;
    setTracking(false);
    setStage('route');
    if (profile?.busId) {
      await deleteBus(profile.busId);
      const nextProfile = { ...profile, busId: undefined };
      setProfile(nextProfile);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    }
  };

  const updateCrowd = async (count: number) => {
    const nextCount = Math.max(0, Math.min(50, count));
    const nextLevel = crowdFromCount(nextCount) as CrowdLevel;
    setPassengerCount(nextCount);
    setCrowdLevel(nextLevel);
    if (profile?.busId) await updateBus(profile.busId, { passenger_count: nextCount, crowd_level: nextLevel });
    if (profile) {
      const nextProfile = { ...profile, passengerCount: nextCount, crowdLevel: nextLevel };
      setProfile(nextProfile);
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)).catch(() => {});
    }
  };

  const scanCrowd = async (silent = false) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    if (scanningRef.current) return;
    if (!cameraRef.current) {
      setScanNote('Camera is getting ready. Next scan will try again.');
      return;
    }
    scanningRef.current = true;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.45, base64: true, skipProcessing: true, shutterSound: false });
      if (!photo?.base64) {
        setScanNote('Camera photo was not ready. Next scan will try again.');
        return;
      }
      const result = await analyzeCrowdImage(`data:image/jpeg;base64,${photo.base64}`);
      const confidence = result?.confidence || 0;
      const acceptedHeads = confidence > 50 ? result?.headsFound || result?.count || 0 : 0;
      setScanConfidence(confidence);
      setScanNote(result?.note || 'Scan complete.');
      if (confidence > 50) {
        setHeadsFound(acceptedHeads);
        await updateCrowd(acceptedHeads);
      } else {
        setHeadsFound(passengerCountRef.current);
      }
      if (!silent) Alert.alert('Crowd scan', confidence > 50 ? `${acceptedHeads} heads found. Confidence ${confidence}%.` : `Confidence ${confidence}%. Scan not accepted.`);
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  };

  const resetVehicle = async () => {
    watcherRef.current?.remove();
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    gpsIntervalRef.current = null;
    if (profile?.busId) await deleteBus(profile.busId);
    await AsyncStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setVehicleNumber('');
    setTracking(false);
    setStage('vehicle');
  };

  const updateManualCount = async (count: number) => {
    const nextCount = Math.max(0, Math.min(50, count));
    setHeadsFound(nextCount);
    setScanConfidence(100);
    setScanNote('Manual count confirmed by driver.');
    await updateCrowd(nextCount);
  };

  if (stage === 'login') {
    return (
      <Screen>
        <View style={styles.centerPage}>
          <View style={styles.heroBadge}><Ionicons name="shield-checkmark" size={28} color={colors.text} /></View>
          <Text style={styles.title}>Driver Login</Text>
          <Text style={styles.subtitle}>Use username 1234 and password 1234.</Text>
          <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.muted} value={username} onChangeText={setUsername} keyboardType="number-pad" maxLength={4} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} keyboardType="number-pad" maxLength={4} secureTextEntry />
          <Button label="Enter Driver Page" icon="log-in" onPress={login} />
        </View>
      </Screen>
    );
  }

  if (stage === 'vehicle') {
    return (
      <Screen>
        <View style={styles.centerPage}>
          <View style={styles.heroBadge}><Ionicons name="bus" size={28} color={colors.text} /></View>
          <Text style={styles.title}>Register Bus</Text>
          <Text style={styles.subtitle}>Enter the four digit vehicle number.</Text>
          <TextInput
            style={[styles.input, styles.vehicleInput]}
            placeholder="0000"
            placeholderTextColor={colors.muted}
            value={vehicleNumber}
            onChangeText={(value) => setVehicleNumber(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Button label="Register Vehicle" icon="add-circle" onPress={registerVehicle} />
        </View>
      </Screen>
    );
  }

  if (stage === 'route') {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Bus {profile?.busNumber || vehicleNumber}</Text>
          <Text style={styles.subtitle}>Choose today route and start GPS tracking.</Text>
          <Card>
            <Text style={styles.label}>RTC Bus Route</Text>
            <View style={styles.routeGrid}>
              {routeList.map((route) => (
                <Pressable key={route} onPress={() => setRouteName(route)} style={[styles.routeChip, route === routeName && styles.routeChipActive]}>
                  <Text style={[styles.routeText, route === routeName && styles.routeTextActive]}>{route}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card>
            <Text style={styles.label}>Bus Type</Text>
            <View style={styles.typeGrid}>
              {[
                ['ordinary', 'Ordinary'],
                ['metro_express', 'Metro Express'],
                ['electric', 'Electric'],
                ['ac_bus', 'AC Luxury'],
                ['metro_deluxe', 'Metro Deluxe']
              ].map(([value, label]) => (
                <Pressable key={value} onPress={() => setBusType(value as DriverProfile['busType'])} style={[styles.typeChip, busType === value && styles.typeChipActive]}>
                  <View style={[styles.typeDot, { backgroundColor: busTypeColor(value as DriverProfile['busType']) }]} />
                  <Text style={[styles.routeText, busType === value && styles.routeTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Pressable disabled={startingGps} onPress={startGps} style={({ pressed }) => [styles.startGps, pressed && { opacity: 0.82 }, startingGps && { opacity: 0.6 }]}>
            {startingGps ? <ActivityIndicator color={colors.text} /> : <Ionicons name="navigate" size={22} color={colors.text} />}
            <Text style={styles.startGpsText}>{startingGps ? 'Starting GPS...' : 'Start GPS'}</Text>
          </Pressable>
          <Button label="Change Vehicle" icon="refresh" tone="muted" onPress={resetVehicle} />
        </ScrollView>
      </Screen>
    );
  }

  const elapsedMin = rideStartTime ? Math.max(1, Math.round((Date.now() - rideStartTime) / 60000)) : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.rideHeader}>
          <View>
            <Text style={styles.title}>Ride Progressing</Text>
            <Text style={styles.subtitle}>Bus {profile?.busNumber} - {routeName}</Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: tracking ? colors.green : colors.orange }]}>
            <Text style={styles.liveText}>{tracking ? 'LIVE' : 'STOPPED'}</Text>
          </View>
        </View>

        <Card>
          <View style={styles.metrics}>
            <Metric label="Speed" value={`${speed} km/h`} />
            <Metric label="Heads found" value={`${headsFound}`} />
            <Metric label="Crowd" value={crowdMeta[crowdLevel].label} color={crowdMeta[crowdLevel].color} />
          </View>
          <View style={styles.metrics}>
            <Metric label="Duration" value={`${elapsedMin} min`} />
            <Metric label="Distance" value={`${distanceKmRef.current.toFixed(2)} km`} />
            <Metric label="Confidence" value={`${scanConfidence}%`} color={scanConfidence > 50 ? colors.green : colors.orange} />
          </View>
        </Card>

        <Card>
          <View style={styles.cameraRow}>
            <View style={styles.smallCamera}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
              {scanning ? <View style={styles.scanOverlay}><ActivityIndicator color={colors.text} /></View> : null}
            </View>
            <View style={styles.cameraInfo}>
              <Text style={styles.label}>AI Crowd Scanner</Text>
              <View style={styles.peopleFoundBox}>
                <Text style={styles.peopleFoundLabel}>No. of people found</Text>
                <Text style={styles.peopleFoundValue}>{headsFound}</Text>
              </View>
              <Text style={styles.help}>A local scan runs every 25 seconds. Head count is accepted only when confidence is above 50%.</Text>
              <Text style={styles.scanNote}>{scanNote} Next scan: {nextScan}s</Text>
              <Button label="Scan Now" icon="camera" tone="muted" disabled={scanning} onPress={() => scanCrowd(false)} />
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Manual correction</Text>
          <View style={styles.stepperRow}>
            <Pressable style={styles.stepper} onPress={() => updateManualCount(passengerCount - 1)}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
            <Text style={styles.passengerBig}>{passengerCount}</Text>
            <Pressable style={styles.stepper} onPress={() => updateManualCount(passengerCount + 1)}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
          </View>
        </Card>

        <Button label="Stop Ride" icon="stop" tone="danger" onPress={stopRide} />
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function busTypeColor(type: DriverProfile['busType']) {
  if (type === 'metro_express') return colors.blue;
  if (type === 'electric') return colors.green;
  if (type === 'ac_bus') return '#d4af37';
  if (type === 'metro_deluxe') return '#14532d';
  return colors.red;
}

const styles = StyleSheet.create({
  centerPage: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  content: { padding: 16, gap: 14, paddingBottom: 110 },
  heroBadge: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: colors.blue, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4, lineHeight: 19 },
  input: { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border, borderWidth: 1, borderRadius: 8, minHeight: 48, paddingHorizontal: 12 },
  vehicleInput: { textAlign: 'center', fontSize: 30, fontWeight: '900', letterSpacing: 0 },
  label: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  routeGrid: { gap: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeChip: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, justifyContent: 'center', paddingHorizontal: 12 },
  routeChipActive: { backgroundColor: '#123b2b', borderColor: colors.green },
  typeChip: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: '#123b2b', borderColor: colors.green },
  typeDot: { width: 12, height: 12, borderRadius: 99 },
  routeText: { color: colors.text, fontWeight: '800' },
  routeTextActive: { color: colors.green },
  startGps: { minHeight: 58, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: colors.green, shadowOpacity: 0.36, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  startGpsText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  livePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  liveText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 10, marginVertical: 5 },
  metric: { flex: 1, backgroundColor: colors.panel2, borderRadius: 8, padding: 10, minHeight: 62 },
  metricValue: { color: colors.text, fontWeight: '900', fontSize: 16 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 4 },
  cameraRow: { flexDirection: 'row', gap: 12 },
  smallCamera: { width: 116, height: 150, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.32)' },
  cameraInfo: { flex: 1, gap: 8 },
  peopleFoundBox: { backgroundColor: '#10243a', borderWidth: 1, borderColor: colors.cyan, borderRadius: 8, padding: 10 },
  peopleFoundLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  peopleFoundValue: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  help: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  scanNote: { color: colors.cyan, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepper: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  passengerBig: { color: colors.text, fontSize: 32, fontWeight: '900', minWidth: 64, textAlign: 'center' }
});
