class MqttTopics {
  static const String defaultBroker = 'broker.hivemq.com';
  static const int defaultPort = 1883;
  static const int webWsPort = 8884;

  static String statusTopic(String boxId) => 'delivery_box/$boxId/status';
  static String sensorTopic(String boxId) => 'delivery_box/$boxId/sensor';
  static String commandTopic(String boxId) => 'delivery_box/$boxId/command';
  static String eventTopic(String boxId) => 'delivery_box/$boxId/event';
}
