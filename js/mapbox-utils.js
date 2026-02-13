// Mapbox Utility Functions

let map = null;
let collectorMarker = null;
let citizenMarker = null;
let routeLayer = null;

// Initialize Mapbox Map
function initializeMap(containerId, center = [77.5946, 12.9716], zoom = 12) {
  mapboxgl.accessToken = MAPBOX_TOKEN || 'pk.eyJ1IjoiZGVtbyIsImEiOiJjbGV4YW1wbGUifQ.demo';
  
  map = new mapboxgl.Map({
    container: containerId,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: center,
    zoom: zoom
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl());

  // Add geolocate control
  map.addControl(
    new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    })
  );

  return map;
}

// Add Collector Marker
function addCollectorMarker(lng, lat, collectorName = 'Collector') {
  if (collectorMarker) {
    collectorMarker.remove();
  }

  const el = document.createElement('div');
  el.className = 'collector-marker';
  el.innerHTML = '<i class="fas fa-truck" style="color: #3b82f6; font-size: 24px;"></i>';

  collectorMarker = new mapboxgl.Marker(el)
    .setLngLat([lng, lat])
    .setPopup(new mapboxgl.Popup().setHTML(`<strong>${collectorName}</strong><br>Current Location`))
    .addTo(map);

  return collectorMarker;
}

// Add Citizen Marker
function addCitizenMarker(lng, lat, citizenName = 'Pickup Location') {
  if (citizenMarker) {
    citizenMarker.remove();
  }

  const el = document.createElement('div');
  el.className = 'citizen-marker';
  el.innerHTML = '<i class="fas fa-map-marker-alt" style="color: #10b981; font-size: 28px;"></i>';

  citizenMarker = new mapboxgl.Marker(el)
    .setLngLat([lng, lat])
    .setPopup(new mapboxgl.Popup().setHTML(`<strong>${citizenName}</strong><br>Pickup Location`))
    .addTo(map);

  return citizenMarker;
}

// Update Collector Position (Real-time)
function updateCollectorPosition(lng, lat) {
  if (collectorMarker) {
    collectorMarker.setLngLat([lng, lat]);
  } else {
    addCollectorMarker(lng, lat);
  }
}

// Draw Route between Collector and Citizen
async function drawRoute(collectorLng, collectorLat, citizenLng, citizenLat) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${collectorLng},${collectorLat};${citizenLng},${citizenLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      };

      // Remove existing route layer
      if (map.getLayer('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }

      // Add new route layer
      map.addSource('route', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5,
          'line-opacity': 0.75
        }
      });

      // Fit map to show entire route
      const coordinates = route.geometry.coordinates;
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.fitBounds(bounds, { padding: 50 });

      // Return route info
      return {
        distance: (route.distance / 1000).toFixed(2), // km
        duration: Math.ceil(route.duration / 60), // minutes
        geometry: route.geometry
      };
    }
  } catch (error) {
    console.error('Error drawing route:', error);
    return null;
  }
}

// Geocode Address to Coordinates
async function geocodeAddress(address) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat, fullAddress: data.features[0].place_name };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Reverse Geocode Coordinates to Address
async function reverseGeocode(lng, lat) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    return 'Unknown Location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown Location';
  }
}

// Get Current Location
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          accuracy: position.coords.accuracy
        });
      },
      error => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Calculate Optimized Route for Multiple Stops
async function calculateOptimizedRoute(collectorLocation, pickupLocations) {
  try {
    // Build coordinates string
    const coords = [
      `${collectorLocation.lng},${collectorLocation.lat}`,
      ...pickupLocations.map(loc => `${loc.lng},${loc.lat}`)
    ].join(';');

    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?source=first&destination=any&roundtrip=false&access_token=${mapboxgl.accessToken}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.trips && data.trips.length > 0) {
      return {
        optimizedOrder: data.waypoints.map(wp => wp.waypoint_index),
        totalDistance: (data.trips[0].distance / 1000).toFixed(2),
        totalDuration: Math.ceil(data.trips[0].duration / 60),
        geometry: data.trips[0].geometry
      };
    }
    return null;
  } catch (error) {
    console.error('Route optimization error:', error);
    return null;
  }
}

// Add Multiple Collector Markers (Admin View)
function addMultipleCollectors(collectors) {
  collectors.forEach(collector => {
    if (collector.currentLocation) {
      const el = document.createElement('div');
      el.className = 'collector-marker';
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background: ${collector.isOnline ? '#10b981' : '#6b7280'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `;
      el.innerHTML = '<i class="fas fa-truck"></i>';

      new mapboxgl.Marker(el)
        .setLngLat([collector.currentLocation.longitude, collector.currentLocation.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>${collector.name}</strong><br>
          Status: ${collector.isOnline ? '🟢 Online' : '⚫ Offline'}<br>
          Active Requests: ${collector.activeRequests || 0}
        `))
        .addTo(map);
    }
  });
}

// Create Heatmap Layer (Admin Analytics)
function addHeatmapLayer(orderLocations) {
  const geojson = {
    type: 'FeatureCollection',
    features: orderLocations.map(loc => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.lng, loc.lat]
      },
      properties: {
        weight: loc.weight || 1
      }
    }))
  };

  if (map.getLayer('heatmap')) {
    map.removeLayer('heatmap');
    map.removeSource('heatmap');
  }

  map.addSource('heatmap', {
    type: 'geojson',
    data: geojson
  });

  map.addLayer({
    id: 'heatmap',
    type: 'heatmap',
    source: 'heatmap',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 1,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 0, 255, 0)',
        0.2, 'rgb(0, 255, 255)',
        0.4, 'rgb(0, 255, 0)',
        0.6, 'rgb(255, 255, 0)',
        0.8, 'rgb(255, 165, 0)',
        1, 'rgb(255, 0, 0)'
      ],
      'heatmap-radius': 30,
      'heatmap-opacity': 0.7
    }
  });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeMap,
    addCollectorMarker,
    addCitizenMarker,
    updateCollectorPosition,
    drawRoute,
    geocodeAddress,
    reverseGeocode,
    getCurrentLocation,
    calculateOptimizedRoute,
    addMultipleCollectors,
    addHeatmapLayer
  };
}
