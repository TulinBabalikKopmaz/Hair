import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/providers/AuthProvider';
import { CaptureProvider } from './src/providers/CaptureProvider';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import CaptureFlowScreen from './src/screens/CaptureFlowScreen';
import GalleryScreen from './src/screens/GalleryScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  CaptureFlow: undefined;
  Gallery: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Her uygulama açıldığında Welcome ekranından başla
const linking = {
  prefixes: [],
  config: {
    screens: {
      Welcome: '',
    },
  },
};

export default function App() {
  return (
    <AuthProvider>
      <CaptureProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
              headerTitleAlign: 'center',
            }}
          >
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ title: 'Giriş / Kayıt', headerShown: false }}
            />
            <Stack.Screen
              name="CaptureFlow"
              component={CaptureFlowScreen}
              options={{ title: 'SelfCapture' }}
            />
            <Stack.Screen
              name="Gallery"
              component={GalleryScreen}
              options={{ title: 'Galeri' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CaptureProvider>
    </AuthProvider>
  );
}

