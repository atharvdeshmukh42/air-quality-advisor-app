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
import { usePrediction } from '../context/PredictionContext';
import { getExplanation } from '../utils/api';
import { getAQICategory, getAQIColor, getAQIEmoji } from '../utils/aqiHelpers';

const screenWidth = Dimensions.get('window').width;

export default function ExplainScreen() {
  const { predictionData } = usePrediction();

  const [selectedMethod, setSelectedMethod] = useState('shap');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const hasPrediction =
    predictionData &&
    predictionData.predicted_aqi !== null &&
    predictionData.predicted_aqi !== undefined;

  const methods = [
    { key: 'shap', label: 'SHAP' },
    { key: 'lime', label: 'LIME' },
    { key: 'permutation', label: 'Permutation' },
  ];

  const handleRunAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload = {
        model_name: predictionData.model_name,
        method: selectedMethod,
        state: predictionData.state,
        city: predictionData.city,
        pollutant_id: predictionData.pollutant_id,
        latitude: predictionData.latitude,
        longitude: predictionData.longitude,
        pollutant_min: predictionData.pollutant_min,
        pollutant_max: predictionData.pollutant_max,
      };

      const data = await getExplanation(payload);
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Explanation failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Parse features from result
  const features = result?.features || result?.feature_importance || [];

  // Sort features by absolute importance for the chart
  const sortedFeatures = [...features]
    .sort(
      (a, b) =>
        Math.abs(b.importance || b.weight || b.value || 0) -
        Math.abs(a.importance || a.weight || a.value || 0)
    )
    .slice(0, 10);

  const maxImportance = sortedFeatures.length > 0
    ? Math.max(
        ...sortedFeatures.map((f) =>
          Math.abs(f.importance || f.weight || f.value || 0)
        )
      )
    : 1;

  if (!hasPrediction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, styles.centered]}
        >
          <Text style={styles.emptyIcon}>💡</Text>
          <Text style={styles.emptyTitle}>No Prediction Yet</Text>
          <Text style={styles.emptyText}>
            Go to the Predict tab first to make a prediction, then come back
            here to understand what factors influenced the result.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Explain</Text>

        {/* Current Prediction Info */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>CURRENT PREDICTION</Text>
          <View style={styles.predictionInfoRow}>
            <View style={styles.predictionInfoLeft}>
              <Text style={styles.predictionModel}>
                {predictionData.model_name || 'Model'}
              </Text>
              <Text style={styles.predictionLocation}>
                {predictionData.city}
                {predictionData.state ? `, ${predictionData.state}` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.miniAqiBadge,
                {
                  backgroundColor:
                    getAQIColor(predictionData.predicted_aqi) + '20',
                },
              ]}
            >
              <Text style={styles.miniAqiEmoji}>
                {getAQIEmoji(predictionData.predicted_aqi)}
              </Text>
              <Text
                style={[
                  styles.miniAqiValue,
                  { color: getAQIColor(predictionData.predicted_aqi) },
                ]}
              >
                {Math.round(predictionData.predicted_aqi)}
              </Text>
              <Text
                style={[
                  styles.miniAqiCategory,
                  { color: getAQIColor(predictionData.predicted_aqi) },
                ]}
              >
                {getAQICategory(predictionData.predicted_aqi)}
              </Text>
            </View>
          </View>
        </View>

        {/* Method Selector */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>EXPLANATION METHOD</Text>
          <View style={styles.methodRow}>
            {methods.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodButton,
                  selectedMethod === m.key && styles.methodButtonActive,
                ]}
                onPress={() => setSelectedMethod(m.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.methodButtonText,
                    selectedMethod === m.key && styles.methodButtonTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRunAnalysis}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Run Analysis</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Results */}
        {result && sortedFeatures.length > 0 && (
          <>
            {/* Feature Importance Chart (Horizontal bars) */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                FEATURE IMPORTANCE
                {selectedMethod === 'shap'
                  ? ' (SHAP)'
                  : selectedMethod === 'lime'
                  ? ' (LIME)'
                  : ' (PERMUTATION)'}
              </Text>
              {sortedFeatures.map((f, i) => {
                const importance = f.importance || f.weight || f.value || 0;
                const absImportance = Math.abs(importance);
                const barWidth =
                  maxImportance > 0
                    ? (absImportance / maxImportance) * (screenWidth - 160)
                    : 0;
                const isPositive = importance >= 0;

                return (
                  <View key={i} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {f.feature || f.name || `Feature ${i + 1}`}
                    </Text>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            width: Math.max(barWidth, 4),
                            backgroundColor: isPositive ? '#FF3B30' : '#007AFF',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>
                      {importance.toFixed(3)}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.barLegend}>
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#FF3B30' }]}
                  />
                  <Text style={styles.legendText}>↑ Increases AQI</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#007AFF' }]}
                  />
                  <Text style={styles.legendText}>↓ Decreases AQI</Text>
                </View>
              </View>
            </View>

            {/* Feature Table */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>FEATURE DETAILS</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>
                  Feature
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { flex: 2, textAlign: 'center' },
                  ]}
                >
                  {selectedMethod === 'lime'
                    ? 'Weight'
                    : selectedMethod === 'permutation'
                    ? 'Mean Decrease'
                    : 'Importance'}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { flex: 1, textAlign: 'right' },
                  ]}
                >
                  Dir.
                </Text>
              </View>
              {sortedFeatures.map((f, i) => {
                const importance = f.importance || f.weight || f.value || 0;
                const featureName = f.feature || f.name || `Feature ${i + 1}`;
                const condition = f.condition || f.rule || null;

                return (
                  <View
                    key={i}
                    style={[
                      styles.tableRow,
                      i % 2 === 0 && styles.tableRowAlt,
                    ]}
                  >
                    <View style={{ flex: 3 }}>
                      <Text style={styles.tableCell}>{featureName}</Text>
                      {condition && selectedMethod === 'lime' && (
                        <Text style={styles.conditionText}>{condition}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 2, textAlign: 'center', fontWeight: '600' },
                      ]}
                    >
                      {importance.toFixed(4)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          flex: 1,
                          textAlign: 'right',
                          color: importance >= 0 ? '#FF3B30' : '#007AFF',
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {importance >= 0 ? '↑' : '↓'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Method-specific notes */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>HOW TO READ</Text>
              <Text style={styles.infoText}>
                {selectedMethod === 'shap'
                  ? 'SHAP (SHapley Additive exPlanations) values show the contribution of each feature to the prediction. Positive values push the AQI higher, negative values push it lower.'
                  : selectedMethod === 'lime'
                  ? 'LIME (Local Interpretable Model-agnostic Explanations) approximates the model locally with an interpretable model. Feature conditions show the rules and weights indicate the direction and magnitude of influence.'
                  : 'Permutation importance measures how much the model\'s score decreases when a feature is randomly shuffled. Higher values indicate more important features.'}
              </Text>
            </View>
          </>
        )}

        {result && sortedFeatures.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No feature importance data available for this analysis.
            </Text>
          </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  predictionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionInfoLeft: {
    flex: 1,
  },
  predictionModel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  predictionLocation: {
    fontSize: 13,
    color: '#8E8E93',
  },
  miniAqiBadge: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  miniAqiEmoji: {
    fontSize: 20,
  },
  miniAqiValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  miniAqiCategory: {
    fontSize: 11,
    fontWeight: '600',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#007AFF',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  methodButtonTextActive: {
    color: '#FFFFFF',
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
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 80,
    fontSize: 12,
    color: '#3C3C43',
    marginRight: 8,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 50,
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
    marginLeft: 6,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
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
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
  },
  tableCell: {
    fontSize: 13,
    color: '#3C3C43',
  },
  conditionText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
});
