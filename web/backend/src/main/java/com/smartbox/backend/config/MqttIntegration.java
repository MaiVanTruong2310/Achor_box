package com.smartbox.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.device.DeviceWorkflowService.CommandCreated;
import com.smartbox.backend.service.device.MqttDeviceService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

@Component
@Slf4j
@ConditionalOnProperty(name = "smartbox.mqtt.enabled", havingValue = "true")
public class MqttIntegration implements MqttCallbackExtended {

    private final MqttDeviceService devices;
    private final CommerceRepository db;
    private final ObjectMapper json;
    private final MqttAsyncClient client;
    private final MqttConnectOptions options;
    private final String[] subscriptions;

    public MqttIntegration(
            MqttDeviceService devices,
            CommerceRepository db,
            ObjectMapper json,
            @Value("${smartbox.mqtt.broker-url:}") String broker,
            @Value("${smartbox.mqtt.username:}") String username,
            @Value("${smartbox.mqtt.password:}") String password,
            @Value("${smartbox.mqtt.subscriptions:delivery_box/+/status,delivery_box/+/sensor,delivery_box/+/ack}") String subscriptions
    ) throws MqttException {
        this.devices = devices;
        this.db = db;
        this.json = json;
        this.subscriptions = subscriptions.split(",");

        if (broker.isBlank() || username.isBlank() || password.isBlank()) {
            throw new IllegalStateException("MQTT_CREDENTIALS_REQUIRED");
        }

        this.client = new MqttAsyncClient(broker, "smartbox-backend-" + UUID.randomUUID(), new MemoryPersistence());

        this.options = new MqttConnectOptions();
        this.options.setUserName(username);
        this.options.setPassword(password.toCharArray());
        this.options.setAutomaticReconnect(true);
        this.options.setCleanSession(true);
        this.options.setConnectionTimeout(3);
        this.options.setKeepAliveInterval(30);

        this.client.setCallback(this);
    }

    @PostConstruct
    public void start() {
        connect();
    }

    private void connect() {
        try {
            if (!client.isConnected()) {
                client.connect(options);
            }
        } catch (MqttException ex) {
            log.warn("MQTT connection unavailable ({})", ex.getReasonCode());
        }
    }

    @Override
    public void connectComplete(boolean reconnect, String serverURI) {
        try {
            int[] qos = new int[subscriptions.length];
            Arrays.fill(qos, 1);
            client.subscribe(subscriptions, qos);
        } catch (MqttException ex) {
            log.error("MQTT subscription failed ({})", ex.getReasonCode());
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.warn("MQTT connection lost; reconnect enabled");
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        // No-op for QoS 1 message acknowledgment
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        try {
            devices.message(topic, message.getPayload());
        } catch (Exception ex) {
            log.warn("MQTT message rejected on {} ({})", topic, ex.getClass().getSimpleName());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void created(CommandCreated event) {
        publish(event.id());
    }

    private void publish(UUID id) {
        if (!client.isConnected()) {
            return;
        }

        var command = devices.claim(id);
        if (command == null) {
            return;
        }

        try {
            byte[] payload = json.writeValueAsBytes(Map.of(
                    "commandId", id.toString(),
                    "action", command.get("command"),
                    "requested_by", command.get("requested_by").toString(),
                    "timestamp", now().toEpochSecond()
            ));
            client.publish(command.get("mqtt_topic_id") + "/command", payload, 1, false);
        } catch (Exception ex) {
            devices.publishFailed(id);
        }
    }

    @Scheduled(fixedDelayString = "${smartbox.mqtt.retry-delay-ms:5000}")
    public void retry() {
        devices.expireCommands();
        if (!client.isConnected()) {
            connect();
            return;
        }

        for (var row : db.list("SELECT id FROM public.device_commands WHERE status IN('PENDING','SENT') AND next_attempt_at<=? ORDER BY created_at LIMIT 50", now())) {
            publish(uuid(row.get("id")));
        }
    }

    @Scheduled(fixedDelay = 30000)
    public void health() {
        devices.markOffline(90);
    }

    @PreDestroy
    public void stop() {
        try {
            if (client.isConnected()) {
                client.disconnect().waitForCompletion(1000);
            }
            client.close();
        } catch (MqttException ex) {
            log.warn("MQTT shutdown failed ({})", ex.getMessage());
        }
    }
}
