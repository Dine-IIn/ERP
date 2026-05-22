# 🚀 Enterprise ERP System

**Production-Ready, Multi-Platform ERP Solution**

A comprehensive, enterprise-grade ERP system built with Node.js backend and Flutter frontend, supporting Windows, Android, iOS, and macOS from a single codebase.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.0+-blue.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Platform-Specific Builds](#-platform-specific-builds)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔐 Authentication & Authorization
- ✅ **Super Admin System** - Create and manage companies
- ✅ **Multi-Company Support** - Isolated data per company
- ✅ **OTP Verification** - Email & SMS verification during signup
- ✅ **Role-Based Access Control (RBAC)** - Granular permissions
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **2FA Support** - Two-factor authentication ready

### 🏢 Company Management
- ✅ Company creation and configuration
- ✅ Subscription management (Trial, Basic, Standard, Premium, Enterprise)
- ✅ Feature toggles per subscription
- ✅ User limits and storage quotas
- ✅ Multi-branch/factory support

### 💬 Communication & Collaboration
- ✅ **Real-time Chat** - General and group chats with Socket.io
- ✅ **Expense Chat** - Track and share expenses
- ✅ **Expense Visibility Controls** - Own/Group/All visibility
- ✅ **File Sharing** - Attachments in chats
- ✅ **Typing Indicators** - Real-time presence
- ✅ **Read Receipts** - Message tracking

### 📊 Complete ERP Modules
- ✅ CRM (Customer Relationship Management)
- ✅ Sales & Order Management
- ✅ Purchase & Procurement
- ✅ Inventory & Warehouse Management
- ✅ Manufacturing / Production Management
- ✅ Finance & Accounting
- ✅ Human Resource Management (HRM)
- ✅ Project Management
- ✅ Supply Chain Management (SCM)
- ✅ Quality Management System (QMS)
- ✅ Maintenance Management
- ✅ Retail / POS System
- ✅ E-Commerce Integration
- ✅ Analytics & Business Intelligence

### 🌐 Cross-Platform Support
- ✅ Windows Desktop App
- ✅ Android Mobile App
- ✅ iOS Mobile App
- ✅ macOS Desktop App
- Single Flutter codebase for all platforms

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Flutter Frontend                       │
│  (Windows, Android, iOS, macOS)                         │
│                                                          │
│  • Provider State Management                            │
│  • Material Design 3                                    │
│  • Socket.io Client                                     │
│  • Offline Support                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTPS/WSS
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Node.js Backend API                         │
│                                                          │
│  • Express.js REST API                                  │
│  • Socket.io Real-time                                  │
│  • JWT Authentication                                   │
│  • Rate Limiting & Security                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────────────────────┐
│             PostgreSQL Database                          │
│                                                          │
│  • Sequelize ORM                                        │
│  • JSONB for Flexible Data                             │
│  • Row-Level Security                                   │
│  • Automated Backups                                    │
└──────────────────────────────────────────────────────────┘

External Services:
├── Twilio (SMS OTP)
├── SMTP (Email OTP)
├── AWS S3 (File Storage - Optional)
└── Redis (Caching - Optional)
```

---

## 📦 Prerequisites

### Backend Requirements
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **npm** >= 9.0.0
- **Redis** (Optional, for caching)

### Frontend Requirements
- **Flutter** >= 3.0.0
- **Dart** >= 3.0.0

### Platform-Specific Tools

#### Windows
- Visual Studio 2022 with Desktop development workload
- Windows 10 SDK

#### Android
- Android Studio
- Android SDK (API 21+)
- Java JDK 11+

#### iOS/macOS
- Xcode 14+
- macOS 12+ (for building iOS/macOS apps)
- CocoaPods

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourcompany/enterprise-erp.git
cd enterprise-erp
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configurations
nano .env
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb enterprise_erp

# Or using psql
psql -U postgres
CREATE DATABASE enterprise_erp;
\q

# Run migrations
npm run migrate

# Seed initial data (Super Admin, Demo Company)
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend

# Get Flutter dependencies
flutter pub get

# For iOS (macOS only)
cd ios && pod install && cd ..

# For macOS
cd macos && pod install && cd ..
```

---

## ⚙️ Configuration

### Backend Configuration (.env)

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=enterprise_erp
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=24h

# OTP Configuration
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourcompany.com

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=SuperSecure@123
SUPER_ADMIN_PHONE=+1234567890

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
```

### Frontend Configuration

Edit `frontend/lib/core/constants/app_constants.dart`:

```dart
class AppConfig {
  static const String baseUrl = 'http://YOUR_SERVER_IP:5000/api/v1';
  static const String socketUrl = 'http://YOUR_SERVER_IP:5000';
}
```

**For production**, use your domain:
```dart
static const String baseUrl = 'https://api.yourcompany.com/api/v1';
static const String socketUrl = 'https://api.yourcompany.com';
```

---

## 🚀 Running the Application

### Backend

#### Development Mode
```bash
cd backend
npm run dev
```

#### Production Mode
```bash
cd backend
npm start
```

The API will be available at `http://localhost:5000`

### Frontend

#### Development (Hot Reload)

```bash
cd frontend

# Windows
flutter run -d windows

# Android
flutter run -d android

# iOS (macOS only)
flutter run -d ios

# macOS
flutter run -d macos
```

---

## 📱 Platform-Specific Builds

### Windows Desktop

```bash
cd frontend
flutter build windows --release

# Output: build/windows/runner/Release/
```

**Installer (Optional):**
Use [Inno Setup](https://jrsoftware.org/isinfo.php) or [NSIS](https://nsis.sourceforge.io/) to create an installer.

### Android

```bash
cd frontend

# APK
flutter build apk --release

# App Bundle (for Play Store)
flutter build appbundle --release

# Output: build/app/outputs/
```

**Signing:** Configure `android/app/build.gradle` with your keystore.

### iOS

```bash
cd frontend

# Build for device
flutter build ios --release

# Open Xcode to archive and upload to App Store
open ios/Runner.xcworkspace
```

**Requirements:** Apple Developer Account

### macOS

```bash
cd frontend
flutter build macos --release

# Output: build/macos/Build/Products/Release/
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### 1. Signup Request (Send OTP)
```http
POST /auth/signup/request
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "password": "SecurePass@123",
  "company_code": "DEMO001",
  "verification_method": "email"  // or "sms"
}

Response:
{
  "success": true,
  "message": "OTP sent to email",
  "signup_token": "uuid-token",
  "expires_at": "2024-01-01T10:05:00Z"
}
```

#### 2. Signup Verify (Verify OTP)
```http
POST /auth/signup/verify
Content-Type: application/json

{
  "signup_token": "uuid-token",
  "otp_code": "123456",
  "verification_method": "email"
}

Response:
{
  "success": true,
  "message": "Account created successfully",
  "user": { ... },
  "token": "jwt-token",
  "refresh_token": "refresh-token"
}
```

#### 3. Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123",
  "company_code": "DEMO001"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "company": { ... },
  "token": "jwt-token",
  "refresh_token": "refresh-token"
}
```

#### 4. Super Admin Login
```http
POST /auth/super-admin/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "SuperAdmin@123"
}
```

### Company Management (Super Admin)

#### Create Company
```http
POST /super-admin/companies
Authorization: Bearer {token}
Content-Type: application/json

{
  "company_code": "ABC001",
  "company_name": "ABC Corporation",
  "email": "info@abc.com",
  "phone": "+919876543210",
  "subscription_plan": "premium",
  "max_users": 100,
  "enabled_features": {
    "crm": true,
    "sales": true,
    "chat": true
  },
  "admin_username": "admin",
  "admin_email": "admin@abc.com",
  "admin_mobile": "+919876543210",
  "admin_password": "Admin@123"
}
```

#### Get All Companies
```http
GET /super-admin/companies?page=1&limit=20
Authorization: Bearer {token}
```

#### Update Company Features
```http
PUT /super-admin/companies/{id}/features
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled_features": {
    "crm": true,
    "manufacturing": true,
    "chat": true
  }
}
```

### Chat Endpoints

#### Get User Chat Rooms
```http
GET /chat/rooms
Authorization: Bearer {token}
```

#### Get Room Messages
```http
GET /chat/rooms/{roomId}/messages?page=1&limit=50
Authorization: Bearer {token}
```

#### Send Message
```http
POST /chat/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "room_id": "room-uuid",
  "content": "Hello team!",
  "message_type": "text"
}
```

### Expense Endpoints

#### Create Expense
```http
POST /expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "room_id": "room-uuid",
  "title": "Office Supplies",
  "amount": 1500.00,
  "category": "Operational",
  "description": "Purchased stationery",
  "is_reimbursable": true
}
```

#### Get Expenses
```http
GET /expenses?room_id={roomId}&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {token}
```

---

## 🗄️ Database Schema

### Key Tables

- **super_admins** - Super admin users
- **companies** - Company/tenant data
- **users** - Company users
- **roles** - RBAC roles
- **otps** - OTP verification codes
- **chat_rooms** - Chat rooms
- **chat_messages** - Chat messages
- **expenses** - Expense tracking
- **message_read_receipts** - Read status

---

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Rate limiting (100 requests/15 min)
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ XSS protection
- ✅ Account lockout after 5 failed attempts
- ✅ OTP expiration (5 minutes)
- ✅ Token expiration (24 hours)

---

## 🚢 Deployment

### Backend Deployment

#### Using PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start backend/server.js --name erp-backend

# Configure auto-restart on system reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

#### Using Docker

```bash
cd backend
docker build -t enterprise-erp-backend .
docker run -p 5000:5000 --env-file .env enterprise-erp-backend
```

#### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourcompany.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Frontend Deployment

#### Windows
- Build release: `flutter build windows --release`
- Create installer with Inno Setup
- Distribute via website or Microsoft Store

#### Android
- Build APK/Bundle: `flutter build appbundle --release`
- Upload to Google Play Console

#### iOS
- Build: `flutter build ios --release`
- Archive in Xcode
- Upload to App Store Connect

#### macOS
- Build: `flutter build macos --release`
- Notarize with Apple
- Distribute via website or Mac App Store

---

## 🐛 Troubleshooting

### Backend Issues

**Database connection failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -h localhost -d enterprise_erp
```

**Port 5000 already in use**
```bash
# Change PORT in .env file
PORT=5001
```

**OTP not sending**
- Verify Twilio credentials for SMS
- Check SMTP settings for email
- Check firewall/network permissions

### Frontend Issues

**Build failed on Windows**
```bash
# Ensure Visual Studio is installed
flutter doctor

# Clean and rebuild
flutter clean
flutter pub get
flutter build windows
```

**iOS/macOS build issues**
```bash
# Update pods
cd ios && pod install && cd ..

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**Socket connection failed**
- Check `AppConfig.socketUrl` is correct
- Ensure backend is running
- Check firewall allows WebSocket connections

---

## 📊 Default Credentials

After running `npm run seed`, use these credentials:

### Super Admin
- **Username**: `superadmin`
- **Password**: `SuperAdmin@123`

### Company Admin (DEMO001)
- **Username**: `admin`
- **Password**: `Admin@123`
- **Company Code**: `DEMO001`

### Employee (DEMO001)
- **Username**: `employee1`
- **Password**: `Employee@123`
- **Company Code**: `DEMO001`

**⚠️ CHANGE ALL DEFAULT PASSWORDS IN PRODUCTION!**

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Support

- **Email**: support@yourcompany.com
- **Documentation**: https://docs.yourcompany.com
- **Issue Tracker**: https://github.com/yourcompany/enterprise-erp/issues

---

## 🎉 Acknowledgments

- Node.js and Express.js community
- Flutter team at Google
- PostgreSQL contributors
- Socket.io developers
- All open-source contributors

---

**Built with ❤️ for the Enterprise**
