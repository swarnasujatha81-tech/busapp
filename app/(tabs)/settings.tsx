import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useLanguage } from '@/hooks/useLanguage';
import { testLocalAi as testLocalAiReady } from '@/services/localAi';
import { colors } from '@/theme';
import type { Language } from '@/data/translations';

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const runLocalAiTest = async () => {
    const ok = await testLocalAiReady();
    Alert.alert('Local AI', ok ? 'Built-in AI rules are ready. No API key is needed.' : 'Local AI is unavailable.');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Firebase backend · Expo Router · React Native</Text>

        <Card>
          <Text style={styles.label}>{t('language')}</Text>
          <View style={styles.row}>
            {(['en', 'hi', 'te'] as Language[]).map((item) => (
              <Text key={item} onPress={() => setLanguage(item)} style={[styles.chip, language === item && styles.active]}>
                {item === 'en' ? 'English' : item === 'hi' ? 'हिन्दी' : 'తెలుగు'}
              </Text>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Backend status</Text>
          <StatusLine icon="flame" label="Firebase Realtime Database" ok />
          <StatusLine icon="cloud-offline" label="Camera images are not stored or uploaded" ok />
          <StatusLine icon="sparkles" label="Built-in local AI search and scanner" ok />
          <Text style={styles.note}>
            AI features run inside the app with local matching and estimation code. No OpenAI key or external AI API is used.
          </Text>
        </Card>

        <Card>
          <Text style={styles.label}>Local AI</Text>
          <StatusLine icon="search" label="Destination and route ranking" ok />
          <StatusLine icon="walk" label="Nearest stop and walking guidance" ok />
          <StatusLine icon="camera" label="On-device crowd estimate" ok />
          <Text onPress={runLocalAiTest} style={styles.testButton}>Test Local AI</Text>
        </Card>

        <Card>
          <Text style={styles.label}>App</Text>
          <Text style={styles.value}>Package: jntu.chooseit</Text>
          <Text style={styles.value}>Expo SDK: {Constants.expoConfig?.sdkVersion || 'configured'}</Text>
          <Text style={styles.value}>Backend: Firebase Realtime Database</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function StatusLine({ icon, label, ok }: { icon: keyof typeof Ionicons.glyphMap; label: string; ok: boolean }) {
  return (
    <View style={styles.statusLine}>
      <Ionicons name={icon} size={18} color={ok ? colors.green : colors.orange} />
      <Text style={styles.value}>{label}</Text>
      <Text style={[styles.pill, { color: ok ? colors.green : colors.orange }]}>{ok ? 'Ready' : 'Off'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 110 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4 },
  label: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { color: colors.text, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden' },
  active: { backgroundColor: colors.blue, borderColor: colors.cyan },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  value: { color: colors.text, flex: 1 },
  pill: { fontWeight: '900' },
  note: { color: colors.muted, marginTop: 10, lineHeight: 19 },
  testButton: { color: colors.text, backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, overflow: 'hidden', textAlign: 'center', fontWeight: '900', marginTop: 12 }
});
