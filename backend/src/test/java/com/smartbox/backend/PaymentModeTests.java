package com.smartbox.backend;
import com.smartbox.backend.service.admin.*;
import com.smartbox.backend.service.auth.*;
import com.smartbox.backend.service.catalog.*;
import com.smartbox.backend.service.commerce.*;
import com.smartbox.backend.service.customer.*;
import com.smartbox.backend.service.device.*;
import com.smartbox.backend.service.warranty.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.mock.env.MockEnvironment;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class PaymentModeTests {
    PaymentService payments(MockEnvironment env,String secret){var service=new PaymentService(mock(CommerceRepository.class),mock(OrderWorkflowService.class),mock(CurrentActor.class),mock(OutboxService.class),new ObjectMapper(),env,mock(VnpayGateway.class),mock(PaymentTimeoutService.class));org.springframework.test.util.ReflectionTestUtils.setField(service,"secret",secret);return service;}
    @Test void mockModeNeverClaimsRealPaymentsAndControlsRequireDemoAndSignatureConfiguration(){
        var env=new MockEnvironment();var service=payments(env,"test-payment-secret-at-least-thirty-two-characters");
        assertEquals(true,service.mode().get("isSimulated"));assertEquals("mock",service.mode().get("provider"));assertEquals(false,service.mode().get("demoActionsEnabled"));
        env.setActiveProfiles("demo");assertEquals(true,service.mode().get("demoActionsEnabled"));assertEquals(false,payments(env,"").mode().get("demoActionsEnabled"));
    }
}
