// Citizen Dashboard JavaScript
let orders = [];
let orderCounter = 1;
let stream = null;
let model = null;
let currentOrderListener = null;
let collectorLocationListener = null;
let trackingMap = null;

// Initialize Firebase on page load
document.addEventListener('DOMContentLoaded', async function() {
  initializeFirebase();
  
  // Try to load from Firestore, fallback to localStorage
  await loadOrdersFromFirestore();
  
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('pickup-date');
  if (dateInput) {
    dateInput.setAttribute('min', today);
  }

  updateStats();
  loadOrders();
});

// Load orders from Firestore
async function loadOrdersFromFirestore() {
  if (typeof db !== 'undefined' && db) {
    try {
      const userId = auth.currentUser?.uid || 'demo-user';
      const snapshot = await db.collection(COLLECTIONS.ORDERS)
        .where('citizenId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return;
    } catch (error) {
      console.log('Using localStorage fallback');
    }
  }
  
  // Fallback to localStorage
  orders = JSON.parse(localStorage.getItem('orders')) || [];
  orderCounter = parseInt(localStorage.getItem('orderCounter')) || 1;
}

// Toggle Sidebar for Mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Show Section
function showSection(sectionId) {
  // Update page title
  const titles = {
    'dashboard': { title: 'Dashboard', subtitle: 'Manage your waste collection requests' },
    'request-pickup': { title: 'Request Pickup', subtitle: 'Schedule a new garbage collection' },
    'my-orders': { title: 'My Orders', subtitle: 'Track your active requests' },
    'scan-garbage': { title: 'Scan Garbage', subtitle: 'Detect garbage type automatically' },
    'history': { title: 'History', subtitle: 'View completed collections' },
    'profile': { title: 'Profile', subtitle: 'Manage your account' }
  };

  document.getElementById('page-title').textContent = titles[sectionId].title;
  document.getElementById('page-subtitle').textContent = titles[sectionId].subtitle;

  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Add active class to clicked nav link
  event.target.closest('.nav-link').classList.add('active');

  // Load data for specific sections
  if (sectionId === 'my-orders') {
    loadOrders();
  } else if (sectionId === 'history') {
    loadHistory();
  } else if (sectionId === 'dashboard') {
    updateStats();
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('active');
}

// Submit Pickup Request
async function submitPickupRequest(event) {
  event.preventDefault();

  const orderData = {
    citizenId: auth.currentUser?.uid || 'demo-user',
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    location: document.getElementById('location').value,
    garbageType: document.getElementById('garbage-type').value,
    weight: document.getElementById('weight').value,
    pickupDate: document.getElementById('pickup-date').value,
    pickupTime: document.getElementById('pickup-time').value,
    notes: document.getElementById('notes').value
  };

  // Get coordinates from location link or current location
  let coordinates = await extractCoordinatesFromLink(orderData.location);
  if (!coordinates) {
    try {
      const currentLoc = await getCurrentLocation();
      coordinates = { lat: currentLoc.lat, lng: currentLoc.lng };
    } catch (error) {
      alert('Please provide a valid location or enable location services');
      return;
    }
  }

  orderData.coordinates = coordinates;

  // Create order in Firestore or localStorage
  let result;
  if (typeof db !== 'undefined' && db) {
    result = await createOrder(orderData);
  } else {
    // Fallback to localStorage
    const orderId = generateOrderId();
    result = {
      success: true,
      orderId,
      order: { ...orderData, id: orderId, status: 'pending', createdAt: new Date().toISOString() }
    };
    orders.push(result.order);
    localStorage.setItem('orders', JSON.stringify(orders));
  }

  if (result.success) {
    // Find and assign nearest collector
    const nearestCollector = await findNearestCollector(coordinates.lat, coordinates.lng);
    
    if (nearestCollector) {
      // Auto-assign to nearest collector
      if (typeof db !== 'undefined' && db) {
        await updateOrderStatus(result.orderId, ORDER_STATUS.ACCEPTED, {
          collectorId: nearestCollector.id,
          collectorName: nearestCollector.name,
          collectorPhone: nearestCollector.phone
        });
      }
      
      showNotification(
        'Collector Assigned!',
        `${nearestCollector.name} is ${nearestCollector.distance.toFixed(1)}km away`,
        'success'
      );
    }

    // Generate QR Code
    document.getElementById('qr-result').style.display = 'block';
    document.getElementById('order-id').textContent = result.orderId;
    document.getElementById('qrcode').innerHTML = '';

    new QRCode(document.getElementById('qrcode'), {
      text: JSON.stringify({ orderId: result.orderId, ...orderData }),
      width: 256,
      height: 256,
      colorDark: '#0f3d2e',
      colorLight: '#ffffff'
    });

    document.getElementById('pickup-form').style.display = 'none';
    
    // Start listening to order updates
    startOrderTracking(result.orderId);
    
    updateStats();
  } else {
    alert('Failed to create order. Please try again.');
  }
}

// Extract coordinates from Google Maps link
async function extractCoordinatesFromLink(link) {
  try {
    // Try to extract from various Google Maps URL formats
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,  // @lat,lng
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // !3dlat!4dlng
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/ // q=lat,lng
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    }

    // If no match, try geocoding the address
    const address = document.getElementById('address').value;
    const geocoded = await geocodeAddress(address);
    return geocoded ? { lat: geocoded.lat, lng: geocoded.lng } : null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

// Start tracking order updates
function startOrderTracking(orderId) {
  if (currentOrderListener) {
    currentOrderListener();
  }

  if (typeof db !== 'undefined' && db) {
    currentOrderListener = listenToOrderUpdates(orderId, (order) => {
      handleOrderStatusUpdate(order);
    });
  }
}

// Handle order status updates
function handleOrderStatusUpdate(order) {
  switch (order.status) {
    case ORDER_STATUS.ACCEPTED:
      showNotification(
        'Collector Assigned!',
        `${order.collectorName} has accepted your request`,
        'success'
      );
      break;
      
    case ORDER_STATUS.COLLECTOR_ARRIVED:
      showNotification(
        'Collector Arrived!',
        'Your collector has arrived at your location. Please show the QR code.',
        'success'
      );
      // Send SMS via Twilio
      sendTwilioSMS(
        order.phone,
        `🟢 Sarathi Alert: Collector has arrived at your location. Please show the QR code for verification. Order ID: ${order.id}`
      );
      break;
      
    case ORDER_STATUS.QR_VERIFIED:
      showNotification(
        'QR Verified!',
        'Collection in progress...',
        'info'
      );
      break;
      
    case ORDER_STATUS.COMPLETED:
      showNotification(
        'Collection Completed!',
        'Thank you for using Sarathi! 🌱',
        'success'
      );
      // Send SMS via Twilio
      sendTwilioSMS(
        order.phone,
        `✅ Sarathi: Your waste collection is complete! Order ID: ${order.id}. Thank you for using Sarathi! 🌱`
      );
      // Stop tracking
      if (currentOrderListener) {
        currentOrderListener();
      }
      if (collectorLocationListener) {
        collectorLocationListener();
      }
      break;
  }
  
  loadOrders();
  updateStats();
}

// Load Orders
function loadOrders() {
  const container = document.getElementById('orders-container');
  const activeOrders = orders.filter(o => o.status !== 'completed');

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Active Orders</h3>
        <p>You don't have any active pickup requests</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>Order #${order.id}</h3>
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 5px;">
            ${new Date(order.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>
      <div class="order-details">
        <div class="detail-item">
          <span class="detail-label">Garbage Type</span>
          <span class="detail-value">${formatGarbageType(order.garbageType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Weight</span>
          <span class="detail-value">${order.weight} kg</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Pickup Date</span>
          <span class="detail-value">${order.pickupDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time</span>
          <span class="detail-value">${order.pickupTime}</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 0.9rem;">
          <i class="fas fa-map-marker-alt"></i> ${order.address}
        </p>
      </div>
    </div>
  `).join('');
}

// Load History
function loadHistory() {
  const container = document.getElementById('history-container');
  const completedOrders = orders.filter(o => o.status === 'completed');

  if (completedOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-history"></i>
        <h3>No History</h3>
        <p>You don't have any completed collections yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = completedOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>Order #${order.id}</h3>
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 5px;">
            Completed on ${new Date(order.completedAt).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <span class="status-badge status-completed">COMPLETED</span>
      </div>
      <div class="order-details">
        <div class="detail-item">
          <span class="detail-label">Garbage Type</span>
          <span class="detail-value">${formatGarbageType(order.garbageType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Weight</span>
          <span class="detail-value">${order.weight} kg</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Eco Points Earned</span>
          <span class="detail-value" style="color: #10b981;">+${order.weight * 2}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Update Stats
function updateStats() {
  const totalPickups = orders.length;
  const pendingRequests = orders.filter(o => o.status === 'pending' || o.status === 'assigned' || o.status === 'inprogress').length;
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalWeight = completedOrders.reduce((sum, o) => sum + parseInt(o.weight || 0), 0);
  const ecoPoints = totalWeight * 2;

  document.getElementById('total-pickups').textContent = totalPickups;
  document.getElementById('pending-requests').textContent = pendingRequests;
  document.getElementById('total-weight').textContent = totalWeight + ' kg';
  document.getElementById('eco-points').textContent = ecoPoints;
}

// Format Garbage Type
function formatGarbageType(type) {
  const types = {
    'wet': 'Wet Waste (Organic)',
    'dry': 'Dry Waste (Recyclable)',
    'e-waste': 'E-Waste',
    'hazardous': 'Hazardous Waste',
    'mixed': 'Mixed Waste'
  };
  return types[type] || type;
}

// Download QR Code
function downloadQR() {
  const canvas = document.querySelector('#qrcode canvas');
  if (canvas) {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-code-${document.getElementById('order-id').textContent}.png`;
    link.href = url;
    link.click();
  }
}

// Reset Form
function resetForm() {
  document.getElementById('pickup-form').reset();
  document.getElementById('pickup-form').style.display = 'block';
  document.getElementById('qr-result').style.display = 'none';
}

// Garbage Detection with Camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('video');
    video.srcObject = stream;

    // Load model if not already loaded
    if (!model) {
      document.getElementById('detection-result').style.display = 'block';
      document.getElementById('detected-type').textContent = 'Loading AI model...';
      document.getElementById('confidence').textContent = 'Please wait';
      
      model = await cocoSsd.load();
      
      document.getElementById('detected-type').textContent = 'Model loaded! Point camera at garbage';
      document.getElementById('confidence').textContent = 'Detection will start automatically';
    }

    // Start detection
    detectGarbage();
  } catch (error) {
    console.error('Camera error:', error);
    alert('Camera access denied or not available. Please check your browser permissions.');
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('video').srcObject = null;
    document.getElementById('detection-result').style.display = 'none';
  }
}

async function detectGarbage() {
  if (!stream) return;

  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  if (model && video.videoWidth > 0) {
    try {
      const predictions = await model.detect(canvas);

      if (predictions.length > 0) {
        const detected = predictions[0];
        const resultDiv = document.getElementById('detection-result');
        resultDiv.style.display = 'block';

        let garbageType = classifyGarbage(detected.class);

        document.getElementById('detected-type').textContent = garbageType;
        document.getElementById('confidence').textContent = `Confidence: ${(detected.score * 100).toFixed(1)}% | Detected: ${detected.class}`;
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }

  // Continue detection
  setTimeout(detectGarbage, 1000);
}

function classifyGarbage(detectedClass) {
  const wetWaste = ['banana', 'apple', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'];
  const dryWaste = ['bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl', 'book', 'vase'];
  const eWaste = ['cell phone', 'laptop', 'keyboard', 'mouse', 'remote', 'tv', 'clock'];

  if (wetWaste.includes(detectedClass.toLowerCase())) {
    return 'Wet Waste (Organic)';
  } else if (dryWaste.includes(detectedClass.toLowerCase())) {
    return 'Dry Waste (Recyclable)';
  } else if (eWaste.includes(detectedClass.toLowerCase())) {
    return 'E-Waste';
  } else {
    return 'Mixed Waste';
  }
}

// Set minimum date to today for pickup date input
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('pickup-date');
  if (dateInput) {
    dateInput.setAttribute('min', today);
  }

  // Initialize stats
  updateStats();
  loadOrders();
});


// Track Collector Function
async function trackCollector(orderId) {
  showSection('track-collector');
  
  // Get order details
  let order;
  if (typeof db !== 'undefined' && db) {
    const doc = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get();
    order = { id: doc.id, ...doc.data() };
  } else {
    order = orders.find(o => o.id === orderId);
  }

  if (!order || !order.collectorId) {
    alert('Collector not assigned yet');
    return;
  }

  // Update tracking info
  document.getElementById('collector-name').textContent = `Collector: ${order.collectorName || 'Unknown'}`;
  document.getElementById('collector-phone').textContent = `Phone: ${order.collectorPhone || 'N/A'}`;
  document.getElementById('eta-display').textContent = 'Calculating ETA...';

  // Initialize map
  if (!trackingMap) {
    trackingMap = initializeMap('map-container', [order.coordinates.lng, order.coordinates.lat], 13);
  }

  // Add citizen marker
  addCitizenMarker(order.coordinates.lng, order.coordinates.lat, 'Your Location');

  // Listen to collector location updates
  if (typeof db !== 'undefined' && db) {
    collectorLocationListener = listenToCollectorLocation(order.collectorId, async (collector) => {
      if (collector.currentLocation) {
        const collectorLng = collector.currentLocation.longitude;
        const collectorLat = collector.currentLocation.latitude;

        // Update collector marker
        updateCollectorPosition(collectorLng, collectorLat);

        // Draw route and calculate ETA
        const routeInfo = await drawRoute(
          collectorLng,
          collectorLat,
          order.coordinates.lng,
          order.coordinates.lat
        );

        if (routeInfo) {
          document.getElementById('eta-display').textContent = 
            `ETA: ${routeInfo.duration} min | Distance: ${routeInfo.distance} km`;
        }
      }
    });
  } else {
    // Demo mode: simulate collector movement
    simulateCollectorMovement(order.coordinates);
  }
}

// Simulate collector movement for demo
function simulateCollectorMovement(destination) {
  let currentLat = destination.lat + 0.01;
  let currentLng = destination.lng + 0.01;

  const interval = setInterval(async () => {
    currentLat -= 0.001;
    currentLng -= 0.001;

    updateCollectorPosition(currentLng, currentLat);

    const routeInfo = await drawRoute(currentLng, currentLat, destination.lng, destination.lat);
    if (routeInfo) {
      document.getElementById('eta-display').textContent = 
        `ETA: ${routeInfo.duration} min | Distance: ${routeInfo.distance} km`;
    }

    // Stop when close enough
    if (Math.abs(currentLat - destination.lat) < 0.001) {
      clearInterval(interval);
      document.getElementById('eta-display').textContent = 'Collector has arrived!';
    }
  }, 3000);
}

// Update Load Orders to include Track button
function loadOrders() {
  const container = document.getElementById('orders-container');
  const activeOrders = orders.filter(o => o.status !== 'completed');

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Active Orders</h3>
        <p>You don't have any active pickup requests</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>Order #${order.id}</h3>
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 5px;">
            ${new Date(order.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>
      <div class="order-details">
        <div class="detail-item">
          <span class="detail-label">Garbage Type</span>
          <span class="detail-value">${formatGarbageType(order.garbageType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Weight</span>
          <span class="detail-value">${order.weight} kg</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Pickup Date</span>
          <span class="detail-value">${order.pickupDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time</span>
          <span class="detail-value">${order.pickupTime}</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 0.9rem;">
          <i class="fas fa-map-marker-alt"></i> ${order.address}
        </p>
      </div>
      ${(order.status === 'accepted' || order.status === 'inprogress' || order.status === 'collector_arrived') ? `
        <div class="task-actions">
          <button class="btn btn-primary" onclick="trackCollector('${order.id}')">
            <i class="fas fa-map-marked-alt"></i> Track Collector
          </button>
          ${order.collectorPhone ? `
            <button class="btn btn-outline" onclick="window.open('tel:${order.collectorPhone}')">
              <i class="fas fa-phone"></i> Call Collector
            </button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Set minimum date to today for pickup date input
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('pickup-date');
  if (dateInput) {
    dateInput.setAttribute('min', today);
  }

  // Initialize stats
  updateStats();
  loadOrders();
});
