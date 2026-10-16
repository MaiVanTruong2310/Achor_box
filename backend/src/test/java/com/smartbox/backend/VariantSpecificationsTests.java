package com.smartbox.backend;
import com.smartbox.backend.entity.ProductVariant;
import com.smartbox.backend.dto.request.catalog.ProductVariantRequest;
import com.smartbox.backend.service.catalog.VariantSpecifications;
import com.smartbox.backend.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class VariantSpecificationsTests {
    @Test void validPhysicalValuesAndImagesRoundTripWithoutInventedDefaults(){
        var v=ProductVariant.builder().build();var r=new ProductVariantRequest();r.setModelTier("PRO");r.setWidthCm(new BigDecimal("32.5"));r.setCapacityLiter(85);r.setSize("M");r.setWarrantyMonths(24);r.setImages(List.of("/products/pro-m.png"));VariantSpecifications.apply(v,r);
        assertTrue(v.getHasWeightSensor());assertEquals(new BigDecimal("32.5"),v.getWidthCm());assertNull(v.getHeightCm());assertEquals(List.of("/products/pro-m.png"),VariantSpecifications.images(v.getVariantImages()));
        VariantSpecifications.apply(v,new ProductVariantRequest());assertEquals(24,v.getWarrantyMonths());assertEquals(new BigDecimal("32.5"),v.getWidthCm());
    }
    @Test void inconsistentTierInvalidDimensionsUnsafeImagesAndWrongCapacityReject(){
        var v=ProductVariant.builder().build();var r=new ProductVariantRequest();r.setModelTier("BASE");r.setHasWeightSensor(true);var mismatch=r;assertThrows(BadRequestException.class,()->VariantSpecifications.apply(v,mismatch));
        r=new ProductVariantRequest();r.setWidthCm(BigDecimal.ZERO);var zero=r;assertThrows(BadRequestException.class,()->VariantSpecifications.apply(v,zero));
        r=new ProductVariantRequest();r.setImages(List.of("javascript:alert(1)"));var unsafe=r;assertThrows(BadRequestException.class,()->VariantSpecifications.apply(v,unsafe));
        r=new ProductVariantRequest();r.setSize("M");r.setCapacityLiter(45);var capacity=r;assertThrows(BadRequestException.class,()->VariantSpecifications.apply(v,capacity));
    }
}
