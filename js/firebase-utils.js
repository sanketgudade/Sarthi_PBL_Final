// Firebase Utility Functions

// Generate Unique Order ID
function generateOrderId() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SAR-${dateStr}-${random}`;
}

// Calculate Distance using Haversine Formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Find Nearest Collector
async function findNearestCollector(citizenLat, citizenLon) {
  try {
    // Query online and approved collectors
    const collectorsSnapshot = await db.collection(COLLECTIONS.COLLECTORS)
      .where('isOnline', '==', true)
      .where('isApproved', '==', true)
      .get();

    let nearestCollector = null;
    let minDistance = Infinity;

    collectorsSnapshot.forEach(doc => {
      const collector = doc.data();
      if (collector.currentLocation && collector.activeRequests < 10) {
        const distance = calculateDistance(
          citizenLat,
          citizenLon,
          collector.currentLocation.latitude,
          collector.currentLocation.longitude
        );

        if (distance < 5 && distance < minDistance) {
          minDistance = distance;
          nearestCollector = { id: doc.id, ...collector, distance };
        }
      }
    });

    return nearestCollector;
  } catch (error) {
    console.error('Error finding nearest collector:', error);
    return null;
  }
}

// Send Twilio SMS (Backend Function)
async function sendTwilioSMS(to, message) {
  try {
    // In production, this would call your backend API
    // Backend would use Twilio SDK to send SMS
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message })
    });

    // For demo, simulate SMS
    console.log(`📱 SMS to ${to}: ${message}`);
    showNotification('SMS Sent', `Message sent to ${to}`, 'success');
    return true;
  } catch (error) {
    console.error('SMS Error:', error);
    // Fallback: Show notification instead
    showNotification('SMS Notification', message, 'info');
    return false;
  }
}

// Create Order in Firestore
async function createOrder(orderData) {
  try {
    const orderId = generateOrderId();
    const order = {
      ...orderData,
      id: orderId,
      status: ORDER_STATUS.PENDING,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      qrCode: JSON.stringify({ orderId, ...orderData })
    };

    await db.collection(COLLECTIONS.ORDERS).doc(orderId).set(order);
    return { success: true, orderId, order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error };
  }
}

// Update Order Status
async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      [`${status}At`]: firebase.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    };

    await db.collection(COLLECTIONS.ORDERS).doc(orderId).update(updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error };
  }
}

// Update Collector Location
async function updateCollectorLocation(collectorId, latitude, longitude) {
  try {
    await db.collection(COLLECTIONS.COLLECTORS).doc(collectorId).update({
      currentLocation: new firebase.firestore.GeoPoint(latitude, longitude),
      lastLocationUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating location:', error);
    return false;
  }
}

// Listen to Order Updates (Real-time)
function listenToOrderUpdates(orderId, callback) {
  return db.collection(COLLECTIONS.ORDERS).doc(orderId)
    .onSnapshot(doc => {
      if (doc.exists) {
        callback({ id: doc.id, ...doc.data() });
      }
    }, error => {
      console.error('Error listening to order:', error);
    });
}

// Listen to Collector Location (Real-time)
function listenToCollectorLocation(collectorId, callback) {
  return db.collection(COLLECTIONS.COLLECTORS).doc(collectorId)
    .onSnapshot(doc => {
      if (doc.exists) {
        callback({ id: doc.id, ...doc.data() });
      }
    }, error => {
      console.error('Error listening to collector:', error);
    });
}

// Get All Orders for Admin
async function getAllOrders(filters = {}) {
  try {
    let query = db.collection(COLLECTIONS.ORDERS);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.date) {
      query = query.where('createdAt', '>=', filters.date);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

// Get Collector Statistics
async function getCollectorStats(collectorId) {
  try {
    const ordersSnapshot = await db.collection(COLLECTIONS.ORDERS)
      .where('collectorId', '==', collectorId)
      .where('status', '==', ORDER_STATUS.COMPLETED)
      .get();

    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const totalWeight = orders.reduce((sum, o) => sum + (parseInt(o.weight) || 0), 0);

    return {
      totalPickups: orders.length,
      totalWeight,
      averageRating: orders.reduce((sum, o) => sum + (o.rating || 0), 0) / orders.length || 0
    };
  } catch (error) {
    console.error('Error getting collector stats:', error);
    return { totalPickups: 0, totalWeight: 0, averageRating: 0 };
  }
}

// Notification Helper
function showNotification(title, message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#dc2626' : '#3b82f6'};
    color: white;
    padding: 20px 25px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 15px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" 
         style="font-size: 1.5rem;"></i>
      <div style="flex: 1;">
        <h4 style="margin: 0 0 5px 0; font-size: 1.1rem;">${title}</h4>
        <p style="margin: 0; font-size: 0.9rem; opacity: 0.95;">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0;">
        ×
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}
