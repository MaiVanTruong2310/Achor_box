const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';

// In-Memory state store for realtime status cache
let latestBoxState = {
  box_id: "001",
  door: "closed",
  lock: "locked",
  package_detected: false,
  weight: 0.0,
  distance_cm: 999.0,
  updated_at: new Date()
};

// MQTT Client Connection
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker:', MQTT_BROKER);
  mqttClient.subscribe('delivery_box/001/status');
  mqttClient.subscribe('delivery_box/001/sensor');
  mqttClient.subscribe('delivery_box/001/event');
});

mqttClient.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    latestBoxState = { ...latestBoxState, ...payload, updated_at: new Date() };
    console.log(`[MQTT Subscriber] Received on ${topic}:`, payload);
  } catch (err) {
    console.error('[MQTT Subscriber] JSON parse error:', err.message);
  }
});

// REST API Endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Dashboard state endpoint
app.get('/api/v1/boxes/001/status', (req, res) => {
  res.json({ success: true, data: latestBoxState });
});

// Unlock / Lock Remote Control Endpoint
app.post('/api/v1/boxes/001/command', (req, res) => {
  const { action, requested_by } = req.body;
  if (!['LOCK', 'UNLOCK'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const payload = JSON.stringify({ action, requested_by: requested_by || 'mobile_app' });
  mqttClient.publish('delivery_box/001/command', payload);

  res.json({
    success: true,
    message: `Command ${action} sent to Smart Delivery Box`,
    timestamp: new Date()
  });
});

app.listen(PORT, () => {
  console.log(`[BACKEND SERVER] Running on port ${PORT}`);
});
