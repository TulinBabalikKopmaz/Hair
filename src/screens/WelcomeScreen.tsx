import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
        }}
        style={styles.hero}
      />
      <Text style={styles.title}>SelfCapture</Text>
      <Text style={styles.subtitle}>
        5 adımda saç ekimi öncesi fotoğraflarını çekmene yardımcı oluyoruz.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Auth')}
      >
        <Text style={styles.buttonText}>Kayıt Ol / Giriş Yap</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('CaptureFlow')}
      >
        <Text style={styles.secondaryButtonText}>Kayıt Olmadan Devam Et</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    width: 220,
    height: 220,
    borderRadius: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 32,
    backgroundColor: '#38bdf8',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default WelcomeScreen;

