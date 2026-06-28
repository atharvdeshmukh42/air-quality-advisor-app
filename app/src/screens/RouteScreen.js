import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import MapView, { Polyline, Marker } from '../components/MapComponent';
import Slider from '@react-native-community/slider';
import { findRoutes } from '../utils/api';

const screenWidth = Dimensions.get('window').width;

export default function RouteScreen() {
  const [startLocation, setStartLocation] = useState('Shivaji Nagar, Pune');
  const [destination, setDestination] = useState('Magarpatta, Pune');
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFindRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await findRoutes({
        start_location: startLocation,
        end_location: destination,
        search_radius_km: Math.round(radius),
      });
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to find routes. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Parse route data — backend returns coords as [[lat, lng], ...]
  const shortestRoute = result?.shortest_route || null;
  const healthiestRoute = result?.healthiest_route || null;

  const shortestCoords = (shortestRoute?.coords || []).map(c => ({
    latitude: c[0],
    longitude: c[1],
  }));
  const healthiestCoords = (healthiestRoute?.coords || []).map(c => ({
    latitude: c[0],
    longitude: c[1],
  }));

  const shortestDistance = shortestRoute?.distance_km || 0;
  const healthiestDistance = healthiestRoute?.distance_km || 0;
  const diffPercent =
    shortestDistance > 0
      ? Math.round(
          ((healthiestDistance - shortestDistance) / shortestDistance) * 100
        )
      : 0;

  // Map region
  const allCoords = [...shortestCoords, ...healthiestCoords];
  const startCoord =
    result?.start_coords
      ? { latitude: result.start_coords[0], longitude: result.start_coords[1] }
      : allCoords.length > 0
      ? allCoords[0]
      : { latitude: 18.5204, longitude: 73.8567 };
  const endCoord =
    result?.end_coords
      ? { latitude: result.end_coords[0], longitude: result.end_coords[1] }
      : allCoords.length > 0
      ? allCoords[allCoords.length - 1]
      : { latitude: 18.5204, longitude: 73.8567 };

  const getMapRegion = () => {
    if (allCoords.length === 0) {
      return {
        latitude: 18.5204,
        longitude: 73.8567,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    const lats = allCoords.map((c) => c.latitude);
    const lngs = allCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.02),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.02),
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Healthy Routes</Text>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>ROUTE DETAILS</Text>

          <Text style={styles.inputLabel}>Start Location</Text>
          <TextInput
            style={styles.textInput}
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="Enter start location"
          />

          <Text style={styles.inputLabel}>Destination</Text>
          <TextInput
            style={styles.textInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Enter destination"
          />

          <Text style={styles.sliderLabel}>
            Search Radius:{' '}
            <Text style={styles.sliderValue}>{Math.round(radius)} km</Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={20}
            step={1}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            thumbTintColor="#007AFF"
          />
          <View style={styles.sliderRange}>
            <Text style={styles.sliderRangeText}>5 km</Text>
            <Text style={styles.sliderRangeText}>20 km</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleFindRoutes}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Find Routes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>LEGEND</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Shortest Route</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Healthiest Route</Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: '#007AFF' }]}>
                  {typeof shortestDistance === 'number'
                    ? shortestDistance.toFixed(1)
                    : shortestDistance}
                </Text>
                <Text style={styles.metricLabel}>Shortest (km)</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: '#34C759' }]}>
                  {typeof healthiestDistance === 'number'
                    ? healthiestDistance.toFixed(1)
                    : healthiestDistance}
                </Text>
                <Text style={styles.metricLabel}>Healthiest (km)</Text>
              </View>
              <View style={styles.metricCard}>
                <Text
                  style={[
                    styles.metricValue,
                    { color: diffPercent > 20 ? '#FF9500' : '#34C759' },
                  ]}
                >
                  {diffPercent > 0 ? '+' : ''}
                  {diffPercent}%
                </Text>
                <Text style={styles.metricLabel}>Difference</Text>
              </View>
            </View>

            {/* Map */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>ROUTE MAP</Text>
              <View style={styles.mapContainer}>
                <MapView style={styles.map} region={getMapRegion()}>
                  {/* Shortest Route */}
                  {shortestCoords.length > 0 && (
                    <Polyline
                      coordinates={shortestCoords}
                      strokeColor="#007AFF"
                      strokeWidth={4}
                    />
                  )}
                  {/* Healthiest Route */}
                  {healthiestCoords.length > 0 && (
                    <Polyline
                      coordinates={healthiestCoords}
                      strokeColor="#34C759"
                      strokeWidth={4}
                    />
                  )}
                  {/* Start Marker */}
                  {allCoords.length > 0 && (
                    <Marker
                      coordinate={startCoord}
                      title="Start"
                      pinColor="#34C759"
                    />
                  )}
                  {/* End Marker */}
                  {allCoords.length > 0 && (
                    <Marker
                      coordinate={endCoord}
                      title="Destination"
                      pinColor="#FF3B30"
                    />
                  )}
                </MapView>
              </View>
            </View>

            {/* Comparison Note */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>COMPARISON</Text>
              <Text style={styles.comparisonText}>
                {diffPercent <= 5
                  ? '✅ The healthiest route is nearly the same distance as the shortest. Choose the healthier option with no trade-off!'
                  : diffPercent <= 15
                  ? `🟡 The healthiest route is ${diffPercent}% longer but offers significantly better air quality. A worthwhile trade-off for most commuters.`
                  : `⚠️ The healthiest route is ${diffPercent}% longer. Consider the health benefits vs. extra travel time based on your schedule.`}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 15,
    color: '#3C3C43',
    marginBottom: 8,
  },
  sliderValue: {
    fontWeight: '700',
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sliderRangeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#3C3C43',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 300,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  comparisonText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
});
