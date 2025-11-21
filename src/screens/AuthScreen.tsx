/**
 * AuthScreen
 *
 * Kullanıcıya kayıt olma ve giriş yapma ekranı sunar.
 *
 * - Form doğrulama, input yönetimi ve login/register işlemleri içerir.
 * - Fazla state ve validation fonksiyonu sadeleştirilebilir.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { useAuth } from '../providers/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.phone.trim()) {
      Alert.alert('Hata', 'Telefon numarası gereklidir');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return false;
    }
    if (!isLogin) {
      if (!formData.firstName.trim()) {
        Alert.alert('Hata', 'İsim gereklidir');
        return false;
      }
      if (!formData.lastName.trim()) {
        Alert.alert('Hata', 'Soyisim gereklidir');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Mobil cihazdan erişim için localhost yerine IP adresi kullan
      // Bilgisayarının IP adresini buraya yaz (örn: http://192.168.0.15:3000/api)
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.15:3000/api';

      if (isLogin) {
        // Login
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: formData.phone,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await login(data.token, data.user);
          navigation.replace('CaptureFlow');
        } else {
          Alert.alert('Hata', data.message || 'Giriş başarısız');
        }
      } else {
        // Register
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await login(data.token, data.user);
          navigation.replace('CaptureFlow');
        } else {
          Alert.alert('Hata', data.message || 'Kayıt başarısız');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Hesabına giriş yap'
                : 'Yeni hesap oluştur'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>İsim</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="İsminizi girin"
                    placeholderTextColor="#64748b"
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Soyisim</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Soyisminizi girin"
                    placeholderTextColor="#64748b"
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon Numarası</Text>
              <TextInput
                style={styles.input}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#64748b"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#64748b"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoComplete={isLogin ? 'password' : 'password-new'}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setFormData({ firstName: '', lastName: '', phone: '', password: '' });
              }}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? 'Hesabın yok mu? Kayıt ol'
                  : 'Zaten hesabın var mı? Giriş yap'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuthScreen;

