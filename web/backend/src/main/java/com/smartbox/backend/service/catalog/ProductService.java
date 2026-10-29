package com.smartbox.backend.service.catalog;

import com.smartbox.backend.dto.request.catalog.ProductCategoryRequest;
import com.smartbox.backend.dto.request.catalog.ProductRequest;
import com.smartbox.backend.dto.request.catalog.ProductVariantRequest;
import com.smartbox.backend.dto.response.catalog.ProductResponse;
import com.smartbox.backend.dto.response.catalog.ProductVariantResponse;
import com.smartbox.backend.entity.Product;
import com.smartbox.backend.entity.ProductCategory;
import com.smartbox.backend.entity.ProductVariant;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.mapper.ProductVariantMapper;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.repository.ProductCategoryRepository;
import com.smartbox.backend.repository.ProductRepository;
import com.smartbox.backend.repository.ProductVariantRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.commerce.OrderWorkflowService;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.common.PaginationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
    private final VariantSpecificationService specifications;
    private final AcceptanceWarrantyService warranties;
    private final com.smartbox.backend.security.CurrentActor actors;
    private final com.smartbox.backend.repository.ProductVariantRepository variantRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return getAllProducts(null, null);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm không tồn tại với ID: " + id));
        return mapToResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts(UUID categoryId, String categorySlug) {
        UUID effectiveCategoryId = categoryId;
        if (effectiveCategoryId == null && categorySlug != null && !categorySlug.isBlank()) {
            var cat = categoryRepository.findBySlug(categorySlug.trim().toLowerCase(java.util.Locale.ROOT));
            if (cat.isPresent()) {
                effectiveCategoryId = cat.get().getId();
            } else {
                return Collections.emptyList();
            }
        }

        List<Product> products = effectiveCategoryId != null
                ? productRepository.findByCategoryIdOrderByCreatedAtDesc(effectiveCategoryId)
                : productRepository.findAllByOrderByCreatedAtDesc();

        return mapProductsToResponses(products);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProductsPaged(int page, int size) {
        return getProductsPaged(page, size, null, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProductsPaged(int page, int size, UUID categoryId, String categorySlug) {
        return getProductsPaged(page, size, categoryId, categorySlug, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProductsPaged(int page, int size, UUID categoryId, String categorySlug, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        UUID effectiveCategoryId = categoryId;
        if (effectiveCategoryId == null && categorySlug != null && !categorySlug.isBlank()) {
            var cat = categoryRepository.findBySlug(categorySlug.trim().toLowerCase(java.util.Locale.ROOT));
            if (cat.isPresent()) {
                effectiveCategoryId = cat.get().getId();
            } else {
                return PaginationUtil.toMap(Page.empty(pageable));
            }
        }

        String trimmedSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<Product> productPage;
        if (trimmedSearch != null) {
            productPage = productRepository.searchProducts(effectiveCategoryId, trimmedSearch, pageable);
        } else if (effectiveCategoryId != null) {
            productPage = productRepository.findByCategoryId(effectiveCategoryId, pageable);
        } else {
            productPage = productRepository.findAll(pageable);
        }

        List<ProductResponse> responses = mapProductsToResponses(productPage.getContent());
        Page<ProductResponse> pageResult = new org.springframework.data.domain.PageImpl<>(responses, pageable, productPage.getTotalElements());

        return PaginationUtil.toMap(pageResult);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "categories", key = "'all'")
    public List<ProductCategory> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "categories", key = "'id:' + #id")
    public ProductCategory getCategoryById(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loại sản phẩm", "id", id));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "categories", key = "'slug:' + #slug")
    public ProductCategory getCategoryBySlug(String slug) {
        return categoryRepository.findBySlug(slug.trim().toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Loại sản phẩm", "slug", slug));
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "categories", allEntries = true),
            @CacheEvict(value = "system_settings", allEntries = true)
    })
    public ProductCategory createCategory(com.smartbox.backend.dto.request.catalog.ProductCategoryRequest request) {
        actors.get().requireRoles("super_admin", "product_manager");
        String name = request.getName().trim();
        String slug = request.getSlug() != null && !request.getSlug().isBlank()
                ? request.getSlug().trim().toLowerCase(java.util.Locale.ROOT)
                : generateSlug(name);

        if (categoryRepository.findBySlug(slug).isPresent()) {
            throw new com.smartbox.backend.exception.ConflictException("SLUG_ALREADY_EXISTS: Đường dẫn slug '" + slug + "' đã tồn tại");
        }

        ProductCategory category = ProductCategory.builder()
                .name(name)
                .slug(slug)
                .description(request.getDescription())
                .managerId(request.getManagerId())
                .build();

        return categoryRepository.save(category);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "categories", allEntries = true),
            @CacheEvict(value = "system_settings", allEntries = true)
    })
    public ProductCategory updateCategory(UUID id, com.smartbox.backend.dto.request.catalog.ProductCategoryRequest request) {
        actors.get().requireRoles("super_admin", "product_manager");
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loại sản phẩm", "id", id));

        String name = request.getName().trim();
        String slug = request.getSlug() != null && !request.getSlug().isBlank()
                ? request.getSlug().trim().toLowerCase(java.util.Locale.ROOT)
                : generateSlug(name);

        var existingSlug = categoryRepository.findBySlug(slug);
        if (existingSlug.isPresent() && !existingSlug.get().getId().equals(id)) {
            throw new com.smartbox.backend.exception.ConflictException("SLUG_ALREADY_EXISTS: Đường dẫn slug '" + slug + "' đã thuộc loại sản phẩm khác");
        }

        category.setName(name);
        category.setSlug(slug);
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        category.setManagerId(request.getManagerId());

        return categoryRepository.save(category);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "categories", allEntries = true),
            @CacheEvict(value = "system_settings", allEntries = true)
    })
    public void deleteCategory(UUID id) {
        actors.get().requireRoles("super_admin", "product_manager");
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loại sản phẩm", "id", id));

        if (!productRepository.findByCategoryIdOrderByCreatedAtDesc(id).isEmpty()) {
            throw new com.smartbox.backend.exception.ConflictException("CATEGORY_IN_USE: Loại sản phẩm đang có sản phẩm thuộc danh mục, không thể xóa");
        }

        categoryRepository.delete(category);
    }

    private String generateSlug(String name) {
        if (name == null) return UUID.randomUUID().toString().substring(0, 8);
        String normalized = java.text.Normalizer.normalize(name.trim(), java.text.Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[đĐ]", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("[\\s+]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return slug.isBlank() ? UUID.randomUUID().toString().substring(0, 8) : slug;
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        actors.get().requireRoles("super_admin","product_manager");
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
        UUID resolvedManagerId = request.getManagerId();
        if (request.getCategoryId() != null) {
            var catOpt = categoryRepository.findById(request.getCategoryId());
            if (catOpt.isPresent() && catOpt.get().getManagerId() != null) {
                resolvedManagerId = catOpt.get().getManagerId();
            }
        }
        Product product = Product.builder()
                .categoryId(request.getCategoryId())
                .managerId(resolvedManagerId)
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
            for(int i=0;i<variantEntities.size();i++) VariantSpecifications.apply(variantEntities.get(i),request.getVariants().get(i));
            variantRepository.saveAllAndFlush(variantEntities);
            for(var variant:variantEntities) recordInitialStock(variant);
        }
        commerce.audit(actors.get().id(),"PRODUCT_CREATED","products",saved.getId(),saved.getSku());
        return mapToResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        actors.get().requireRoles("super_admin","product_manager");
        Product product = productRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        if (request.getCategoryId() != null) {
            product.setCategoryId(request.getCategoryId());
            var catOpt = categoryRepository.findById(request.getCategoryId());
            if (catOpt.isPresent() && catOpt.get().getManagerId() != null) {
                product.setManagerId(catOpt.get().getManagerId());
            }
        } else if (request.getManagerId() != null) {
            product.setManagerId(request.getManagerId());
        }
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if(request.getPrice()!=null && request.getPrice().signum()<0 || request.getStockQuantity()!=null && request.getStockQuantity()<0)
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_PRODUCT_PRICE_OR_STOCK");
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null && !java.util.Objects.equals(request.getStockQuantity(),product.getStockQuantity()))
            throw new com.smartbox.backend.exception.ConflictException("USE_STOCK_ADJUSTMENT: Tồn kho phải thay đổi qua thao tác điều chỉnh kho");
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
                if(vr.getId()==null) variant.setStockQuantity(vr.getStockQuantity()!=null?vr.getStockQuantity():0);
                else if(vr.getStockQuantity()!=null && !java.util.Objects.equals(vr.getStockQuantity(),variant.getStockQuantity()))
                    throw new com.smartbox.backend.exception.ConflictException("USE_VARIANT_STOCK_ADJUSTMENT");
                if(vr.getIsActive()!=null) variant.setIsActive(vr.getIsActive());
                if(vr.getSize()!=null) variant.setSize(vr.getSize());
                if(vr.getCapacityLiter()!=null) variant.setCapacityLiter(vr.getCapacityLiter());
                specifications.applyTo(variant,vr);
                variantRepository.saveAndFlush(variant); retained.add(variant.getId());
                if(vr.getId()==null) recordInitialStock(variant);
            }
            for(var old : current) {
                if(!retained.contains(old.getId())) {
                    var locked=variantRepository.findLockedById(old.getId()).orElseThrow();
                    // Preserve immutable SKU identity and foreign keys of existing orders.
                    locked.setIsActive(false); variantRepository.save(locked);
                }
            }
        }

        commerce.audit(actors.get().id(),"PRODUCT_UPDATED","products",id,"Metadata; tồn kho giữ nguyên");
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        actors.get().requireRoles("super_admin","product_manager");
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sản phẩm", "id", id);
        }
        var product = productRepository.findLockedById(id).orElseThrow();
        product.setIsActive(false); productRepository.save(product);
        for(var v:variantRepository.findAllLockedByProductId(id)) {
            var locked=variantRepository.findLockedById(v.getId()).orElseThrow();
            locked.setIsActive(false);variantRepository.save(locked);
        }
        commerce.audit(actors.get().id(),"PRODUCT_DISABLED","products",id,"Soft delete");
    }

    @Transactional
    public ProductResponse adjustStock(UUID id, int delta) {
        return adjustStock(id, delta, "LEGACY_MANUAL_ADJUSTMENT");
    }

    @Transactional
    public ProductResponse adjustStock(UUID id, int delta, String reason) {
        actors.get().requireRoles("super_admin","product_manager");
        if(delta==0||delta < -100000||delta>100000)throw new com.smartbox.backend.exception.BadRequestException("INVALID_STOCK_DELTA");
        Product product = productRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));

        if (!variantRepository.findByProductIdOrderByPriceDeltaAsc(id).isEmpty())
            throw new com.smartbox.backend.exception.ConflictException("USE_VARIANT_STOCK: Sản phẩm bán theo SKU phải điều chỉnh tồn kho từng variant");
        int newStock = Math.addExact(product.getStockQuantity() != null ? product.getStockQuantity() : 0, delta);
        if(newStock < 0) throw new com.smartbox.backend.exception.ConflictException("INSUFFICIENT_STOCK");
        product.setStockQuantity(newStock);
        String actualReason = (reason != null && !reason.isBlank()) ? reason.trim() : "STOCK_ADJUSTMENT";
        commerce.audit(actors.get().id(),"LEGACY_STOCK_ADJUSTED","products",id,Integer.toString(delta) + " (" + actualReason + ")");
        return mapToResponse(productRepository.save(product));
    }

    private void recordInitialStock(com.smartbox.backend.entity.ProductVariant variant) {
        if(variant.getStockQuantity()!=null && variant.getStockQuantity()>0)
            commerce.update("INSERT INTO public.inventory_movements(id,variant_id,order_id,delta,reason,actor_id,created_at) VALUES(?,?,NULL,?,?,?,?)",
                UUID.randomUUID(),variant.getId(),variant.getStockQuantity(),"INITIAL_STOCK",actors.get().id(),OrderWorkflowService.now());
    }

    @Transactional(readOnly = true)
    public List<com.smartbox.backend.dto.response.catalog.ProductVariantResponse> getVariantsByProductId(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", productId));
        List<com.smartbox.backend.entity.ProductVariant> variants = variantRepository.findByProductIdOrderByPriceDeltaAsc(productId);
        return variants.stream()
                .map(v -> variantResponse(v,product))
                .toList();
    }

    private void validateVariant(com.smartbox.backend.dto.request.catalog.ProductVariantRequest request) {
        if (request.getSku() == null || request.getSku().isBlank() || request.getVariantName() == null || request.getVariantName().isBlank()
                || request.getStockQuantity() != null && request.getStockQuantity() < 0) {
            throw new com.smartbox.backend.exception.BadRequestException("INVALID_VARIANT");
        }
        if (request.getSize() != null && !request.getSize().isBlank()) {
            String upperSize = request.getSize().trim().toUpperCase(java.util.Locale.ROOT);
            if (request.getCapacityLiter() != null && request.getCapacityLiter() <= 0) {
                throw new com.smartbox.backend.exception.BadRequestException("INVALID_VARIANT_CAPACITY");
            }
            Integer expected = java.util.Map.of("S", 45, "M", 85, "L", 150).get(upperSize);
            if (expected != null && request.getCapacityLiter() != null && !expected.equals(request.getCapacityLiter())) {
                throw new com.smartbox.backend.exception.BadRequestException("SIZE_CAPACITY_MISMATCH: Hộp cỡ " + upperSize + " quy chuẩn dung tích phải là " + expected + "L");
            }
        }
    }

    public List<ProductResponse> mapProductsToResponses(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> productIds = products.stream()
                .map(Product::getId)
                .filter(java.util.Objects::nonNull)
                .toList();

        Map<UUID, List<ProductVariant>> variantsByProduct = variantRepository
                .findByProductIdInOrderByPriceDeltaAsc(productIds)
                .stream()
                .collect(Collectors.groupingBy(ProductVariant::getProductId));

        java.util.Set<UUID> categoryIds = products.stream()
                .map(Product::getCategoryId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, ProductCategory> categoryMap = categoryIds.isEmpty()
                ? Collections.emptyMap()
                : categoryRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(ProductCategory::getId, c -> c));

        return products.stream()
                .map(p -> mapToResponse(p, variantsByProduct.getOrDefault(p.getId(), Collections.emptyList()), categoryMap.get(p.getCategoryId())))
                .collect(Collectors.toList());
    }

    public ProductResponse mapToResponse(Product p) {
        ProductCategory cat = null;
        if (p.getCategory() != null) {
            cat = p.getCategory();
        } else if (p.getCategoryId() != null) {
            cat = categoryRepository.findById(p.getCategoryId()).orElse(null);
        }
        List<ProductVariant> variants = variantRepository.findByProductIdOrderByPriceDeltaAsc(p.getId());
        return mapToResponse(p, variants, cat);
    }

    public ProductResponse mapToResponse(Product p, List<ProductVariant> variants, ProductCategory preloadedCategory) {
        List<String> parsedImages = Collections.emptyList();
        if (p.getImages() != null && !p.getImages().isEmpty()) {
            try {
                parsedImages = objectMapper.readValue(p.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                parsedImages = Collections.singletonList(p.getImages());
            }
        }

        String catName = "Hộp Nhận Hàng SmartBox";
        String catSlug = "tu-nhan-hang-thong-minh";
        ProductCategory cat = preloadedCategory != null ? preloadedCategory : p.getCategory();
        if (cat != null) {
            catName = cat.getName();
            catSlug = cat.getSlug();
        } else if (p.getCategoryId() != null) {
            var catOpt = categoryRepository.findById(p.getCategoryId());
            if (catOpt.isPresent()) {
                catName = catOpt.get().getName();
                catSlug = catOpt.get().getSlug();
            }
        }

        List<ProductVariantResponse> variantResponses = variants.stream()
                .map(v -> variantResponse(v, p))
                .toList();

        UUID effectiveManagerId = p.getManagerId();
        if (cat != null && cat.getManagerId() != null) {
            effectiveManagerId = cat.getManagerId();
        }

        return ProductResponse.builder()
                .id(p.getId())
                .categoryId(p.getCategoryId())
                .managerId(effectiveManagerId)
                .categoryName(catName)
                .categorySlug(catSlug)
                .sku(p.getSku())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .images(parsedImages)
                .stockQuantity(p.getStockQuantity())
                .isActive(p.getIsActive()).hasWeightSensor(p.getHasWeightSensor())
                .createdAt(p.getCreatedAt())
                .variants(variantResponses)
                .build();
    }
    private com.smartbox.backend.dto.response.catalog.ProductVariantResponse variantResponse(com.smartbox.backend.entity.ProductVariant v, Product p) {
        var response = com.smartbox.backend.mapper.ProductVariantMapper.toResponse(v, p.getPrice());
        response.setHasWeightSensor(v.getHasWeightSensor() != null ? v.getHasWeightSensor() : p.getHasWeightSensor());
        response.setWarrantyMonths(warranties.variantMonths(v));
        return response;
    }
}
