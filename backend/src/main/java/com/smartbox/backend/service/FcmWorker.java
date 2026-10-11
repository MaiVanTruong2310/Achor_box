package com.smartbox.backend.service;

import com.google.auth.oauth2.GoogleCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.net.http.HttpClient;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Component @Slf4j
@ConditionalOnProperty(name="smartbox.fcm.enabled",havingValue="true")
public class FcmWorker {
    private final PushNotificationService push;
    private final GoogleCredentials credentials;
    private final RestClient client;
    public FcmWorker(PushNotificationService push,@Value("${smartbox.fcm.project-id:}") String project,@Value("${smartbox.fcm.credentials-file:}") String file) throws java.io.IOException {
        this.push=push;
        if(!project.matches("[a-zA-Z0-9_-]+")||file.isBlank())throw new IllegalStateException("FCM_NOT_CONFIGURED");
        try(var stream=Files.newInputStream(Path.of(file))){credentials=GoogleCredentials.fromStream(stream).createScoped("https://www.googleapis.com/auth/firebase.messaging");}
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());factory.setReadTimeout(Duration.ofSeconds(5));
        client=RestClient.builder().baseUrl("https://fcm.googleapis.com/v1/projects/"+project).requestFactory(factory).build();
    }
    @Scheduled(fixedDelay=10000) public void run() {
        UUID token=UUID.randomUUID();
        for(var row:push.claim(token)) {
            String error=null;
            try {
                credentials.refreshIfExpired();
                UUID notification=uuid(row.get("notification_id"));
                for(var target:push.tokens(uuid(row.get("user_id")),notification)) {
                    client.post().uri("/messages:send").header("Authorization","Bearer "+credentials.getAccessToken().getTokenValue())
                        .body(Map.of("message",Map.of("token",target.get("token"),"notification",Map.of("title",row.get("title"),"body",row.get("body")),"data",Map.of("notificationId",notification.toString(),"deviceId",row.get("device_id").toString()))))
                        .retrieve().toBodilessEntity();
                    push.tokenSent(notification,uuid(target.get("id")));
                }
            } catch(Exception ex){error="FCM_DELIVERY_FAILED: "+ex.getClass().getSimpleName();log.warn("Push {} failed ({})",row.get("id"),ex.getClass().getSimpleName());}
            push.finish(uuid(row.get("id")),token,error);
        }
    }
}
