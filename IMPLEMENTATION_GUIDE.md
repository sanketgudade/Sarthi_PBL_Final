# Sarathi Smart Waste Management - Complete Implementation Guide

## 🎯 System Overview

Three-actor system with Firebase, Mapbox (free tier), and Twilio SMS integration.

### Actors:
1. **Citizen** - Requests garbage pickup
2. **Collector** - Serves pickup requests
3. **Municipal Admin** - Manages entire ecosystem

---

## 📋 Prerequisites

### 1. Firebase Setup
```bash
# Create Firebase project at console.firebase.google.com
# Enable Authentication (Email/Password, Phone)
# Enable Firestore Database
# Get configuration credentials
```

### 2. Mapbox Setup
```bash
# Sign up at mapbox.com (Free tier: 50,000 requests/month)
# Get Access Token
# Enable: Geocoding, Directions, Maps
```

### 3. Twilio Setup
```bash
# Sign up at twilio.com
# Get Account SID, Auth Token, Phone Number
# Verify phone numbers for testing
```

---

## 🗄️ Firestore Database Structure

### Collections:

#### 1. `citizens`
```javascript
{
  userId: "string",
  name: "string",
  email: "string",
  phone: "string",
  address: "string",
  location: GeoPoint,
  createdAt: Timestamp,
  isActive: boolean,
  totalOrders: number,
  ecoPoints: number
}
```

#### 2. `collectors`
```javascript
{
  collectorId: "string",
  name: "string",
  email: "string",
  phone: "string",
  vehicleType: "string",
  vehicleNumber: "string",
  zone: "string",
  isOnline: boolean,
  isApproved: boolean,
  currentLocation: GeoPoint,
  activeRequests: number,
  totalCompleted: number,
  rating: number,
  lastLocationUpdate: Timestamp
}
```

#### 3. `orders`
```javascript
{
  orderId: "SAR-YYYYMMDD-XXXXXX",
  citizenId: "string",
  citizenName: "string",
  citizenPhone: "string",
  collectorId: "string" | null,
  collectorName: "string" | null,
  
  // Location
  address: "string",
  location: GeoPoint,
  locationLink: "string",
  
  // Waste Details
  garbageType: "wet|dry|e-waste|hazardous|mixed",
  weight: number,
  bags: number,
  
  // Scheduling
  scheduledDate: "YYYY-MM-DD",
  scheduledTime: "HH:MM",
  preferredTime: "asap|scheduled",
  
  // Status Flow
  status: "pending|accepted|collector_arrived|qr_verified|completed|cancelled",
  
  // Timestamps
  createdAt: Timestamp,
  acceptedAt: Timestamp | null,
  arrivedAt: 