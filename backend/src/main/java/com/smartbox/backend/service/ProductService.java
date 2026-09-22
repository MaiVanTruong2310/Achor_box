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

        Product product = Product.builder()
                .categoryId(request.getCategoryId())
                .sku(request.getSku())
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .images(imagesJson)
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Product saved = productRepository.save(product);

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            List<com.smartbox.backend.entity.ProductVariant> variantEntities = request.getVariants().stream()
                    .map(vr -> com.smartbox.backend.entity.ProductVariant.builder()
                            .productId(saved.getId())
                            .variantName(vr.getVariantName())
                            .sku(vr.getSku())
                            .priceDelta(vr.getPriceDelta() != null ? vr.getPriceDelta() : java.math.BigDecimal.ZERO)
                            .stockQuantity(vr.getStockQuantity() != null ? vr.getStockQuantity() : 0)
                            .build())
                    .toList();
            variantRepository.saveAll(variantEntities);
        }

        return mapToResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        if (request.getCategoryId() != null) product.setCategoryId(request.getCategoryId());
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());

        if (request.getImages() != null) {
            try {
                product.setImages(objectMapper.writeValueAsString(request.getImages()));
            } catch (Exception e) {
                log.warn("Failed to serialize product images: {}", e.getMessage());
            }
        }

        Product updated = productRepository.save(product);

        if (request.getVariants() != null) {
            variantRepository.deleteByProductId(id);
            if (!request.getVariants().isEmpty()) {
                List<com.smartbox.backend.entity.ProductVariant> variantEntities = request.getVariants().stream()
                        .map(vr -> com.smartbox.backend.entity.ProductVariant.builder()
                                .productId(id)
                                .variantName(vr.getVariantName())
                                .sku(vr.getSku())
                                .priceDelta(vr.getPriceDelta() != null ? vr.getPriceDelta() : java.math.BigDecimal.ZERO)
                                .stockQuantity(vr.getStockQuantity() != null ? vr.getStockQuantity() : 0)
                                .build())
                        .toList();
                variantRepository.saveAll(variantEntities);
            }
        }

        return mapToResponse(updated);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sản phẩm", "id", id);
        }
        variantRepository.deleteByProductId(id);
        productRepository.deleteById(id);
    }

    @Transactional
    public ProductResponse adjustStock(UUID id, int delta) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        int newStock = Math.max(0, (product.getStockQuantity() != null ? product.getStockQuantity() : 0) + delta);
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

    public ProductResponse mapToResponse(Product p) {
        List<String> parsedImages = Collections.singletonList("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400");
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
