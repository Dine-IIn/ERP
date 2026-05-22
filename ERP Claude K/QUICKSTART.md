# ⚡ Quick Start Guide

Get your Enterprise ERP System up and running in 10 minutes!

## 🎯 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Flutter 3.0+ installed (for mobile apps)
- [ ] Git installed

---

## 🚀 5-Minute Backend Setup

### 1. Clone and Install
```bash
git clone https://github.com/yourcompany/enterprise-erp.git
cd enterprise-erp/backend
npm install
```

### 2. Setup Database
```bash
# Create database (Linux/Mac)
createdb enterprise_erp

# Or on Windows with psql
psql -U postgres
CREATE DATABASE enterprise_erp;
\q
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and set at minimum:
# - DB_PASSWORD
# - JWT_SECRET
```

### 4. Initialize and Start
```bash
# Run migrations and seed data
npm run migrate
npm run seed

# Start server
npm start
```

✅ **Backend is now running at http://localhost:5000**

---

## 📱 5-Minute Flutter Setup

### 1. Install Dependencies
```bash
cd frontend
flutter pub get
```

### 2. Configure API URL
Edit `lib/core/constants/app_constants.dart`:
```dart
static const String baseUrl = 'http://localhost:5000/api/v1';
```

For mobile devices, use your computer's IP:
```dart
static const String baseUrl = 'http://192.168.1.100:5000/api/v1';
```

### 3. Run App
```bash
# Windows Desktop
flutter run -d windows

# Android (emulator or device connected)
flutter run -d android

# iOS (Mac only)
flutter run -d ios

# macOS Desktop (Mac only)
flutter run -d macos
```

✅ **App is now running!**

---

## 🔐 Default Login Credentials

After running `npm run seed`, use these to login:

### Super Admin Portal
```
Username: superadmin
Password: SuperAdmin@123
```

### Company User (DEMO001)
```
Username: admin
Password: Admin@123
Company Code: DEMO001
```

---

## 🧪 Test the API

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123",
    "company_code": "DEMO001"
  }'
```

---

## 🐳 Docker Quick Start (Alternative)

If you prefer Docker:

```bash
# Copy environment file
cp .env.docker.example .env

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# View logs
docker-compose logs -f backend
```

---

## 📝 Next Steps

1. **Change Default Passwords** ⚠️
   ```bash
   # In your app, go to Settings > Change Password
   ```

2. **Create Your First Company**
   - Login as superadmin
   - Navigate to Company Management
   - Click "Create Company"

3. **Invite Team Members**
   - Login as company admin
   - Go to Users > Invite User
   - Set roles and permissions

4. **Enable Features**
   - Configure which modules are enabled
   - Set subscription limits
   - Customize company settings

5. **Test Chat Feature**
   - Navigate to Chat
   - Create a room
   - Send messages
   - Try expense tracking

---

## 🆘 Common Issues

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # Mac
```

### Port 5000 Already in Use
```bash
# Change port in .env
PORT=5001
```

### Flutter Build Failed
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter doctor  # Check for issues
```

### Can't Connect from Mobile Device
```bash
# Make sure your phone and computer are on same WiFi
# Use computer's local IP (not localhost)
# Disable firewall or allow port 5000
```

---

## 📚 Learn More

- [Full Documentation](./README.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

---

## 💬 Get Help

- GitHub Issues: https://github.com/yourcompany/enterprise-erp/issues
- Email: support@yourcompany.com
- Documentation: https://docs.yourcompany.com

---

**Happy Building! 🎉**
