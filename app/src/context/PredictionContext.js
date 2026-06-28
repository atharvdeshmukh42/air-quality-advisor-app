import React, { createContext, useState, useContext } from 'react';

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
  const [predictionData, setPredictionData] = useState({
    model_name: '',
    state: '',
    city: '',
    pollutant_id: '',
    latitude: null,
    longitude: null,
    pollutant_min: null,
    pollutant_max: null,
    predicted_aqi: null,
    category: '',
  });

  const updatePrediction = (data) => {
    setPredictionData((prev) => ({ ...prev, ...data }));
  };

  const clearPrediction = () => {
    setPredictionData({
      model_name: '',
      state: '',
      city: '',
      pollutant_id: '',
      latitude: null,
      longitude: null,
      pollutant_min: null,
      pollutant_max: null,
      predicted_aqi: null,
      category: '',
    });
  };

  return (
    <PredictionContext.Provider
      value={{ predictionData, updatePrediction, clearPrediction }}
    >
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  const context = useContext(PredictionContext);
  if (!context) {
    throw new Error('usePrediction must be used within a PredictionProvider');
  }
  return context;
}

export default PredictionContext;
