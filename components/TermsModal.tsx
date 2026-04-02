import { useEffect } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_TITLE,
} from '../constants/termsContent';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  onAccept: () => void;
};

export function TermsModal({ visible, onAccept }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.card}>
          <Text style={styles.mainTitle}>{TERMS_TITLE}</Text>
          <Text style={styles.meta}>Última actualización: {TERMS_LAST_UPDATED}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.intro}>{TERMS_INTRO}</Text>
            {TERMS_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.paragraphs.map((p, i) => (
                  <Text key={i} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.acceptBtn, { marginBottom: Math.max(insets.bottom, 16) }]}
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel="Aceptar términos y condiciones"
          >
            <Text style={styles.acceptBtnText}>Aceptar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    flex: 1,
    maxHeight: '92%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.muted2,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  acceptBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
