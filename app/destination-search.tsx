import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { colors } from '@/theme';
import { haversineKm } from '@/utils/geo';

type PlaceSuggestion = {
  id: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
  source: 'stop' | 'osm';
};

function stopSuggestions(query: string): PlaceSuggestion[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return hydStops.slice(0, 8).map((stop) => ({
    id: `stop-${stop.name}`,
    name: stop.name,
    detail: 'Hyderabad bus stop',
    latitude: stop.latitude,
    longitude: stop.longitude,
    source: 'stop'
  }));

  return hydStops
    .filter((stop) => stop.name.toLowerCase().includes(normalized))
    .slice(0, 8)
    .map((stop) => ({
      id: `stop-${stop.name}`,
      name: stop.name,
      detail: 'Hyderabad bus stop',
      latitude: stop.latitude,
      longitude: stop.longitude,
      source: 'stop'
    }));
}

async function fetchOsmSuggestions(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q: `${query}, Hyderabad`,
    format: 'jsonv2',
    limit: '8',
    addressdetails: '1',
    bounded: '1',
    viewbox: '78.20,17.70,78.75,17.20'
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((item): PlaceSuggestion | null => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      const displayName = String(item.display_name || '');
      const [name, ...rest] = displayName.split(',');
      return {
        id: `osm-${item.place_id || displayName}`,
        name: name.trim() || displayName,
        detail: rest.slice(0, 3).join(',').trim() || 'OpenStreetMap place',
        latitude,
        longitude,
        source: 'osm'
      };
    })
    .filter((item): item is PlaceSuggestion => Boolean(item));
}

async function snapToRoad(place: PlaceSuggestion) {
  const response = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${place.longitude},${place.latitude}?number=1`);
  if (!response.ok) return place;
  const data = await response.json();
  const location = data?.waypoints?.[0]?.location;
  if (!Array.isArray(location) || location.length < 2) return place;
  const [longitude, latitude] = location.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return place;
  return { ...place, latitude, longitude };
}

export default function DestinationSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [osmSuggestions, setOsmSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(query.trim().length >= 3);
      fetchOsmSuggestions(query)
        .then((next) => {
          if (!cancelled) setOsmSuggestions(next);
        })
        .catch(() => {
          if (!cancelled) setOsmSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const suggestions = useMemo(() => {
    const byId = new Map<string, PlaceSuggestion>();
    [...stopSuggestions(query), ...osmSuggestions].forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).slice(0, 12);
  }, [osmSuggestions, query]);

  const selectPlace = async (place: PlaceSuggestion) => {
    setSelectingId(place.id);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access so we can plan from your current location.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 });
      const fresh = lastKnown || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const userLocation: [number, number] = [fresh.coords.latitude, fresh.coords.longitude];
      const destination = await snapToRoad(place).catch(() => place);

      const distanceMeters = haversineKm(userLocation, [destination.latitude, destination.longitude]) * 1000;
      if (distanceMeters < 400) {
        Alert.alert('Short distance', 'RTC bus may not be useful for this short distance.');
      }

      router.push({
        pathname: '/journey-plan',
        params: {
          destLat: String(destination.latitude),
          destLng: String(destination.longitude),
          destName: destination.name,
          userLat: String(userLocation[0]),
          userLng: String(userLocation[1])
        }
      });
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Screen>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search destination"
              placeholderTextColor="#64748b"
              style={styles.input}
              returnKeyType="search"
            />
            {loading ? <ActivityIndicator color={colors.cyan} /> : null}
          </View>
        </View>

        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Search for a place, landmark, or stop in Hyderabad.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.resultRow} onPress={() => selectPlace(item)} disabled={Boolean(selectingId)}>
              <View style={[styles.resultIcon, item.source === 'osm' && styles.osmIcon]}>
                <Ionicons name={item.source === 'stop' ? 'bus-outline' : 'location-outline'} size={19} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultDetail} numberOfLines={1}>{item.detail}</Text>
              </View>
              {selectingId === item.id ? <ActivityIndicator color={colors.cyan} /> : <Ionicons name="chevron-forward" size={19} color={colors.muted} />}
            </Pressable>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 82, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0d1729', borderBottomWidth: 1, borderBottomColor: '#18263b' },
  iconButton: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  searchBox: { flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  input: { flex: 1, minHeight: 46, color: colors.text, fontSize: 16, paddingVertical: 0 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  resultRow: { minHeight: 68, borderRadius: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  resultIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  osmIcon: { backgroundColor: colors.green },
  resultName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  resultDetail: { color: colors.muted, marginTop: 3, fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, lineHeight: 20 }
});
