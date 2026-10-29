import 'mqtt_service.dart';
import 'supabase_service.dart';

enum DeviceCommand { unlock, lock }

abstract final class DeviceCommandService {
  /// Sends [command] through the authenticated Supabase queue and, as a
  /// faster path, over MQTT with the same command id (the firmware ignores
  /// the duplicate). Returns false only if neither path accepted it.
  static Future<bool> send({
    required String deviceId,
    required String serial,
    required DeviceCommand command,
  }) async {
    final name = command == DeviceCommand.unlock ? 'UNLOCK' : 'LOCK';
    final commandId = SupabaseService.newDeviceCommandId();
    final sentByMqtt = MqttService().sendCommand(serial, {
      'command': name,
      'command_id': commandId,
    });
    final queued = await SupabaseService.queueDeviceCommand(
      commandId: commandId,
      deviceId: deviceId,
      command: name,
    );
    return sentByMqtt || queued;
  }
}
