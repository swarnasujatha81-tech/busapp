import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { hydStops } from '@/data/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { listenBuses } from '@/services/firebase';
import { colors } from '@/theme';
import type { Bus, RegularAlert } from '@/types';

const ALERTS_KEY = 'regularAlerts';

export default function AlertsScreen() {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [alerts, setAlerts] = useState<RegularAlert[]>([]);
  const [busNumber, setBusNumber] = useState('');
  const [stopName, setStopName] = useState('');
  const [time, setTime] = useState('08:00');

  useEffect(() => listenBuses(setBuses), []);
  useEffect(() => {
    AsyncStorage.getItem(ALERTS_KEY).then((raw) => setAlerts(raw ? JSON.parse(raw) : []));
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  const routeOptions = useMemo(() => [...new Set(buses.map((b) => b.bus_number).filter(Boolean))], [buses]);

  const persist = (next: RegularAlert[]) => {
    setAlerts(next);
    AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const addAlert = async () => {
    if (!busNumber || !stopName || !time) {
      Alert.alert('Missing details', 'Choose a bus, stop and time.');
      return;
    }
    const next: RegularAlert = { id: String(Date.now()), busNumber, stopName, time, enabled: true };
    persist([next, ...alerts]);
    const [hour, minute] = time.split(':').map((value) => Number(value));
    await Notifications.scheduleNotificationAsync({
      content: { title: `Bus ${busNumber}`, body: `Time to head to ${stopName}.` },
      trigger: Number.isFinite(hour) && Number.isFinite(minute) ? ({ hour, minute, repeats: true } as any) : null
    });
    setBusNumber('');
    setStopName('');
    setTime('08:00');
  };

  const toggleAlert = (id: string) => persist(alerts.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  const deleteAlert = (id: string) => persist(alerts.filter((item) => item.id !== id));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('regularAlert')}</Text>
        <Text style={styles.subtitle}>Save daily bus reminders and quick stop alerts.</Text>

        <Card>
          <Text style={styles.label}>Bus number</Text>
          <TextInput style={styles.input} placeholder="Example: 10K" placeholderTextColor={colors.muted} value={busNumber} onChangeText={setBusNumber} autoCapitalize="characters" />
          {routeOptions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {routeOptions.map((route) => <Text key={route} onPress={() => setBusNumber(route)} style={styles.chip}>{route}</Text>)}
            </ScrollView>
          ) : null}

          <Text style={styles.label}>Stop</Text>
          <TextInput style={styles.input} placeholder="Stop name" placeholderTextColor={colors.muted} value={stopName} onChangeText={setStopName} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {hydStops.filter((s) => s.major).map((stop) => <Text key={stop.name} onPress={() => setStopName(stop.name)} style={styles.chip}>{stop.name}</Text>)}
          </ScrollView>

          <Text style={styles.label}>Time</Text>
          <TextInput style={styles.input} placeholder="HH:mm" placeholderTextColor={colors.muted} value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
          <View style={{ marginTop: 12 }}>
            <Button label="Add Alert" icon="add-circle" onPress={addAlert} />
          </View>
        </Card>

        <FlatList
          data={alerts}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No alerts saved yet.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{item.busNumber}</Text>
                  <Text style={styles.subtitle}>{item.stopName} · {item.time}</Text>
                </View>
                <Switch value={item.enabled} onValueChange={() => toggleAlert(item.id)} thumbColor={item.enabled ? colors.cyan : colors.muted} />
              </View>
              <Button label="Delete" icon="trash" tone="muted" onPress={() => deleteAlert(item.id)} />
            </Card>
          )}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 110 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4 },
  label: { color: colors.muted, fontWeight: '800', marginTop: 10 },
  input: { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border, borderWidth: 1, borderRadius: 8, minHeight: 46, paddingHorizontal: 12, marginTop: 8 },
  chips: { gap: 8, paddingVertical: 10 },
  chip: { color: colors.text, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, overflow: 'hidden' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 20 },
  alertCard: { marginTop: 10 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  alertTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }
});
