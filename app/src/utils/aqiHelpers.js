export function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function getAQIColor(aqi) {
  if (aqi <= 50) return '#34C759';
  if (aqi <= 100) return '#FFCC00';
  if (aqi <= 150) return '#FF9500';
  if (aqi <= 200) return '#FF3B30';
  if (aqi <= 300) return '#AF52DE';
  return '#8B0000';
}

export function getAQIEmoji(aqi) {
  if (aqi <= 50) return '😊';
  if (aqi <= 100) return '🙂';
  if (aqi <= 150) return '😷';
  if (aqi <= 200) return '😨';
  if (aqi <= 300) return '🤢';
  return '☠️';
}
