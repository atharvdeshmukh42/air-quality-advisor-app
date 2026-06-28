import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animate scale in
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Set a timeout to fade out and call onFinish
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🌤️</Text>
          <View style={styles.glowDot} />
        </View>
        <Text style={styles.title}>AirQuality</Text>
        <Text style={styles.subtitle}>Advisor</Text>
        <Text style={styles.tagline}>Breathe Easy • Live Healthy</Text>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />
          <Text style={styles.loaderText}>Initialising advisor...</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A', // Premium dark slate background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoEmoji: {
    fontSize: 64,
  },
  glowDot: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981', // Emerald green online dot
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#38BDF8', // Celestial blue color
    letterSpacing: 2,
    marginTop: -4,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 16,
    letterSpacing: 1,
  },
  loaderContainer: {
    marginTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loader: {
    marginRight: 10,
  },
  loaderText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
