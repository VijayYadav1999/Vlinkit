# Vlinkit - Instant Delivery System Architecture

## 1. High Level Design (HLD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                       │
│  ┌─────────────────────┐              ┌─────────────────────┐               │
│  │   User App (Angular)│              │  Driver App (Angular)│               │
│  │  - Login/Signup      │              │  - Login              │               │
│  │  - Product Browse    │              │  - Order Notifications│               │
│  │  - Cart/Checkout     │  WebSocket   │  - Accept/Reject      │               │
│  │  - Payment           │◄────────────►│  - Live Navigation    │               │
│  │  - Live Tracking     │              │  - Status Updates     │               │
│  └────────┬─────────────┘              └────────┬─────────────┘               │
└───────────┼─────────────────────────────────────┼───────────────────────────┘
            │ REST API                            │ REST API
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / LOAD BALANCER                          │
│                           (Nginx Reverse Proxy)                             │
└────┬──────────────┬──────────────┬──────────────┬───────────────────────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│  User   │  │  Order   │  │  Driver  │  │  WebSocket   │
│ Service │  │ Service  │  │ Service  │  │  Server      │
│ (NestJS)│  │ (NestJS) │  │ (NestJS) │  │  (Socket.IO) │
│ :3001   │  │ :3002    │  │ :3003    │  │  :3100       │
└────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘
     │            │             │                │
     ▼            ▼             ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE BROKER (Kafka)                               │
│  Topics: order.created, order.assigned, driver.location,                    │
│          driver.notification, order.status, payment.completed               │
└─────────────────────────────────────────────────────────────────────────────┘
     │            │             │                │
     ▼            ▼             ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐            │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │ Google Fleet     │            │
│  │(Users,   │  │(Orders,  │  │(Cache,   │  │ Engine           │            │
│  │ Drivers, │  │ Products)│  │ Sessions,│  │ (Vehicle Tracking│            │
│  │ Payments)│  │          │  │ GeoData) │  │  Task Management)│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Low Level Design (LLD)

### 2.1 Service Breakdown

#### User Service (NestJS - Port 3001)
- **Auth Module**: Signup, Login, JWT, Google OAuth, Token Refresh
- **Users Module**: Profile CRUD, Address management
- **Middleware**: JWT Guard, Rate Limiting, Request Validation

#### Order Service (NestJS - Port 3002)
- **Products Module**: Product catalog, categories, search
- **Cart Module**: Add/remove items, update quantities
- **Orders Module**: Order creation, status tracking, history
- **Payment Module**: Stripe integration, payment processing
- **Kafka Producer**: Emit order.created, payment.completed events

#### Driver Service (NestJS - Port 3003)
- **Auth Module**: Driver login, JWT validation
- **Drivers Module**: Driver profile, availability toggle
- **Orders Module**: Receive order offers, accept/reject
- **Location Module**: GPS updates, proximity queries via Redis GEO
- **Fleet Engine Module**: Google Fleet Engine vehicle/task management
- **Kafka Consumer**: Listen to order.created, order.assigned events

#### WebSocket Server (Socket.IO - Port 3100)
- **Namespaces**: /tracking, /notifications, /driver
- **Rooms**: Per-order tracking rooms, driver notification rooms
- **Redis Adapter**: Multi-instance pub/sub support
- **Kafka Consumer**: Bridge Kafka events to WebSocket clients

### 2.2 Event Flow: Order Placement → Delivery

```
User places order
       │
       ▼
Order Service creates order (MongoDB) ──► Kafka: order.created
       │                                       │
       ▼                                       ▼
Payment Gateway (Stripe)              Driver Service consumes
       │                              queries Redis GEO for
       ▼                              drivers within 5km radius
Kafka: payment.completed                       │
       │                                       ▼
       ▼                              Sends notifications via
WebSocket Server                      WebSocket to nearby drivers
broadcasts to user                             │
"Payment confirmed"                            ▼
                                      First driver accepts
                                               │
                                               ▼
                                      Kafka: order.assigned
                                               │
                                      ┌────────┴────────┐
                                      ▼                  ▼
                              WebSocket notifies    Fleet Engine creates
                              user of driver        delivery task &
                              assignment             vehicle tracking
                                                          │
                                                          ▼
                                                  Real-time location
                                                  updates via Fleet
                                                  Engine → WebSocket
                                                  → User sees live map
```

## 3. Database Design

### 3.1 PostgreSQL (Relational Data)

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| phone | VARCHAR(20) | UNIQUE |
| password_hash | VARCHAR(255) | |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| google_id | VARCHAR(255) | UNIQUE |
| profile_image_url | TEXT | |
| is_verified | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

