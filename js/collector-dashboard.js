// Collector Dashboard JavaScript
let html5QrCode = null;
let scannedOrderData = null;

// Toggle Sidebar for Mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Show Section
function showSection(sectionId) {
  // Update page title
  const titles = {
    'dashboard': { title: 'Dashboard', subtitle: 'Your daily collection route' },
    'my-tasks': { title: 'My Tasks', subtitle: 'Assigned pickup requests' },
    'qr-scanner': { title: 'QR Scanner', subtitle: 'Scan to verify collection' },
    'route-map': { title: 'Route Map', subtitle: 'Optimized collection route' },
    'history': { title: 'History', subtitle: 'Completed collections' },
    'profile': { title: 'Profile', subtitle: 'Your account information' }
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
  if (sectionId === 'my-tasks') {
    loadTasks();
  } else if (sectionId === 'history') {
    loadHistory();
  } else if (sectionId === 'dashboard') {
    updateStats();
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('active');
}

// Load Tasks
function loadTasks() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const myTasks = orders.filter(o => o.status !== 'completed');
  const container = document.getElementById('tasks-container');

  if (myTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <h3>No Tasks Assigned</h3>
        <p>You don't have any active pickup tasks</p>
      </div>
    `;
    return;
  }

  container.innerHTML = myTasks.map(task => `
    <div class="order-card" id="task-${task.id}">
      <div class="order-header">
        <div>
          <h3>Order #${task.id}</h3>
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 5px;">
            Requested on ${new Date(task.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <span class="status-badge status-${task.status}">${task.status}</span>
      </div>
      
      <div class="order-details">
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-user"></i> Customer</span>
          <span class="detail-value">${task.name}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-phone"></i> Phone</span>
          <span class="detail-value">${task.phone}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-trash"></i> Type</span>
          <span class="detail-value">${formatGarbageType(task.garbageType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-weight"></i> Weight</span>
          <span class="detail-value">${task.weight} kg</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-calendar"></i> Date</span>
          <span class="detail-value">${task.pickupDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-clock"></i> Time</span>
          <span class="detail-value">${task.pickupTime}</span>
        </div>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 8px;">
          <i class="fas fa-map-marker-alt"></i> ${task.address}
        </p>
        <a href="${task.location}" target="_blank" style="color: #3b82f6; font-size: 0.9rem; text-decoration: none; font-weight: 600;">
          <i class="fas fa-external-link-alt"></i> Open in Google Maps
        </a>
      </div>

      ${task.notes ? `
        <div style="margin-top: 15px; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;"><strong>Notes:</strong></p>
          <p style="color: #374151; font-size: 0.9rem;">${task.notes}</p>
        </div>
      ` : ''}

      <div class="task-actions">
        ${task.status === 'pending' ? `
          <button class="btn btn-primary" onclick="acceptTask('${task.id}')">
            <i class="fas fa-check"></i> Accept Task
          </button>
        ` : ''}
        ${task.status === 'assigned' ? `
          <button class="btn btn-primary" onclick="markReached('${task.id}')">
            <i class="fas fa-map-marker-alt"></i> I'm Reached
          </button>
          <button class="btn btn-outline" onclick="window.open('${task.location}', '_blank')">
            <i class="fas fa-directions"></i> Get Directions
          </button>
        ` : ''}
        ${task.status === 'inprogress' ? `
          <button class="btn btn-primary" onclick="showSection('qr-scanner')">
            <i class="fas fa-qrcode"></i> Scan QR Code
          </button>
          <button class="btn btn-outline" onclick="window.open('tel:${task.phone}')">
            <i class="fas fa-phone"></i> Call Customer
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  updateStats();
}

// Accept Task
function acceptTask(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex !== -1) {
    orders[orderIndex].status = 'assigned';
    orders[orderIndex].assignedAt = new Date().toISOString();
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Show success message
    showNotification('Task Accepted!', 'Navigate to the location to start collection', 'success');
    
    loadTasks();
  }
}

// Mark Reached
function markReached(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex !== -1) {
    orders[orderIndex].status = 'inprogress';
    orders[orderIndex].reachedAt = new Date().toISOString();
    localStorage.setItem('orders', JSON.stringify(orders));

    // Simulate Twilio notification
    const customerPhone = orders[orderIndex].phone;
    const customerName = orders[orderIndex].name;
    
    showNotification(
      'Notification Sent!', 
      `SMS sent to ${customerName} (${customerPhone}): "Your collector has arrived at your location!"`,
      'success'
    );

    loadTasks();
  }
}

// QR Scanner Functions
function startScanner() {
  if (html5QrCode) {
    stopScanner();
  }

  html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    },
    onScanSuccess,
    onScanFailure
  ).catch(err => {
    console.error("Unable to start scanner", err);
    showNotification('Scanner Error', 'Camera access denied or not available', 'error');
  });
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    }).catch(err => {
      console.error("Error stopping scanner", err);
    });
  }
}

function onScanSuccess(decodedText, decodedResult) {
  try {
    scannedOrderData = JSON.parse(decodedText);

    document.getElementById('scan-result').style.display = 'block';
    document.getElementById('scanned-order-details').innerHTML = `
      <div style="text-align: left; background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;">Order ID</p>
            <p style="color: #1f2937; font-weight: 600; font-size: 1.1rem;">${scannedOrderData.id}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;">Customer Name</p>
            <p style="color: #1f2937; font-weight: 600;">${scannedOrderData.name}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;">Garbage Type</p>
            <p style="color: #1f2937; font-weight: 600;">${formatGarbageType(scannedOrderData.garbageType)}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;">Weight</p>
            <p style="color: #1f2937; font-weight: 600;">${scannedOrderData.weight} kg</p>
          </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 5px;">Address</p>
          <p style="color: #1f2937;">${scannedOrderData.address}</p>
        </div>
      </div>
    `;

    stopScanner();
    showNotification('QR Code Scanned!', 'Order details verified successfully', 'success');
  } catch (error) {
    console.error("Invalid QR code", error);
    showNotification('Invalid QR Code', 'Please scan a valid order QR code', 'error');
  }
}

function onScanFailure(error) {
  // Handle scan failure silently
}

function resetScanner() {
  document.getElementById('scan-result').style.display = 'none';
  scannedOrderData = null;
  startScanner();
}

function completeCollection() {
  if (!scannedOrderData) {
    showNotification('Error', 'No order scanned', 'error');
    return;
  }

  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const orderIndex = orders.findIndex(o => o.id === scannedOrderData.id);

  if (orderIndex !== -1) {
    orders[orderIndex].status = 'completed';
    orders[orderIndex].completedAt = new Date().toISOString();
    localStorage.setItem('orders', JSON.stringify(orders));

    showNotification(
      'Collection Completed!', 
      `Order #${scannedOrderData.id} has been marked as completed`,
      'success'
    );

    document.getElementById('scan-result').style.display = 'none';
    scannedOrderData = null;

    // Redirect to tasks
    setTimeout(() => {
      showSection('my-tasks');
    }, 2000);
  }
}

// Load History
function loadHistory() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const completedOrders = orders.filter(o => o.status === 'completed');
  const container = document.getElementById('history-container');

  if (completedOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-history"></i>
        <h3>No History</h3>
        <p>You haven't completed any collections yet</p>
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
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <span class="status-badge status-completed">COMPLETED</span>
      </div>
      <div class="order-details">
        <div class="detail-item">
          <span class="detail-label">Customer</span>
          <span class="detail-value">${order.name}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Garbage Type</span>
          <span class="detail-value">${formatGarbageType(order.garbageType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Weight</span>
          <span class="detail-value">${order.weight} kg</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Address</span>
          <span class="detail-value">${order.address}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Update Stats
function updateStats() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const myTasks = orders.filter(o => o.status !== 'completed');
  const completedToday = orders.filter(o => {
    if (o.status === 'completed' && o.completedAt) {
      const completedDate = new Date(o.completedAt).toDateString();
      const today = new Date().toDateString();
      return completedDate === today;
    }
    return false;
  });
  const totalWeight = completedToday.reduce((sum, o) => sum + parseInt(o.weight || 0), 0);

  document.getElementById('total-tasks').textContent = myTasks.length;
  document.getElementById('completed-tasks').textContent = completedToday.length;
  document.getElementById('total-weight').textContent = totalWeight + ' kg';
}

// Format Garbage Type
function formatGarbageType(type) {
  const types = {
    'wet': 'Wet Waste',
    'dry': 'Dry Waste',
    'e-waste': 'E-Waste',
    'hazardous': 'Hazardous',
    'mixed': 'Mixed Waste'
  };
  return types[type] || type;
}

// Show Notification
function showNotification(title, message, type = 'info') {
  // Create notification element
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
              style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0; line-height: 1;">
        ×
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  updateStats();
  loadTasks();
});
