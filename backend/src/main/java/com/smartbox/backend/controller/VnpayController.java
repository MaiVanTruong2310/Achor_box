package com.smartbox.backend.controller;
import com.smartbox.backend.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/payments/vnpay") @RequiredArgsConstructor @Slf4j
public class VnpayController {
    private final PaymentService payments;
    private final VnpayGateway gateway;
    @GetMapping("/ipn") public Map<String,String> ipn(@RequestParam MultiValueMap<String,String> query){
        try{return payments.vnpayIpn(query);}catch(VnpayGateway.InvalidNotification ex){return PaymentService.ipnResponse(ex.code());}
        catch(Exception ex){log.warn("VNPAY IPN could not be committed ({})",ex.getClass().getSimpleName());return PaymentService.ipnResponse("99");}
    }
    /** ReturnURL is display-only: this method never changes payment, order or stock. */
    @GetMapping("/return") public Map<String,Object> returned(@RequestParam MultiValueMap<String,String> query){
        var notification=gateway.verify(query);
        return Map.of("paymentId",VnpayGateway.paymentId(notification.reference()).toString(),"signatureValid",true,"gatewayResult",notification.success()?"SUCCESS":"FAILED","environment","sandbox","awaitingIpnConfirmation",true);
    }
    @ExceptionHandler(VnpayGateway.InvalidNotification.class)
    public org.springframework.http.ResponseEntity<Map<String,String>> invalidReturn(VnpayGateway.InvalidNotification ex){return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message","VNPAY_RETURN_INVALID"));}
}