#### user_addresses
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| label | VARCHAR(50) | (HOME, WORK, OTHER) |
| address_line_1 | VARCHAR(255) | NOT NULL |
| address_line_2 | VARCHAR(255) | |
| city | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| postal_code | VARCHAR(20) | NOT NULL |
| latitude | DECIMAL(10,8) | NOT NULL |
| longitude | DECIMAL(11,8) | NOT NULL |
| is_default | BOOLEAN | DEFAULT false |

#### drivers
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| phone | VARCHAR(20) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| vehicle_type | VARCHAR(50) | |
| vehicle_number | VARCHAR(50) | |
| license_number | VARCHAR(100) | |
| is_available | BOOLEAN | DEFAULT false |
| is_verified | BOOLEAN | DEFAULT false |
| rating | DECIMAL(3,2) | DEFAULT 5.00 |
| fleet_engine_vehicle_id | VARCHAR(255) | |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### payments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | VARCHAR(100) | NOT NULL |
| user_id | UUID | FK → users.id |
| amount | DECIMAL(10,2) | NOT NULL |
| currency | VARCHAR(3) | DEFAULT 'INR' |
| stripe_payment_intent_id | VARCHAR(255) | |
| status | VARCHAR(20) | (pending, completed, failed, refunded) |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 3.2 MongoDB (Document Data)

