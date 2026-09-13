package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.ProductDTO;
import com.smartbox.backend.model.Product;
import com.smartbox.backend.model.ProductCategory;
import com.smartbox.backend.repository.ProductCategoryRepository;
import com.smartbox.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<ProductDTO.ProductResponse> getAllProducts() {
        return productRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductCategory> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc();
    }

    @Transactional
    public ProductDTO.ProductResponse createProduct(ProductDTO.ProductRequest request) {
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
        return mapToResponse(saved);
    }

    @Transactional
    public ProductDTO.ProductResponse updateProduct(UUID id, ProductDTO.ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại với ID: " + id));

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
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        productRepository.deleteById(id);
    }

    @Transactional
    public ProductDTO.ProductResponse adjustStock(UUID id, int delta) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại với ID: " + id));

        int newStock = Math.max(0, (product.getStockQuantity() != null ? product.getStockQuantity() : 0) + delta);
        product.setStockQuantity(newStock);
        return mapToResponse(productRepository.save(product));
    }

    private ProductDTO.ProductResponse mapToResponse(Product p) {
        List<String> parsedImages = Collections.singletonList("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400");
        if (p.getImages() != null && !p.getImages().isEmpty()) {
            try {
                parsedImages = objectMapper.readValue(p.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                parsedImages = Collections.singletonList(p.getImages());
            }
        }

        String catName = p.getCategory() != null ? p.getCategory().getName() : "Hộp Nhận Hàng IoT";

        return ProductDTO.ProductResponse.builder()
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
                .build();
    }
}
