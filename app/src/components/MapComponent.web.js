import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ children, style, region }) => {
  // 1. Gather all coordinates from children to determine bounds
  let allCoords = [];
  React.Children.forEach(children, child => {
    if (!child) return;
    if (child.props && child.props.coordinates) {
      allCoords.push(...child.props.coordinates);
    } else if (child.props && child.props.coordinate) {
      allCoords.push(child.props.coordinate);
    }
  });

  // If no coords, render a default message or simple grid
  if (allCoords.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.gridBackground}>
          <View style={styles.gridLineH} />
          <View style={styles.gridLineH2} />
          <View style={styles.gridLineV} />
          <View style={styles.gridLineV2} />
        </View>
        <Text style={styles.noRouteText}>🗺️ Enter route details above to display the map</Text>
      </View>
    );
  }

  // Calculate bounds
  const lats = allCoords.map(c => c.latitude);
  const lngs = allCoords.map(c => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat || 0.00001;
  const lngSpan = maxLng - minLng || 0.00001;

  // Map lats/lngs to a viewBox of 0 to 100 with 15% padding
  const mapLngToX = (lng) => {
    return 15 + ((lng - minLng) / lngSpan) * 70;
  };
  const mapLatToY = (lat) => {
    return 85 - ((lat - minLat) / latSpan) * 70;
  };

  // 2. Render children into SVG elements
  const renderedElements = [];
  React.Children.forEach(children, (child, idx) => {
    if (!child) return;

    if (child.props && child.props.coordinates) {
      const coords = child.props.coordinates || [];
      if (coords.length > 1) {
        const points = coords.map(c => `${mapLngToX(c.longitude)},${mapLatToY(c.latitude)}`).join(' ');
        renderedElements.push(
          <polyline
            key={`poly-${idx}`}
            points={points}
            fill="none"
            stroke={child.props.strokeColor || '#007AFF'}
            strokeWidth={child.props.strokeWidth || 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }
    } else if (child.props && child.props.coordinate) {
      const coord = child.props.coordinate;
      const x = mapLngToX(coord.longitude);
      const y = mapLatToY(coord.latitude);
      const color = child.props.pinColor || '#FF3B30';
      renderedElements.push(
        <g key={`marker-${idx}`}>
          {/* Pulse effect */}
          <circle
            cx={x}
            cy={y}
            r={8}
            fill={color}
            opacity={0.25}
          />
          {/* Marker pin */}
          <circle
            cx={x}
            cy={y}
            r={4}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Label tooltip */}
          {child.props.title && (
            <g>
              <rect
                x={x - 25}
                y={y - 20}
                width={50}
                height={12}
                rx={2}
                fill="#1C1C1E"
                opacity={0.8}
              />
              <text
                x={x}
                y={y - 12}
                fill="#FFFFFF"
                fontSize={7}
                fontWeight="bold"
                textAnchor="middle"
              >
                {child.props.title}
              </text>
            </g>
          )}
        </g>
      );
    }
  });

  return (
    <View style={[styles.container, style]}>
      {/* Grid lines background */}
      <View style={styles.gridBackground}>
        <View style={styles.gridLineH} />
        <View style={styles.gridLineH2} />
        <View style={styles.gridLineV} />
        <View style={styles.gridLineV2} />
      </View>
      <svg
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {renderedElements}
      </svg>
      {/* Soft indicator of web fallback */}
      <View style={styles.webBadge}>
        <Text style={styles.webBadgeText}>💻 Web Preview (Interactive map on mobile)</Text>
      </View>
    </View>
  );
};

const Polyline = () => null;
const Marker = () => null;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2F2F7',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  gridBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  gridLineH: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
  },
  gridLineV: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#000000',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#000000',
  },
  noRouteText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    padding: 20,
    marginTop: '30%',
  },
  webBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(28, 28, 30, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  webBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default MapView;
export { Polyline, Marker };
