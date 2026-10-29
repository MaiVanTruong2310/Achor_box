package com.smartbox.backend;
import com.smartbox.backend.service.commerce.VnpayGateway;
import com.smartbox.backend.exception.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.LinkedMultiValueMap;
import java.util.*;
import java.time.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class VnpayGatewayTests {
    static final String SECRET="test-vnpay-secret-at-least-thirty-two-characters";
    static VnpayGateway gateway(){
        var gateway=new VnpayGateway();ReflectionTestUtils.setField(gateway,"terminal","TEST1234");ReflectionTestUtils.setField(gateway,"secret",SECRET);
        ReflectionTestUtils.setField(gateway,"url","https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");ReflectionTestUtils.setField(gateway,"returnUrl","http://localhost:5174/payments/vnpay/return");ReflectionTestUtils.setField(gateway,"environment","sandbox");return gateway;
    }
    @Test void signatureMatchesIndependentSha512VectorAndUtf8UrlEncoding(){
        var fields=Map.of("vnp_OrderInfo","Thanh toán & đơn + #1","vnp_TmnCode","TEST1234","vnp_Amount","100000","vnp_SecureHash","ignored","vnp_SecureHashType","SHA512");
        assertEquals("vnp_Amount=100000&vnp_OrderInfo=Thanh+to%C3%A1n+%26+%C4%91%C6%A1n+%2B+%231&vnp_TmnCode=TEST1234",VnpayGateway.canonical(fields));
        assertEquals("3bdfd98f5f53df06e6e93f56e5d380261a8bf4602932a92452c2d1dcd4297035a5f007923ddb7da94e19394de0810d5e4c85e256185bfeac3ccb441cd63f70e8",gateway().signature(fields));
    }
    @Test void linkUsesVndTimes100VietnamTimeAndUniqueReference(){
        var id=UUID.randomUUID();var now=OffsetDateTime.parse("2026-10-14T00:00:00Z");
        String url=gateway().paymentUrl(id,new BigDecimal("1200000"),now,now.plusMinutes(15),"127.0.0.1");
        assertTrue(url.contains("vnp_Amount=120000000"));assertTrue(url.contains("vnp_CreateDate=20261014070000"));assertTrue(url.contains("vnp_ExpireDate=20261014071500"));assertTrue(url.contains("vnp_TxnRef="+id.toString().replace("-","")));
        assertThrows(BadRequestException.class,()->gateway().paymentUrl(id,new BigDecimal("1.5"),now,now.plusMinutes(15),"127.0.0.1"));
    }
    @Test void sandboxConfigurationCannotSilentlySwitchToRealGateway(){
        var gateway=gateway();ReflectionTestUtils.setField(gateway,"url","https://pay.vnpay.vn/vpcpay.html");assertThrows(AppException.class,gateway::configured);
    }
    @Test void duplicateParametersAndBadSignatureAreRejectedBeforeParsingResult(){
        var values=new LinkedMultiValueMap<String,String>();values.add("vnp_TmnCode","TEST1234");values.add("vnp_TmnCode","BAD");values.add("vnp_SecureHash","0".repeat(128));assertEquals("97",assertThrows(VnpayGateway.InvalidNotification.class,()->gateway().verify(values)).code());
    }
}
