const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service_role_secret_key';
const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';

// Initialize Supabase Client with Service Role Key for full DB write access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', async () => {
  console.log('⚡ [SUPABASE BRIDGE v2] Connected to MQTT Broker:', MQTT_BROKER);
  mqttClient.subscribe('delivery_box/001/status');
  mqttClient.subscribe('delivery_box/001/sensor');
  mqttClient.subscribe('delivery_box/001/event');

  // Mark device online on connect
  await supabase
    .from('delivery_boxes')
    .update({ is_online: true, last_seen_at: new Date() })
    .eq('id', '001');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const boxId = payload.box_id || '001';

    if (topic.endsWith('/status')) {
      const doorStatus = (payload.door === 'open') ? 'open' : 'closed';
      const lockStatus = (payload.lock === 'unlocked') ? 'unlocked' : 'locked';

      await supabase
        .from('delivery_boxes')
        .update({
          door_status: doorStatus,
          lock_status: lockStatus,
          wifi_rssi: payload.wifi_rssi || 0,
          is_online: true,
          last_seen_at: new Date()
        })
        .eq('id', boxId);

      console.log(`⚡ [Supabase Bridge v2] Box ${boxId} state updated: door=${doorStatus}, lock=${lockStatus}`);
    } 
    else if (topic.endsWith('/sensor')) {
      await supabase
        .from('delivery_boxes')
        .update({
          package_detected: payload.package_detected,
          current_weight: payload.weight,
          current_distance_cm: payload.distance_cm,
          is_online: true,
          last_seen_at: new Date()
        })
        .eq('id', boxId);

      // Insert Telemetry Log into sensor_data table
      await supabase.from('sensor_data').insert({
        box_id: boxId,
        distance_cm: payload.distance_cm,
        weight_kg: payload.weight,
        door_status: payload.package_detected ? 'CLOSED' : 'OPEN'
      });

      // If new package detected, record in packages table
      if (payload.package_detected && payload.weight > 0.05) {
        await supabase.from('packages').insert({
          box_id: boxId,
          weight: payload.weight,
          status: 'DELIVERED'
        });
      }

      console.log(`⚡ [Supabase Bridge v2] Telemetry & Package recorded for box ${boxId}`);
    }
    else if (topic.endsWith('/event')) {
      const validEvents = [
        'PACKAGE_DETECTED', 'REMOTE_UNLOCK', 'WRONG_PIN',
        'DOOR_OPENED', 'DOOR_CLOSED', 'DEVICE_ONLINE', 'DEVICE_OFFLINE', 'APP_COMMAND'
      ];
      const eventType = validEvents.includes(payload.event_type) ? payload.event_type : 'PACKAGE_DETECTED';

      await supabase.from('events').insert({
        box_id: boxId,
        event_type: eventType,
        description: payload.description
      });
      console.log(`⚡ [Supabase Event v2] ${eventType}: ${payload.description}`);
    }
  } catch (err) {
    console.error('❌ [SUPABASE BRIDGE ERROR]', err.message);
  }
});
