// Firebase Configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "sarathi-waste.firebaseapp.com",
  projectId: "sarathi-waste",
  storageBucket: "sarathi-waste.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Mapbox Configuration
const MAPBOX_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';

// Twilio Configuration (Backend)
const TWILIO_CONFIG = {
  accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: 'YOUR_TWILIO_AUTH_TOKEN',
  phoneNumber: 'YOUR_TWILIO_PHONE_NUMBER'
};

// Initialize Firebase
let app, auth, db;

function initializeFirebase() {
  try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // Fallback to localStorage for demo
    console.log('📦 Using localStorage as fallback');
    return false;
  }
}

// Firestore Collections Structure
const COLLECTIONS = {
  CITIZENS: 'citizens',
  COLLECTORS: 'collectors',
  ADMINS: 'admins',
  ORDERS: 'orders',
  COMPLAINTS: 'complaints',
  ANALYTICS: 'analytics'
};

// Order Status Flow
const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COLLECTOR_ARRIVED: 'collector_arrived',
  QR_VERIFIED: 'qr_verified',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// User Roles
const USER_ROLES = {
  CITIZEN: 'citizen',
  COLLECTOR: 'collector',
  ADMIN: 'admin'
};

// Export configurations
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    firebaseConfig,
    MAPBOX_TOKEN,
    TWILIO_CONFIG,
    COLLECTIONS,
    ORDER_STATUS,
    USER_ROLES,
    initializeFirebase
  };
}
