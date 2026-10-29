import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_browser_client.dart';

MqttClient getPlatformClient(String broker, String clientId, int port) {
  final browserClient = MqttBrowserClient('wss://$broker/mqtt', clientId);
  browserClient.port = 8884;
  browserClient.websocketProtocols = MqttClientConstants.protocolsSingleDefault;
  return browserClient;
}