#### products
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "price": "number",
  "mrp": "number",
  "category": "string",
  "sub_category": "string",
  "image_url": "string",
  "images": ["string"],
  "in_stock": "boolean",
  "quantity_available": "number",
  "unit": "string (kg, piece, litre)",
  "weight": "string",
  "brand": "string",
  "rating": "number",
  "delivery_time_minutes": "number",
  "warehouse_id": "string",
  "tags": ["string"],
  "created_at": "Date",
  "updated_at": "Date"
}
```

#### orders
```json
{
  "_id": "ObjectId",
  "order_number": "string (VLK-20260209-XXXX)",
  "user_id": "UUID (ref: PostgreSQL users)",
  "driver_id": "UUID (ref: PostgreSQL drivers)",
  "items": [{
    "product_id": "ObjectId",
    "name": "string",
    "price": "number",
    "quantity": "number",
    "image_url": "string"
  }],
  "delivery_address": {
    "address_line_1": "string",
    "city": "string",
    "state": "string",
    "postal_code": "string",
    "latitude": "number",
    "longitude": "number"
  },
  "warehouse_location": {
    "latitude": "number",
    "longitude": "number",
    "address": "string"
  },
  "status": "enum (placed, confirmed, payment_completed, driver_assigned, picked_up, in_transit, delivered, cancelled)",
  "payment_id": "string",
  "subtotal": "number",
  "tax": "number",
  "delivery_fee": "number",
  "discount": "number",
  "total_amount": "number",
  "special_instructions": "string",
  "estimated_delivery_time": "Date",
  "actual_delivery_time": "Date",
  "fleet_engine_task_id": "string",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### 3.3 Redis Data Structures

| Key Pattern | Type | Purpose |
|------------|------|---------|
| `driver:location` | GEO SET | Store driver coords for radius queries |
| `session:{userId}` | STRING | JWT session data |
| `cart:{userId}` | HASH | Shopping cart items |
| `order:{orderId}:status` | STRING | Current order status cache |
| `products:category:{cat}` | LIST | Cached product listings |
| `driver:{driverId}:available` | STRING | Driver availability flag |
| `rate_limit:{ip}` | STRING | API rate limiting counter |

## 4. API Design

### 4.1 User Service APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | Email/password login |
| POST | /api/auth/google | Google OAuth login |
| POST | /api/auth/refresh | Refresh JWT token |
| GET | /api/users/profile | Get user profile |
| PUT | /api/users/profile | Update profile |
| POST | /api/users/addresses | Add address |
| GET | /api/users/addresses | List addresses |
| PUT | /api/users/addresses/:id | Update address |
| DELETE | /api/users/addresses/:id | Delete address |

### 4.2 Order Service APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products (search, filter, paginate) |
| GET | /api/products/:id | Product detail |
| GET | /api/products/categories | List categories |
| POST | /api/cart/items | Add to cart |
| GET | /api/cart | Get cart |
| PUT | /api/cart/items/:productId | Update cart item quantity |
| DELETE | /api/cart/items/:productId | Remove from cart |
| POST | /api/orders | Create order |
| GET | /api/orders | List user orders |
| GET | /api/orders/:id | Order detail with tracking |
| POST | /api/payments/create-intent | Create Stripe payment intent |
| POST | /api/payments/confirm | Confirm payment |
| POST | /api/payments/webhook | Stripe webhook handler |

### 4.3 Driver Service APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/driver/auth/login | Driver login |
| GET | /api/driver/profile | Get driver profile |
| PUT | /api/driver/profile | Update profile |
| PUT | /api/driver/availability | Toggle availability |
| POST | /api/driver/location | Update GPS location |
| GET | /api/driver/orders/pending | Get pending order offers |
| POST | /api/driver/orders/:id/accept | Accept order |
| POST | /api/driver/orders/:id/reject | Reject order |
| PUT | /api/driver/orders/:id/status | Update delivery status |
| GET | /api/driver/orders/active | Get active delivery |
| GET | /api/driver/earnings | Get earnings summary |

## 5. Kafka Topics & Event Flows

| Topic | Producer | Consumer | Payload |
|-------|----------|----------|---------|
| `order.created` | Order Service | Driver Service, WebSocket | { orderId, userId, items, deliveryAddress, warehouseLocation } |
| `payment.completed` | Order Service | Driver Service, WebSocket | { orderId, paymentId, amount } |
| `driver.notification` | Driver Service | WebSocket Server | { driverId, orderId, type, message } |
| `order.assigned` | Driver Service | Order Service, WebSocket | { orderId, driverId, estimatedTime } |
| `order.status` | Driver Service | Order Service, WebSocket | { orderId, status, timestamp, location } |
| `driver.location` | Driver Service | WebSocket Server | { driverId, orderId, latitude, longitude, speed, heading } |

## 6. WebSocket Events

### Namespace: /tracking
| Event | Direction | Payload |
|-------|-----------|---------|
| `join_order_tracking` | Client → Server | { orderId } |
| `leave_order_tracking` | Client → Server | { orderId } |
| `order_status_update` | Server → Client | { orderId, status, timestamp } |
| `driver_location_update` | Server → Client | { orderId, driverId, lat, lng, speed, heading } |
| `delivery_completed` | Server → Client | { orderId, completedAt } |

### Namespace: /driver
| Event | Direction | Payload |
|-------|-----------|---------|
| `driver_connect` | Client → Server | { driverId, location } |
| `new_order_offer` | Server → Client | { orderId, pickupAddress, deliveryAddress, amount, distance } |
| `order_offer_expired` | Server → Client | { orderId } |
| `order_accepted_ack` | Server → Client | { orderId, pickupLocation, deliveryLocation } |
| `location_update` | Client → Server | { driverId, lat, lng, speed, heading } |

## 7. Google Fleet Engine Integration

### Vehicle Lifecycle
1. **On Driver Registration**: Create vehicle in Fleet Engine
2. **On Driver Goes Online**: Update vehicle state to ONLINE
3. **On Order Assigned**: Create delivery task, assign to vehicle
4. **During Delivery**: Stream location updates to Fleet Engine
5. **On Delivery Complete**: Complete task, update vehicle state

### Fleet Engine API Usage
- `CreateVehicle` - When driver registers
- `UpdateVehicle` - Location & state updates
- `CreateDeliveryTask` - When order is assigned to driver  
- `UpdateDeliveryTask` - Status changes during delivery
- `GetTaskTrackingInfo` - User-facing delivery tracking
- `SearchVehicles` - Find available drivers nearby

## 8. Folder Structure

```
Vlinkit/
├── user-app/
│   ├── frontend/           # Angular 17 User App
│   │   ├── src/app/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── products/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   └── orders/
│   │   │   └── shared/services/
│   │   └── package.json
│   ├── user-service/       # NestJS User Microservice
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   └── common/
│   │   └── package.json
│   └── order-service/      # NestJS Order Microservice
│       ├── src/
│       │   ├── products/
│       │   ├── cart/
│       │   ├── orders/
│       │   ├── payments/
│       │   └── kafka/
│       └── package.json
├── driver-app/
│   ├── frontend/           # Angular 17 Driver App
│   │   ├── src/app/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── orders/
│   │   │   │   ├── navigation/
│   │   │   │   └── earnings/
│   │   │   └── shared/services/
│   │   └── package.json
│   └── backend/            # NestJS Driver Microservice
│       ├── src/
│       │   ├── auth/
│       │   ├── drivers/
│       │   ├── orders/
│       │   ├── location/
│       │   ├── fleet-engine/
│       │   └── kafka/
│       └── package.json
├── backend-services/
│   ├── websocket-server/   # Socket.IO Real-time Server
│   │   ├── src/
│   │   │   ├── namespaces/
│   │   │   ├── kafka/
│   │   │   └── redis/
│   │   └── package.json
│   └── shared/
│       ├── init.sql         # PostgreSQL schema
│       ├── mongo-init.js    # MongoDB seed data
│       └── kafka.config.ts
├── docker-compose.yml
├── .env.development
└── docs/
    └── ARCHITECTURE.md
```
