# 📡 API Documentation

Complete API reference for Enterprise ERP System

**Base URL**: `http://localhost:5000/api/v1`

**Production URL**: `https://api.yourcompany.com/api/v1`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Super Admin APIs](#super-admin-apis)
3. [Chat APIs](#chat-apis)
4. [Expense APIs](#expense-apis)
5. [Error Codes](#error-codes)
6. [Rate Limits](#rate-limits)

---

## 🔐 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Token Format
```json
{
  "id": "user-uuid",
  "company_id": "company-uuid",
  "username": "johndoe",
  "iat": 1640000000,
  "exp": 1640086400
}
```

---

## 1️⃣ Authentication APIs

### 1.1 Request Signup (Send OTP)

Send OTP to user's email or mobile for signup verification.

**Endpoint**: `POST /auth/signup/request`

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "password": "SecurePass@123",
  "company_code": "DEMO001",
  "verification_method": "email"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Unique username (3-50 chars) |
| email | string | Yes | Valid email address |
| mobile | string | Yes | Mobile with country code |
| password | string | Yes | Strong password |
| company_code | string | Yes | Valid company code |
| verification_method | string | Yes | "email" or "sms" |

**Success Response** (200):
```json
{
  "success": true,
  "message": "OTP sent to email",
  "signup_token": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T10:05:00.000Z"
}
```

**Error Responses**:
- `400` - Missing required fields
- `400` - Username/email/mobile already exists
- `404` - Invalid company code
- `403` - Company account inactive
- `500` - Failed to send OTP

---

### 1.2 Verify Signup (Verify OTP)

Verify OTP and complete signup process.

**Endpoint**: `POST /auth/signup/verify`

**Request Body**:
```json
{
  "signup_token": "550e8400-e29b-41d4-a716-446655440000",
  "otp_code": "123456",
  "verification_method": "email"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "mobile": "+919876543210",
    "company_id": "company-uuid",
    "email_verified": true,
    "mobile_verified": false,
    "is_active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400` - Invalid or expired signup token
- `400` - Invalid OTP
- `400` - OTP expired
- `400` - Maximum attempts exceeded

---

### 1.3 User Login

Login with username, password, and company code.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "Admin@123",
  "company_code": "DEMO001"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-uuid",
    "username": "admin",
    "email": "admin@demo.com",
    "full_name": "Demo Admin",
    "is_admin": true,
    "role": {
      "id": "role-uuid",
      "name": "Admin",
      "permissions": { ... }
    }
  },
  "company": {
    "id": "company-uuid",
    "company_code": "DEMO001",
    "company_name": "Demo Corporation",
    "enabled_features": {
      "crm": true,
      "sales": true,
      "chat": true
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400` - Missing credentials
- `401` - Invalid credentials
- `403` - Account locked (after 5 failed attempts)
- `403` - Account inactive

---

### 1.4 Super Admin Login

Login as super administrator.

**Endpoint**: `POST /auth/super-admin/login`

**Request Body**:
```json
{
  "username": "superadmin",
  "password": "SuperAdmin@123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Super admin login successful",
  "admin": {
    "id": "admin-uuid",
    "username": "superadmin",
    "email": "admin@erp.com",
    "full_name": "Super Administrator"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2️⃣ Super Admin APIs

All super admin endpoints require super admin authentication.

### 2.1 Create Company

Create a new company with admin user.

**Endpoint**: `POST /super-admin/companies`

**Headers**:
```
Authorization: Bearer {super_admin_token}
```

**Request Body**:
```json
{
  "company_code": "ABC001",
  "company_name": "ABC Corporation",
  "email": "info@abc.com",
  "phone": "+919876543210",
  "subscription_plan": "premium",
  "max_users": 100,
  "max_storage_gb": 100,
  "enabled_features": {
    "crm": true,
    "sales": true,
    "purchase": true,
    "inventory": true,
    "chat": true
  },
  "admin_username": "admin",
  "admin_email": "admin@abc.com",
  "admin_mobile": "+919876543210",
  "admin_password": "Admin@123",
  "admin_first_name": "Admin",
  "admin_last_name": "User"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Company and admin user created successfully",
  "company": { ... },
  "admin": { ... }
}
```

---

### 2.2 Get All Companies

List all companies with pagination.

**Endpoint**: `GET /super-admin/companies`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search by name/code/email |
| subscription_plan | string | - | Filter by plan |
| is_active | boolean | - | Filter by status |

**Example**:
```
GET /super-admin/companies?page=1&limit=20&search=Demo&subscription_plan=premium
```

**Success Response** (200):
```json
{
  "success": true,
  "companies": [
    {
      "id": "company-uuid",
      "company_code": "DEMO001",
      "company_name": "Demo Corporation",
      "email": "demo@company.com",
      "subscription_plan": "premium",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

### 2.3 Get Company Statistics

Get overview statistics of all companies.

**Endpoint**: `GET /super-admin/companies/statistics`

**Success Response** (200):
```json
{
  "success": true,
  "statistics": {
    "total": 150,
    "active": 145,
    "inactive": 5,
    "by_plan": [
      { "subscription_plan": "trial", "count": 50 },
      { "subscription_plan": "basic", "count": 30 },
      { "subscription_plan": "premium", "count": 70 }
    ],
    "recent": [
      { ... },
      { ... }
    ]
  }
}
```

---

### 2.4 Get Company Details

Get detailed information about a specific company.

**Endpoint**: `GET /super-admin/companies/:id`

**Success Response** (200):
```json
{
  "success": true,
  "company": {
    "id": "company-uuid",
    "company_code": "DEMO001",
    "company_name": "Demo Corporation",
    "email": "demo@company.com",
    "phone": "+919876543210",
    "subscription_plan": "premium",
    "subscription_end": "2025-01-01T00:00:00.000Z",
    "max_users": 100,
    "max_storage_gb": 100,
    "enabled_features": { ... },
    "settings": { ... },
    "is_active": true,
    "user_count": 45,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2.5 Update Company

Update company details.

**Endpoint**: `PUT /super-admin/companies/:id`

**Request Body** (all fields optional):
```json
{
  "company_name": "ABC Corporation Ltd",
  "email": "newemail@abc.com",
  "phone": "+919876543210",
  "subscription_plan": "enterprise",
  "max_users": 200
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Company updated successfully",
  "company": { ... }
}
```

---

### 2.6 Update Company Features

Enable/disable features for a company.

**Endpoint**: `PUT /super-admin/companies/:id/features`

**Request Body**:
```json
{
  "enabled_features": {
    "crm": true,
    "sales": true,
    "manufacturing": true,
    "chat": true,
    "analytics": true
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Company features updated successfully",
  "enabled_features": { ... }
}
```

---

### 2.7 Update Subscription

Update company subscription details.

**Endpoint**: `PUT /super-admin/companies/:id/subscription`

**Request Body**:
```json
{
  "subscription_plan": "enterprise",
  "subscription_end": "2025-12-31",
  "max_users": 500,
  "max_storage_gb": 500
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Subscription updated successfully",
  "company": { ... }
}
```

---

### 2.8 Toggle Company Status

Activate or deactivate a company.

**Endpoint**: `PATCH /super-admin/companies/:id/toggle-status`

**Success Response** (200):
```json
{
  "success": true,
  "message": "Company activated successfully",
  "is_active": true
}
```

---

### 2.9 Delete Company

Permanently delete a company and all its data.

**Endpoint**: `DELETE /super-admin/companies/:id`

**Success Response** (200):
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

---

## 3️⃣ Chat APIs

### 3.1 Create Chat Room

Create a new chat room.

**Endpoint**: `POST /chat/rooms`

**Request Body**:
```json
{
  "name": "Team Discussion",
  "type": "general",
  "description": "Main team chat room",
  "member_ids": ["user-uuid-1", "user-uuid-2"],
  "settings": {
    "allow_file_sharing": true,
    "expense_visibility": "group"
  }
}
```

**Types**: `general`, `expense`, `direct`, `group`, `department`

**Success Response** (201):
```json
{
  "success": true,
  "message": "Chat room created successfully",
  "room": {
    "id": "room-uuid",
    "name": "Team Discussion",
    "type": "general",
    "created_by": "user-uuid",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3.2 Get User Chat Rooms

Get all chat rooms for the authenticated user.

**Endpoint**: `GET /chat/rooms`

**Success Response** (200):
```json
{
  "success": true,
  "rooms": [
    {
      "id": "room-uuid",
      "name": "General",
      "type": "general",
      "members": [ ... ],
      "messages": [
        {
          "id": "message-uuid",
          "content": "Last message",
          "created_at": "2024-01-01T12:00:00.000Z"
        }
      ],
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

---

### 3.3 Get Chat Room Messages

Get messages from a specific chat room with pagination.

**Endpoint**: `GET /chat/rooms/:roomId/messages`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Messages per page |

**Success Response** (200):
```json
{
  "success": true,
  "messages": [
    {
      "id": "message-uuid",
      "room_id": "room-uuid",
      "sender": {
        "id": "user-uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "profile_picture": "url"
      },
      "message_type": "text",
      "content": "Hello team!",
      "attachments": [],
      "is_edited": false,
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

---

### 3.4 Send Message

Send a message to a chat room.

**Endpoint**: `POST /chat/messages`

**Request Body**:
```json
{
  "room_id": "room-uuid",
  "content": "Hello everyone!",
  "message_type": "text",
  "attachments": [],
  "reply_to_id": null
}
```

**Message Types**: `text`, `file`, `expense`, `image`, `video`, `audio`, `system`

**Success Response** (201):
```json
{
  "success": true,
  "message": {
    "id": "message-uuid",
    "room_id": "room-uuid",
    "sender": { ... },
    "content": "Hello everyone!",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## 4️⃣ Expense APIs

### 4.1 Create Expense

Create a new expense entry.

**Endpoint**: `POST /expenses`

**Request Body**:
```json
{
  "room_id": "room-uuid",
  "title": "Office Supplies",
  "description": "Purchased stationery items",
  "amount": 1500.00,
  "category": "Operational",
  "expense_date": "2024-01-15",
  "payment_method": "Cash",
  "is_reimbursable": true,
  "split_type": "none"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Expense created successfully",
  "expense": {
    "id": "expense-uuid",
    "title": "Office Supplies",
    "amount": "1500.00",
    "category": "Operational",
    "is_approved": false,
    "created_at": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 4.2 Get Expenses

Get expenses with filtering and statistics.

**Endpoint**: `GET /expenses`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| room_id | string | Filter by chat room |
| start_date | string | Start date (YYYY-MM-DD) |
| end_date | string | End date (YYYY-MM-DD) |
| category | string | Filter by category |

**Example**:
```
GET /expenses?room_id=room-uuid&start_date=2024-01-01&end_date=2024-01-31&category=Operational
```

**Success Response** (200):
```json
{
  "success": true,
  "expenses": [
    {
      "id": "expense-uuid",
      "title": "Office Supplies",
      "amount": "1500.00",
      "category": "Operational",
      "user": {
        "id": "user-uuid",
        "username": "johndoe",
        "full_name": "John Doe"
      },
      "is_approved": false,
      "expense_date": "2024-01-15T00:00:00.000Z"
    }
  ],
  "statistics": {
    "total": 15000.00,
    "approved": 10000.00,
    "pending": 5000.00,
    "count": 25,
    "by_category": {
      "Operational": 8000.00,
      "Travel": 5000.00,
      "Equipment": 2000.00
    }
  }
}
```

---

### 4.3 Update Expense

Update an existing expense.

**Endpoint**: `PUT /expenses/:id`

**Request Body**:
```json
{
  "title": "Updated Title",
  "amount": 1800.00,
  "category": "Equipment"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Expense updated successfully",
  "expense": { ... }
}
```

---

### 4.4 Approve Expense

Approve an expense (Admin only).

**Endpoint**: `PATCH /expenses/:id/approve`

**Success Response** (200):
```json
{
  "success": true,
  "message": "Expense approved successfully",
  "expense": {
    "id": "expense-uuid",
    "is_approved": true,
    "approved_by": "admin-user-uuid",
    "approved_at": "2024-01-15T14:00:00.000Z"
  }
}
```

---

## 🚨 Error Codes

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Custom Error Codes
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_OTP` - OTP verification failed
- `ACCOUNT_LOCKED` - Too many failed login attempts
- `FEATURE_DISABLED` - Requested feature not enabled for subscription

---

## ⏱️ Rate Limits

### General API
- **100 requests per 15 minutes** per IP address
- Returns `429 Too Many Requests` when exceeded

### Authentication Endpoints
- **5 requests per minute** per IP address
- Stricter limit to prevent brute force attacks

### Response Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🔄 WebSocket Events (Socket.io)

### Client to Server Events

**Join Rooms**:
```javascript
socket.emit('join_rooms', ['room-uuid-1', 'room-uuid-2']);
```

**Typing Indicator**:
```javascript
socket.emit('typing', { roomId: 'room-uuid', isTyping: true });
```

**Mark as Read**:
```javascript
socket.emit('mark_read', { messageId: 'msg-uuid', roomId: 'room-uuid' });
```

### Server to Client Events

**New Message**:
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

**User Typing**:
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.username} is typing...`);
});
```

**User Status Changed**:
```javascript
socket.on('user_status_changed', (data) => {
  console.log(`User ${data.userId} is ${data.status}`);
});
```

---

## 📝 Best Practices

1. **Always include Authorization header** for authenticated endpoints
2. **Handle token expiration** gracefully and refresh tokens
3. **Validate input** on client-side before API calls
4. **Implement retry logic** for failed requests
5. **Use pagination** for large datasets
6. **Cache responses** when appropriate
7. **Handle Socket.io disconnections** and reconnect
8. **Show loading states** during API calls

---

## 🧪 Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123",
    "company_code": "DEMO001"
  }'
```

### Get Companies (Authenticated)
```bash
curl -X GET http://localhost:5000/api/v1/super-admin/companies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Send Chat Message
```bash
curl -X POST http://localhost:5000/api/v1/chat/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "room-uuid",
    "content": "Hello from cURL!",
    "message_type": "text"
  }'
```

---

**Last Updated**: 2024-01-01
