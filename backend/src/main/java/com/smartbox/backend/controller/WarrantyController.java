package com.smartbox.backend.controller;

import com.smartbox.backend.dto.WarrantyClaimDTO;
import com.smartbox.backend.service.WarrantyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/warranties")
@RequiredArgsConstructor
@Tag(name = "Warranty API", description = "Quản lý bảo hành, xử lý khiếu nại và phân công kỹ thuật viên")
public class WarrantyController {

    private final WarrantyService warrantyService;

    @GetMapping("/claims")
    @Operation(summary = "Lấy danh sách tất cả yêu cầu bảo hành")
    public ResponseEntity<List<WarrantyClaimDTO.ClaimResponse>> getClaims() {
        return ResponseEntity.ok(warrantyService.getClaims());
    }

    @PatchMapping("/claims/{id}/assign")
    @Operation(summary = "Phân công kỹ thuật viên xử lý yêu cầu bảo hành")
    public ResponseEntity<WarrantyClaimDTO.ClaimResponse> assignTechnician(
            @PathVariable UUID id,
            @RequestBody WarrantyClaimDTO.AssignTechnicianRequest request) {
        return ResponseEntity.ok(warrantyService.assignTechnician(id, request.getTechnicianId()));
    }

    @PatchMapping("/claims/{id}/status")
    @Operation(summary = "Cập nhật trạng thái yêu cầu bảo hành (new, in_progress, resolved, rejected)")
    public ResponseEntity<WarrantyClaimDTO.ClaimResponse> updateClaimStatus(
            @PathVariable UUID id,
            @RequestBody WarrantyClaimDTO.StatusUpdateRequest request) {
        return ResponseEntity.ok(warrantyService.updateClaimStatus(id, request.getStatus()));
    }

    @PatchMapping("/claims/{id}/notes")
    @Operation(summary = "Cập nhật ghi chú nội bộ cho ticket bảo hành")
    public ResponseEntity<WarrantyClaimDTO.ClaimResponse> updateNotes(
            @PathVariable UUID id,
            @RequestBody WarrantyClaimDTO.NotesUpdateRequest request) {
        return ResponseEntity.ok(warrantyService.addInternalNote(id, request.getNotes()));
    }
}
