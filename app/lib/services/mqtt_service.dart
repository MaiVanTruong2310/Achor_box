import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'mqtt_client_factory/mqtt_client_factory.dart';

class MqttService {
  static final MqttService _instance = MqttService._internal();
  factory MqttService() => _instance;
  MqttService._internal();

  MqttClient? client;
  bool isConnected = false;
  final Set<String> _subscribedBoxIds = <String>{};

  final StreamController<Map<String, dynamic>> _statusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _sensorController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get statusStream => _statusController.stream;
  Stream<Map<String, dynamic>> get sensorStream => _sensorController.stream;

  Future<bool> connect({
    String broker = 'broker.hivemq.com',
    int port = 1883,
    String boxId = '001',
  }) async {
    if (isConnected && client != null) {
      _subscribeToBox(boxId);
      return true;
    }

    final String clientId =
        'FlutterApp_${boxId}_${DateTime.now().millisecondsSinceEpoch.remainder(10000)}';

    // Create client using conditional platform factory
    client = MqttClientFactory.createClient(broker, clientId, port);

    client!.logging(on: false);
    client!.keepAlivePeriod = 20;
    client!.autoReconnect = true;
    client!.onAutoReconnect = () => isConnected = false;
    client!.onAutoReconnected = () => isConnected = true;
    client!.onDisconnected = _onDisconnected;
    client!.onConnected = _onConnected;
    client!.onSubscribed = (topic) => debugPrint('subscribed: $topic');

    final connMess =
        MqttConnectMessage().withClientIdentifier(clientId).startClean();
    client!.connectionMessage = connMess;

    try {
      debugPrint('Connecting to MQTT broker $broker...');
      await client!.connect();
    } catch (e) {
      debugPrint('MQTT Connection Exception: $e');
      client!.disconnect();
      return false;
    }

    if (client!.connectionStatus!.state == MqttConnectionState.connected) {
      isConnected = true;
      debugPrint('MQTT Connected Successfully to $broker');

      // Subscribe to box status and sensor telemetry
      _subscribeToBox(boxId);

      client!.updates!.listen((List<MqttReceivedMessage<MqttMessage?>>? c) {
        final recMess = c![0].payload as MqttPublishMessage;
        final String pt =
            MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
        final String topic = c[0].topic;

        try {
          final Map<String, dynamic> data = jsonDecode(pt);
          if (topic.endsWith('/status')) {
            _statusController.add(data);
          } else if (topic.endsWith('/sensor')) {
            _sensorController.add(data);
          }
        } catch (e) {
          debugPrint('Error parsing MQTT payload: $e');
        }
      });

      return true;
    } else {
      debugPrint(
          'MQTT Connection Failed - status is ${client!.connectionStatus!.state}');
      client!.disconnect();
      isConnected = false;
      return false;
    }
  }

  void _subscribeToBox(String boxId) {
    if (client == null || !isConnected || _subscribedBoxIds.contains(boxId)) {
      return;
    }
    client!.subscribe('delivery_box/$boxId/status', MqttQos.atMostOnce);
    client!.subscribe('delivery_box/$boxId/sensor', MqttQos.atMostOnce);
    _subscribedBoxIds.add(boxId);
  }

  void _onConnected() {
    isConnected = true;
    debugPrint('MQTT Client Connected Callback');
  }

  void _onDisconnected() {
    isConnected = false;
    debugPrint('MQTT Client Disconnected Callback');
  }

  // Convenience helper to send unlock command
  void unlockBox({String boxId = '001'}) {
    sendCommand(boxId, 'UNLOCK');
  }

  // Publish UNLOCK or LOCK command directly to delivery_box/001/command
  static void sendCommandStatic(String boxId, dynamic command) {
    _instance.sendCommand(boxId, command);
  }

  bool sendCommand(String boxId, dynamic command) {
    if (!isConnected || client == null) {
      debugPrint('Cannot send command: MQTT Client not connected');
      return false;
    }

    final String topic = 'delivery_box/$boxId/command';
    final builder = MqttClientPayloadBuilder();

    final Map<String, dynamic> payloadMap;
    if (command is Map<String, dynamic>) {
      payloadMap = Map<String, dynamic>.from(command);
      payloadMap['requested_by'] ??= 'Flutter App';
      payloadMap['box_id'] ??= boxId;
    } else {
      payloadMap = {
        'command': command.toString(),
        'requested_by': 'Flutter App',
        'box_id': boxId,
      };
    }

    final payload = jsonEncode(payloadMap);

    builder.addString(payload);
    try {
      client!.publishMessage(topic, MqttQos.atMostOnce, builder.payload!);
      debugPrint('Published command $payload to topic $topic');
      return true;
    } catch (error) {
      debugPrint('MQTT publish failed: $error');
      return false;
    }
  }

  void disconnect() {
    client?.disconnect();
    isConnected = false;
    _subscribedBoxIds.clear();
  }
}
