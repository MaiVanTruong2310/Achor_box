package com.smartbox.backend.dto.request.catalog;


import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu tạo hoặc cập nhật loại/danh mục sản phẩm")
public class ProductCategoryRequest {

    @NotBlank(message = "Tên loại sản phẩm không được để trống")
    @Size(max = 100, message = "Tên loại sản phẩm tối đa 100 ký tự")
    @Schema(description = "Tên loại sản phẩm", example = "Linh Kiện Thay Thế & Sửa Chữa")
    private String name;

    @Size(max = 100, message = "Slug tối đa 100 ký tự")
    @Schema(description = "Đường dẫn định danh slug (tự động tạo nếu để trống)", example = "linh-kien-thay-the")
    private String slug;

    @Schema(description = "Mô tả chi tiết loại sản phẩm", example = "Các phụ tùng, linh kiện thay thế chính hãng cho tủ SmartBox")
    private String description;

    @Schema(description = "ID của Product Manager (PO) phụ trách danh mục")
    private java.util.UUID managerId;
}
