import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-chart-kit';
import { forecastAQI } from '../utils/api';
import { getAQICategory, getAQIColor, getAQIEmoji } from '../utils/aqiHelpers';

const screenWidth = Dimensions.get('window').width;

export default function ForecastScreen() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const data = await forecastAQI(Math.round(days));
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Forecast failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const forecasts = result?.forecasts || result?.predictions || [];
  const aqiValues = forecasts.map(
    (f) => f.predicted_aqi || f.aqi || f.value || 0
  );
  const dates = forecasts.map((f) => {
    const d = f.date || f.ds || '';
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length >= 3) return parts[1] + '/' + parts[2];
    return d.slice(-5);
  });

  const minAQI = aqiValues.length > 0 ? Math.round(Math.min(...aqiValues)) : 0;
  const maxAQI = aqiValues.length > 0 ? Math.round(Math.max(...aqiValues)) : 0;
  const avgAQI =
    aqiValues.length > 0
      ? Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
      : 0;

  // For chart, only show a subset of labels to avoid crowding
  const chartLabels = dates.map((d, i) => {
    if (dates.length <= 7) return d;
    if (i === 0 || i === dates.length - 1 || i % Math.ceil(dates.length / 5) === 0) return d;
    return '';
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Forecast</Text>

        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>SETTINGS</Text>
          <Text style={styles.sliderLabel}>
            Forecast Days: <Text style={styles.sliderValue}>{Math.round(days)}</Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={days}
            onValueChange={setDays}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            thumbTintColor="#007AFF"
          />
          <View style={styles.sliderRange}>
            <Text style={styles.sliderRangeText}>1 day</Text>
            <Text style={styles.sliderRangeText}>30 days</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleForecast}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate Forecast</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <Text style={styles.infoText}>
            This forecast uses an LSTM deep learning model trained on air quality
            data from Pune (2017–2024). The model predicts future AQI values
            based on historical patterns and trends.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Results */}
        {result && forecasts.length > 0 && (
          <>
            {/* Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{minAQI}</Text>
                <Text style={styles.metricLabel}>Min AQI</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{maxAQI}</Text>
                <Text style={styles.metricLabel}>Max AQI</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{avgAQI}</Text>
                <Text style={styles.metricLabel}>Avg AQI</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{forecasts.length}</Text>
                <Text style={styles.metricLabel}>Days</Text>
              </View>
            </View>

            {/* Alert if worst day > 150 */}
            {maxAQI > 150 && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ Warning: AQI is predicted to reach {maxAQI} (
                  {getAQICategory(maxAQI)}) during this period. Take necessary
                  precautions.
                </Text>
              </View>
            )}

            {/* Line Chart */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>AQI TREND</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        data: aqiValues,
                        color: () => '#007AFF',
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={Math.max(screenWidth - 64, aqiValues.length * 40)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalCount: 0,
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    labelColor: () => '#8E8E93',
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#007AFF',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#F2F2F7',
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={false}
                  fromZero={false}
                />
              </ScrollView>
            </View>

            {/* Forecast Table */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>DAILY FORECAST</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>
                  AQI
                </Text>
                <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>
                  Category
                </Text>
              </View>
              {forecasts.map((f, i) => {
                const aqi = f.predicted_aqi || f.aqi || f.value || 0;
                const date = f.date || f.ds || '—';
                return (
                  <View
                    key={i}
                    style={[
                      styles.tableRow,
                      i % 2 === 0 && styles.tableRowAlt,
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>{date}</Text>
                    <View style={[styles.aqiBadge, { flex: 1, backgroundColor: getAQIColor(aqi) + '20' }]}>
                      <Text
                        style={[
                          styles.aqiBadgeText,
                          { color: getAQIColor(aqi) },
                        ]}
                      >
                        {Math.round(aqi)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2, textAlign: 'right', color: getAQIColor(aqi) },
                      ]}
                    >
                      {getAQICategory(aqi)}
                    </Text>
                  </View>
                );
              })}
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
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: {
    color: '#F57C00',
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
  infoText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
  },
  tableCell: {
    fontSize: 14,
    color: '#3C3C43',
  },
  aqiBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aqiBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
