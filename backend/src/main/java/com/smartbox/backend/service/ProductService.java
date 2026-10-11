package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.PaginationUtil;
import com.smartbox.backend.dto.request.ProductRequest;
import com.smartbox.backend.dto.response.ProductResponse;
import com.smartbox.backend.entity.Product;
import com.smartbox.backend.entity.ProductCategory;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.ProductCategoryRepository;
import com.smartbox.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final com.smartbox.backend.repository.CommerceRepository commerce;
    private final ProductCategoryRepository categoryRepository;
    private final com.smartbox.backend.repository.ProductVariantRepository variantRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProductsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ProductResponse> pageResult = productRepository.findAll(pageable).map(this::mapToResponse);
        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    public List<ProductCategory> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        String imagesJson = "[]";
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            try {
                imagesJson = objectMapper.writeValueAsString(request.getImages());
            } catch (Exception e) {
                log.warn("Failed to serialize product images: {}", e.getMessage());
            }
        }

        if(request.getPrice()==null || request.getPrice().signum()<0 || request.getStockQuantity()!=null && request.getStockQuantity()<0)
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_PRODUCT_PRICE_OR_STOCK");
        if(request.getVariants()!=null) request.getVariants().forEach(this::validateVariant);
        Product product = Product.builder()
                .categoryId(request.getCategoryId())
                .sku(request.getSku())
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .images(imagesJson)
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .hasWeightSensor(Boolean.TRUE.equals(request.getHasWeightSensor()))
                .build();

        Product saved = productRepository.save(product);

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            List<com.smartbox.backend.entity.ProductVariant> variantEntities = request.getVariants().stream()
                    .map(vr -> com.smartbox.backend.entity.ProductVariant.builder()
                            .productId(saved.getId())
                            .variantName(vr.getVariantName())
                            .sku(vr.getSku())
                            .priceDelta(vr.getPriceDelta() != null ? vr.getPriceDelta() : java.math.BigDecimal.ZERO)
                            .isActive(vr.getIsActive()!=null ? vr.getIsActive() : true).size(vr.getSize()).capacityLiter(vr.getCapacityLiter())
                            .stockQuantity(vr.getStockQuantity() != null ? vr.getStockQuantity() : 0)
                            .build())
                    .toList();
            variantRepository.saveAll(variantEntities);
        }

        return mapToResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        Product product = productRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        if (request.getCategoryId() != null) product.setCategoryId(request.getCategoryId());
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if(request.getPrice()!=null && request.getPrice().signum()<0 || request.getStockQuantity()!=null && request.getStockQuantity()<0)
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_PRODUCT_PRICE_OR_STOCK");
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());
        if (request.getHasWeightSensor() != null) product.setHasWeightSensor(request.getHasWeightSensor());

        if (request.getImages() != null) {
            try {
                product.setImages(objectMapper.writeValueAsString(request.getImages()));
            } catch (Exception e) {
                log.warn("Failed to serialize product images: {}", e.getMessage());
            }
        }

        Product updated = productRepository.save(product);

        if (request.getVariants() != null) {
            var current = variantRepository.findAllLockedByProductId(id);
            java.util.Set<UUID> retained = new java.util.HashSet<>();
            for (var vr : request.getVariants().stream().sorted(java.util.Comparator.comparing(v -> v.getId() == null ? v.getSku() : v.getId().toString())).toList()) {
                validateVariant(vr);
                var variant = vr.getId() == null
                    ? com.smartbox.backend.entity.ProductVariant.builder().productId(id).build()
                    : variantRepository.findLockedById(vr.getId()).orElseThrow(() -> new ResourceNotFoundException("Biến thể", "id", vr.getId()));
                if (!id.equals(variant.getProductId())) throw new com.smartbox.backend.exception.BadRequestException("VARIANT_PRODUCT_MISMATCH");
                variant.setVariantName(vr.getVariantName()); variant.setSku(vr.getSku());
                if(vr.getPriceDelta()!=null) variant.setPriceDelta(vr.getPriceDelta());
                if(vr.getStockQuantity()!=null) variant.setStockQuantity(vr.getStockQuantity());
                if(vr.getIsActive()!=null) variant.setIsActive(vr.getIsActive());
                if(vr.getSize()!=null) variant.setSize(vr.getSize());
                if(vr.getCapacityLiter()!=null) variant.setCapacityLiter(vr.getCapacityLiter());
                variantRepository.saveAndFlush(variant); retained.add(variant.getId());
            }
            for(var old : current) {
                if(!retained.contains(old.getId())) {
                    var locked=variantRepository.findLockedById(old.getId()).orElseThrow();
                    // Preserve immutable SKU identity and foreign keys of existing orders.
                    locked.setIsActive(false); variantRepository.save(locked);
                }
            }
        }

        return mapToResponse(updated);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sản phẩm", "id", id);
        }
        var product = productRepository.findLockedById(id).orElseThrow();
        product.setIsActive(false); productRepository.save(product);
        for(var v:variantRepository.findAllLockedByProductId(id)) {
            var locked=variantRepository.findLockedById(v.getId()).orElseThrow();
            locked.setIsActive(false);variantRepository.save(locked);
        }
    }

    @Transactional
    public ProductResponse adjustStock(UUID id, int delta) {
        Product product = productRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        if (!variantRepository.findByProductIdOrderByPriceDeltaAsc(id).isEmpty())
            throw new com.smartbox.backend.exception.ConflictException("USE_VARIANT_STOCK: Sản phẩm bán theo SKU phải điều chỉnh tồn kho từng variant");
        int newStock = Math.addExact(product.getStockQuantity() != null ? product.getStockQuantity() : 0, delta);
        if(newStock < 0) throw new com.smartbox.backend.exception.ConflictException("INSUFFICIENT_STOCK");
        product.setStockQuantity(newStock);
        return mapToResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public List<com.smartbox.backend.dto.response.ProductVariantResponse> getVariantsByProductId(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", productId));
        List<com.smartbox.backend.entity.ProductVariant> variants = variantRepository.findByProductIdOrderByPriceDeltaAsc(productId);
        return variants.stream()
                .map(v -> com.smartbox.backend.mapper.ProductVariantMapper.toResponse(v, product.getPrice()))
                .toList();
    }

    private void validateVariant(com.smartbox.backend.dto.request.ProductVariantRequest request) {
        if(request.getSku()==null || request.getSku().isBlank() || request.getVariantName()==null || request.getVariantName().isBlank()
            || request.getStockQuantity()!=null && request.getStockQuantity()<0)
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_VARIANT");
        if(request.getSize()!=null && !java.util.Set.of("S","M","L").contains(request.getSize()))
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_VARIANT_SIZE");
        if(request.getCapacityLiter()!=null && request.getCapacityLiter()<=0)
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_VARIANT_CAPACITY");
        if(request.getSize()!=null && request.getCapacityLiter()!=null) {
            int expected=java.util.Map.of("S",45,"M",85,"L",150).get(request.getSize());
            if(request.getCapacityLiter()!=expected) throw new com.smartbox.backend.exception.BadRequestException("SIZE_CAPACITY_MISMATCH");
        }
    }

    public ProductResponse mapToResponse(Product p) {
        List<String> parsedImages = Collections.emptyList();
        if (p.getImages() != null && !p.getImages().isEmpty()) {
            try {
                parsedImages = objectMapper.readValue(p.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                parsedImages = Collections.singletonList(p.getImages());
            }
        }

        String catName = p.getCategory() != null ? p.getCategory().getName() : "Hộp Nhận Hàng IoT";

        List<com.smartbox.backend.entity.ProductVariant> variants = variantRepository.findByProductIdOrderByPriceDeltaAsc(p.getId());
        List<com.smartbox.backend.dto.response.ProductVariantResponse> variantResponses = variants.stream()
                .map(v -> com.smartbox.backend.mapper.ProductVariantMapper.toResponse(v, p.getPrice()))
                .toList();

        return ProductResponse.builder()
                .id(p.getId())
                .categoryId(p.getCategoryId())
                .categoryName(catName)
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .images(parsedImages)
                .stockQuantity(p.getStockQuantity())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .variants(variantResponses)
                .build();
    }
}
