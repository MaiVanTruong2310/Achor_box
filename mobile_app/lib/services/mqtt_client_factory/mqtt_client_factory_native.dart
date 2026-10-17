import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

MqttClient getPlatformClient(String broker, String clientId, int port) {
  return MqttServerClient.withPort(broker, clientId, port);
}
