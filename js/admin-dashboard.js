// Admin Dashboard JavaScript

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showSection(sectionId) {
  const titles = {
    'dashboard': { title: 'Admin Dashboard', subtitle: 'System overview and management' },
    'all-orders': { title: 'All Orders', subtitle: 'View and manage all pickup orders' },
    'collectors': { title: 'Collectors', subtitle: 'Manage collector accounts' },
    'citizens': { title: 'Citizens', subtitle: 'Manage citizen accounts' },
    'analytics': { title: 'Analytics', subtitle: 'View system analytics' },
    'settings': { title: 'Settings', subtitle: 'System configuration' }
  };

  document.getElementById('page-title').textContent = titles[sectionId].title;
  document.getElementById('page-subtitle').textContent = titles[sectionId].subtitle;

  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  document.getElementById(sectionId).classList.add('active');
  event.target.closest('.nav-link').classList.add('active');

  if (sectionId === 'dashboard') {
    updateDashboard();
  } else if (sectionId === 'all-orders') {
    loadAllOrders();
  }

  document.getElementById('sidebar').classList.remove('active');
}

function updateDashboard() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalWeight = completedOrders.reduce((sum, o) => sum + parseInt(o.weight || 0), 0);

  document.getElementById('total-citizens').textContent = '1';
  document.getElementById('total-orders').textContent = orders.length;
  document.getElementById('total-waste').textContent = totalWeight + ' kg';

  // Show recent orders
  const recentOrders = orders.slice(-5).reverse();
  const tableContainer = document.getElementById('recent-orders-table');

  if (recentOrders.length === 0) {
    tableContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No orders yet</p>';
    return;
  }

  tableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Type</th>
          <th>Weight</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${recentOrders.map(order => `
          <tr>
            <td><strong>${order.id}</strong></td>
            <td>${order.name}</td>
            <td>${order.garbageType}</td>
            <td>${order.weight} kg</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function loadAllOrders() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const container = document.getElementById('all-orders-container');

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Orders</h3>
        <p>No orders have been placed yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Type</th>
            <th>Weight</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td><strong>${order.id}</strong></td>
              <td>${order.name}</td>
              <td>${order.phone}</td>
              <td>${order.garbageType}</td>
              <td>${order.weight} kg</td>
              <td><span class="status-badge status-${order.status}">${order.status}</span></td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function() {
  updateDashboard();
});
