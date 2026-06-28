import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { PredictionProvider } from './src/context/PredictionContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import PredictScreen from './src/screens/PredictScreen';
import ForecastScreen from './src/screens/ForecastScreen';
import RouteScreen from './src/screens/RouteScreen';
import ExplainScreen from './src/screens/ExplainScreen';
import AQIBuddyScreen from './src/screens/AQIBuddyScreen';
import SplashScreen from './src/components/SplashScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {emoji}
      </Text>
    </View>
  );
}

function SignOutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={styles.signOutButton} activeOpacity={0.7}>
      <Text style={styles.signOutText}>Sign Out</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <PredictionProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerTitle: 'AirQuality Advisor',
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
            headerRight: () => <SignOutButton />,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tab.Screen
            name="Predict"
            component={PredictScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="📊" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Forecast"
            component={ForecastScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="📈" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Route"
            component={RouteScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="🗺️" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Explain"
            component={ExplainScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="💡" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="AQI Buddy"
            component={AQIBuddyScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="🤖" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PredictionProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainTabs />;
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
  },
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A202C',
  },
  signOutButton: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E53E3E',
  },
});
