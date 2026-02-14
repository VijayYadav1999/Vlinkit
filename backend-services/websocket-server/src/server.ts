import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // loads .env from current directory

const PORT = parseInt(process.env.WS_PORT || process.env.PORT || '3100');
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_SASL_USERNAME = process.env.KAFKA_SASL_USERNAME || '';
const KAFKA_SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD || '';
const KAFKA_SASL_MECHANISM = process.env.KAFKA_SASL_MECHANISM || 'plain';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── HTTP + Socket.IO Server ─────────────────────────────────────
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: (process.env.CORS_ORIGINS || 'https://vlinkit-user-app.vercel.app,https://vlinkit-driver-app.vercel.app').split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Redis Adapter for horizontal scaling ────────────────────────
async function setupRedisAdapter() {
  let pubClient: Redis;

  if (REDIS_URL) {
    // Use REDIS_URL (Upstash / cloud Redis with TLS)
    pubClient = new Redis(REDIS_URL, {
      tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
  } else {
    pubClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
  }

  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
  subClient.on('error', (err) => console.error('Redis sub error:', err.message));

  io.adapter(createAdapter(pubClient, subClient) as any);
  console.log('✓ Redis adapter connected');
}

// ─── JWT Authentication Middleware ───────────────────────────────
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    (socket as any).userId = decoded.sub || decoded.id;
    (socket as any).userType = decoded.type || 'user'; // 'user' or 'driver'
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ─── Tracking Namespace: /tracking ───────────────────────────────
// For user app - track their order delivery in real time
const trackingNs = io.of('/tracking');

trackingNs.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Auth required'));
  try {
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    (socket as any).userId = decoded.sub || decoded.id;
    next();
  } catch { next(new Error('Invalid token')); }
});

trackingNs.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`[Tracking] User ${userId} connected`);

  // User subscribes to track their order
  socket.on('track:order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`[Tracking] User ${userId} tracking order ${orderId}`);
  });

  // User stops tracking
  socket.on('untrack:order', (orderId: string) => {
    socket.leave(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Tracking] User ${userId} disconnected`);
  });
});

// ─── Driver Namespace: /driver ───────────────────────────────────
// For driver app - receive order offers, send location updates
const driverNs = io.of('/driver');

driverNs.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Auth required'));
  try {
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    if (decoded.type !== 'driver') return next(new Error('Driver auth required'));
    (socket as any).driverId = decoded.sub || decoded.id;
    next();
  } catch { next(new Error('Invalid token')); }
});

driverNs.on('connection', (socket) => {
  const driverId = (socket as any).driverId;
  socket.join(`driver:${driverId}`);
  console.log(`[Driver] Driver ${driverId} connected`);

  // Driver sends location updates
  socket.on('location:update', (data: { latitude: number; longitude: number }) => {
    // Broadcast to users tracking this driver's current order
    const rooms = Array.from(socket.rooms);
    rooms
      .filter((r) => r.startsWith('order:'))
      .forEach((room) => {
        trackingNs.to(room).emit('driver:location', {
          driverId,
          ...data,
          timestamp: Date.now(),
        });
      });
  });

  // Driver joins an order room when accepting delivery
  socket.on('delivery:accept', (orderId: string) => {
    socket.join(`order:${orderId}`);
    trackingNs.to(`order:${orderId}`).emit('order:driver_assigned', {
      driverId,
      orderId,
    });
  });

  // Driver sends delivery status updates
  socket.on('delivery:status', (data: { orderId: string; status: string }) => {
    trackingNs.to(`order:${data.orderId}`).emit('order:status_update', {
      orderId: data.orderId,
      status: data.status,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Driver] Driver ${driverId} disconnected`);
  });
});

// ─── Notification Namespace: /notifications ──────────────────────
const notificationNs = io.of('/notifications');

notificationNs.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Auth required'));
  try {
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    (socket as any).userId = decoded.sub || decoded.id;
    (socket as any).userType = decoded.type || 'user';
    next();
  } catch { next(new Error('Invalid token')); }
});

notificationNs.on('connection', (socket) => {
  const userId = (socket as any).userId;
  const userType = (socket as any).userType;
  socket.join(`${userType}:${userId}`);
  console.log(`[Notifications] ${userType} ${userId} connected`);
});

// ─── Kafka Consumer Bridge ───────────────────────────────────────
// Bridges Kafka events to WebSocket clients
async function setupKafkaConsumer() {
  const kafkaConfig: any = {
    clientId: 'websocket-server',
    brokers: KAFKA_BROKERS,
    retry: { retries: 5 },
  };

  // Add SASL/SSL for Confluent Cloud
  if (KAFKA_SASL_USERNAME && KAFKA_SASL_PASSWORD) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: KAFKA_SASL_MECHANISM,
      username: KAFKA_SASL_USERNAME,
      password: KAFKA_SASL_PASSWORD,
    };
  }

  const kafka = new Kafka(kafkaConfig);

  const consumer: Consumer = kafka.consumer({ groupId: 'websocket-bridge-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.status', fromBeginning: false });
  await consumer.subscribe({ topic: 'driver.location', fromBeginning: false });
  await consumer.subscribe({ topic: 'driver.notification', fromBeginning: false });
  await consumer.subscribe({ topic: 'order.assigned', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      const data = JSON.parse(message.value?.toString() || '{}');

      switch (topic) {
        case 'order.status':
          // Forward order status to users tracking this order
          trackingNs.to(`order:${data.orderId}`).emit('order:status_update', data);
          break;

        case 'driver.location':
          // Forward driver location to users tracking the related order
          trackingNs.to(`order:${data.orderId}`).emit('driver:location', data);
          break;

        case 'driver.notification':
          // Send order offers to specific driver
          driverNs.to(`driver:${data.driverId}`).emit('order:new_offer', data);
          break;

        case 'order.assigned':
          // Notify user that a driver accepted their order
          trackingNs.to(`order:${data.orderId}`).emit('order:driver_assigned', data);
          break;
      }
    },
  });

  console.log('✓ Kafka consumer bridge connected');
}

// ─── Start Server ────────────────────────────────────────────────
async function main() {
  try {
    await setupRedisAdapter();
    await setupKafkaConsumer();
  } catch (err) {
    console.warn('Redis/Kafka setup failed (running in standalone mode):', (err as Error).message);
  }

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 WebSocket server running on port ${PORT}`);
    console.log(`   Namespaces: /tracking, /driver, /notifications`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main();
