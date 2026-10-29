import 'package:mqtt_client/mqtt_client.dart';

MqttClient getPlatformClient(String broker, String clientId, int port) {
  throw UnsupportedError(
      'Cannot create MQTT client without dart:html or dart:io');
}
