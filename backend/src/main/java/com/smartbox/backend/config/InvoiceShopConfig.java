package com.smartbox.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.Map;

@Data @Component @ConfigurationProperties(prefix="smartbox.invoice.shop")
public class InvoiceShopConfig {
    private String name="SmartBox";
    private String address="";
    private String phone="";
    private String email="";
    private String website="";
    private String taxCode="";
    public Map<String,String> snapshot(){return Map.of("name",name,"address",address,"phone",phone,"email",email,"website",website,"taxCode",taxCode);}
}
