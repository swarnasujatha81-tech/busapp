import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

const backgroundGradient = [colors.bg, '#0b1728', '#08111f'] as const;

export function Screen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={backgroundGradient} style={styles.fill}>
      <SafeAreaView style={styles.fill}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 }
});
