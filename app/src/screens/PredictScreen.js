import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { usePrediction } from '../context/PredictionContext';
import { fetchMetadata, predictAQI } from '../utils/api';
import { getAQICategory, getAQIColor, getAQIEmoji } from '../utils/aqiHelpers';
import { getYogicIntervention } from '../utils/yogicAdvice';

export default function PredictScreen() {
  const { updatePrediction } = usePrediction();

  // Metadata
  const [metadata, setMetadata] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);

  // Form state
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPollutant, setSelectedPollutant] = useState('');
  const [latitude, setLatitude] = useState('20.5');
  const [longitude, setLongitude] = useState('78.9');
  const [pollutantMin, setPollutantMin] = useState('10');
  const [pollutantMax, setPollutantMax] = useState('50');

  // Derived lists
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pollutants, setPollutants] = useState([]);
  const [models, setModels] = useState([]);

  // Prediction
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Yogic advice toggle
  const [showYogic, setShowYogic] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setMetaLoading(true);
      setMetaError(null);
      const data = await fetchMetadata();
      setMetadata(data);

      if (data.models) {
        setModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      }
      if (data.states) {
        setStates(data.states);
      }
      if (data.pollutants) {
        setPollutants(data.pollutants);
        if (data.pollutants.length > 0)
          setSelectedPollutant(data.pollutants[0].id || data.pollutants[0]);
      }
    } catch (err) {
      setMetaError(
        err.message || 'Failed to load metadata. Check your API connection.'
      );
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    if (metadata && selectedState && metadata.cities_by_state) {
      const cityList = metadata.cities_by_state[selectedState] || [];
      setCities(cityList);
      if (cityList.length > 0) {
        setSelectedCity(cityList[0]);
      } else {
        setSelectedCity('');
      }
    }
  }, [selectedState, metadata]);

  const handlePredict = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setShowYogic(false);

      const payload = {
        model_name: selectedModel,
        state: selectedState,
        city: selectedCity,
        pollutant_id: selectedPollutant,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        pollutant_min: parseFloat(pollutantMin),
        pollutant_max: parseFloat(pollutantMax),
      };

      const data = await predictAQI(payload);
      setResult(data);

      const aqiValue = data.predicted_aqi || data.aqi;
      updatePrediction({
        ...payload,
        predicted_aqi: aqiValue,
        category: getAQICategory(aqiValue),
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Prediction failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPickerItems = (items, labelKey, valueKey) => {
    return items.map((item, idx) => {
      const label =
        typeof item === 'string' ? item : item[labelKey] || item.name || item.id;
      const value =
        typeof item === 'string' ? item : item[valueKey] || item.id || item.name;
      return <Picker.Item key={idx} label={String(label)} value={String(value)} />;
    });
  };

  const aqiValue = result ? result.predicted_aqi || result.aqi : null;
  const yogicData = aqiValue !== null ? getYogicIntervention(aqiValue) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Predict AQI</Text>

        {/* Error loading metadata */}
        {metaError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {metaError}</Text>
            <TouchableOpacity onPress={loadMetadata} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading metadata */}
        {metaLoading && (
          <View style={styles.card}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading metadata...</Text>
          </View>
        )}

        {/* Model Selection */}
        {!metaLoading && !metaError && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>MODEL</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedModel}
                  onValueChange={setSelectedModel}
                  style={styles.picker}
                >
                  {models.map((m, i) => (
                    <Picker.Item
                      key={i}
                      label={typeof m === 'string' ? m : m.name || m.id}
                      value={typeof m === 'string' ? m : m.id || m.name}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>LOCATION</Text>

              <Text style={styles.inputLabel}>State</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedState}
                  onValueChange={setSelectedState}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a state..." value="" />
                  {states.map((s, i) => (
                    <Picker.Item
                      key={i}
                      label={typeof s === 'string' ? s : s.name || s}
                      value={typeof s === 'string' ? s : s.name || s}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedCity}
                  onValueChange={setSelectedCity}
                  style={styles.picker}
                  enabled={cities.length > 0}
                >
                  <Picker.Item label="Select a city..." value="" />
                  {cities.map((c, i) => (
                    <Picker.Item key={i} label={c} value={c} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Pollutant</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedPollutant}
                  onValueChange={setSelectedPollutant}
                  style={styles.picker}
                >
                  {renderPickerItems(pollutants, 'name', 'id')}
                </Picker>
              </View>
            </View>

            {/* Parameters */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>PARAMETERS</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Latitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="decimal-pad"
                    placeholder="20.5"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Longitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="decimal-pad"
                    placeholder="78.9"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Pollutant Min</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pollutantMin}
                    onChangeText={setPollutantMin}
                    keyboardType="decimal-pad"
                    placeholder="10"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Pollutant Max</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pollutantMax}
                    onChangeText={setPollutantMax}
                    keyboardType="decimal-pad"
                    placeholder="50"
                  />
                </View>
              </View>
            </View>

            {/* Predict Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handlePredict}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Predict AQI</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Result */}
        {result && aqiValue !== null && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>PREDICTION RESULT</Text>
            <View
              style={[
                styles.aqiDisplay,
                { backgroundColor: getAQIColor(aqiValue) + '18' },
              ]}
            >
              <Text style={styles.aqiEmoji}>{getAQIEmoji(aqiValue)}</Text>
              <Text
                style={[styles.aqiNumber, { color: getAQIColor(aqiValue) }]}
              >
                {Math.round(aqiValue)}
              </Text>
              <Text
                style={[
                  styles.aqiCategory,
                  { color: getAQIColor(aqiValue) },
                ]}
              >
                {getAQICategory(aqiValue)}
              </Text>
            </View>
            {result.model_name && (
              <Text style={styles.modelUsedText}>
                Model: {result.model_name}
              </Text>
            )}
          </View>
        )}

        {/* Yogic Advice */}
        {result && yogicData && (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => setShowYogic(!showYogic)}
              style={styles.expandHeader}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.sectionHeader}>YOGIC ADVICE</Text>
                <Text style={styles.yogicLevel}>{yogicData.level}</Text>
              </View>
              <Text style={styles.expandArrow}>
                {showYogic ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showYogic && (
              <View style={styles.yogicContent}>
                <Text style={styles.yogicTitle}>{yogicData.title}</Text>

                <Text style={styles.yogicSubheader}>🧘 Pranayama</Text>
                {yogicData.pranayama.map((p, i) => (
                  <View key={i} style={styles.yogicItem}>
                    <Text style={styles.yogicItemName}>{p.name}</Text>
                    <Text style={styles.yogicItemDesc}>{p.description}</Text>
                  </View>
                ))}

                <Text style={styles.yogicSubheader}>🏋️ Asana</Text>
                {yogicData.asana.map((a, i) => (
                  <View key={i} style={styles.yogicItem}>
                    <Text style={styles.yogicItemName}>{a.name}</Text>
                    <Text style={styles.yogicItemDesc}>{a.description}</Text>
                  </View>
                ))}

                <Text style={styles.yogicSubheader}>⚠️ Precaution</Text>
                <Text style={styles.yogicItemDesc}>{yogicData.precaution}</Text>

                <View style={styles.verdictBox}>
                  <Text style={styles.verdictText}>{yogicData.verdict}</Text>
                </View>
              </View>
            )}
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
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 48,
  },
  inputLabel: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  inputHalf: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  aqiDisplay: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
  },
  aqiEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  aqiNumber: {
    fontSize: 56,
    fontWeight: '700',
  },
  aqiCategory: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
  },
  modelUsedText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandArrow: {
    fontSize: 14,
    color: '#8E8E93',
  },
  yogicLevel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  yogicContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  yogicTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  yogicSubheader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    marginTop: 12,
    marginBottom: 8,
  },
  yogicItem: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
  },
  yogicItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  yogicItemDesc: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  verdictBox: {
    marginTop: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  verdictText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
