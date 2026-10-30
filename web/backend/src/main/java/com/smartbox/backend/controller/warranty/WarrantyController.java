package com.smartbox.backend.controller.warranty;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.warranty.AssignTechnicianRequest;
import com.smartbox.backend.dto.request.warranty.ClaimStatusUpdateRequest;
import com.smartbox.backend.dto.request.warranty.NotesUpdateRequest;
import com.smartbox.backend.dto.response.warranty.ClaimResponse;
import com.smartbox.backend.service.warranty.WarrantyService;
import com.smartbox.backend.dto.response.warranty.WarrantyLookupResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/warranties")
@RequiredArgsConstructor
@Tag(name = "Warranty API", description = "Quản lý bảo hành điện tử, tra cứu Serial/QR, tiếp nhận khiếu nại và kỹ thuật viên")
public class WarrantyController {

    private final WarrantyService warrantyService;

    @GetMapping("/technicians")
    @Operation(summary = "Lấy danh sách kỹ thuật viên tiếp nhận bảo hành", description = "Truy xuất danh sách kỹ thuật viên khả dụng để phân công xử lý các ticket khiếu nại bảo hành")
    public List<Map<String,Object>> technicians() {
        return warrantyService.technicians();
    }

    @GetMapping("/lookup")
    @Operation(summary = "Tra cứu thông tin bảo hành điện tử theo Serial Number của thiết bị", description = "Tra cứu công khai thời hạn bảo hành, ngày kích hoạt, trạng thái hiệu lực theo số Serial trên thân tủ")
    public ResponseEntity<WarrantyLookupResponse> lookupWarrantyBySerial(
            @Parameter(description = "Mã Serial Number của thiết bị (VD: DBX-98C377AD9D60)") @RequestParam String serial) {
        return ResponseEntity.ok(warrantyService.lookupWarrantyBySerial(serial));
    }

    @GetMapping("/claims")
    @Operation(summary = "Lấy danh sách tất cả yêu cầu bảo hành", description = "Truy xuất danh sách toàn bộ các phiếu yêu cầu bảo hành do khách hàng gửi lên")
    public ResponseEntity<List<ClaimResponse>> getClaims() {
        return ResponseEntity.ok(warrantyService.getClaims());
    }

    @GetMapping("/claims/paged")
    @Operation(summary = "Lấy danh sách yêu cầu bảo hành có phân trang dạng Map<String, Object>", description = "Phân trang danh sách yêu cầu bảo hành, hỗ trợ lọc theo trạng thái (new, in_progress, resolved, rejected)")
    public ResponseEntity<Map<String, Object>> getClaimsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(warrantyService.getClaimsPaged(page, size));
    }

    @PatchMapping("/claims/{id}/assign")
    @Operation(summary = "Phân công kỹ thuật viên xử lý yêu cầu bảo hành", description = "Chỉ định kỹ thuật viên phụ trách kiểm tra, sửa chữa hoặc thay thế linh kiện cho ticket bảo hành")
    public ResponseEntity<ClaimResponse> assignTechnician(
            @PathVariable UUID id,
            @RequestBody AssignTechnicianRequest request) {
        return ResponseEntity.ok(warrantyService.assignTechnician(id, request.getTechnicianId()));
    }

    @PatchMapping("/claims/{id}/status")
    @Operation(summary = "Cập nhật trạng thái yêu cầu bảo hành (new, in_progress, resolved, rejected)", description = "Thay đổi trạng thái tiến trình xử lý yêu cầu bảo hành (tiếp nhận, đang xử lý, đã giải quyết, từ chối)")
    public ResponseEntity<ClaimResponse> updateClaimStatus(
            @PathVariable UUID id,
            @RequestBody ClaimStatusUpdateRequest request) {
        return ResponseEntity.ok(warrantyService.updateClaimStatus(id, request.getStatus()));
    }

    @PatchMapping("/claims/{id}/notes")
    @Operation(summary = "Cập nhật ghi chú nội bộ cho ticket bảo hành", description = "Bổ sung thông tin ghi chú kỹ thuật hoặc kết luận kiểm tra thiết bị vào hồ sơ ticket bảo hành")
    public ResponseEntity<ClaimResponse> updateNotes(
            @PathVariable UUID id,
            @RequestBody NotesUpdateRequest request) {
        return ResponseEntity.ok(warrantyService.addInternalNote(id, request.getNotes()));
    }
}
