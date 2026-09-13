import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  MessageSquare,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Cpu,
  X,
  Save,
  CheckCircle2,
  ChevronRight,
  Sparkle,
  HardDrive,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  ExternalLink,
  Phone,
  MapPin,
  Tag,
  Kanban,
  ListFilter,
  SlidersHorizontal,
  FileCheck,
  BadgeAlert,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Lock,
  Zap
} from 'lucide-react';
import { WarrantyClaim, ClaimStatus, UserRole } from '../types/database';
import { warrantiesService, ExtendedWarrantyClaim, InspectionChecklist } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Preset Demonstration Evidence Photos for Technicians
const PRESET_PROOF_IMAGES = [
  {
    name: 'Bo mạch ESP32 & Hàn chống ẩm',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    desc: 'Đã phủ silicon chống ẩm và đo chân GPIO 19'
  },
  {
    name: 'Khóa cơ Servo MG90S hoàn tất',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    desc: 'Đã thay bánh răng kim loại và căn góc đóng nắp 0 độ'
  },
  {
    name: 'Hiệu chuẩn Cân LoadCell HX711',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    desc: 'Hiệu chuẩn quả cân chuẩn 1.000kg sai số 0.00g'
  },
  {
    name: 'Dán tem niêm phong bảo hành',
    url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80',
    desc: 'Dán tem bảo hành điện tử QR & nghiệm thu ngoại quan'
  }
];

// Available Technicians
const TECHNICIANS_LIST = [
  { id: 'tech-001', name: 'Trần Kỹ Thuật', phone: '0912.345.678', spec: 'Cảm biến & Vi điều khiển ESP32', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'tech-002', name: 'Lê Văn Vũ', phone: '0905.123.987', spec: 'Cơ khí chính xác & Khóa Servo', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'tech-003', name: 'Hoàng Minh Tuấn', phone: '0944.556.677', spec: 'Hệ thống Nguồn & Pin Li-ion', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' }
];

// Common Spare Parts
const COMMON_PARTS = [
  'Module HC-SR04 V2 Chống Nhiễu',
  'Servo MG90S Kim Loại (Metal Gear)',
  'Mạch Cân LoadCell HX711 24-bit',
  'Bo Mạch Vi Điều Khiển ESP32-S3',
  'Cell Pin Li-ion Panasonic 18650',
  'Chốt Khóa Cơ Khí Hợp Kim Nhôm',
  'Mạch Sạc & Bảo Vệ Pin BMS 2S',
  'Dây Cáp Tín Hiệu Bọc Giáp Bạc'
];

export const Warranties: React.FC = () => {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<ExtendedWarrantyClaim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View mode: Kanban pipeline vs List table
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit / Workflow Modal State
  const [selectedClaim, setSelectedClaim] = useState<ExtendedWarrantyClaim | null>(null);
  const [modalStatus, setModalStatus] = useState<ClaimStatus>('new');
  const [modalAssigneeId, setModalAssigneeId] = useState<string>('');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalParts, setModalParts] = useState<string[]>([]);
  const [modalRepairImages, setModalRepairImages] = useState<string[]>([]);
  const [modalChecklist, setModalChecklist] = useState<InspectionChecklist>({
    power_tested: false,
    lock_tested: false,
    sensor_tested: false,
    loadcell_tested: false,
    seal_applied: false
  });
  const [modalTab, setModalTab] = useState<'general' | 'parts_notes' | 'proof_evidence' | 'checklist'>('general');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Image Lightbox Preview Modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClaims = async () => {
    setLoading(true);
    const data = await warrantiesService.getClaims();
    setClaims(data);
    setLoading(false);
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEditModal = (claim: ExtendedWarrantyClaim, initialTab: 'general' | 'parts_notes' | 'proof_evidence' | 'checklist' = 'general') => {
    setSelectedClaim(claim);
    setModalStatus(claim.status);
    setModalAssigneeId(claim.assigned_to || '');
    setModalPriority(claim.priority || 'medium');
    setModalNotes(claim.internal_notes || '');
    setModalParts(claim.replacement_parts || []);
    setModalRepairImages(claim.repair_images || []);
    setModalChecklist(claim.inspection_checklist || {
      power_tested: false,
      lock_tested: false,
      sensor_tested: false,
      loadcell_tested: false,
      seal_applied: false
    });
    setModalTab(initialTab);
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Upload local image via FileReader
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setModalRepairImages(prev => [...prev, uploadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add preset proof photo
  const handleAddPresetPhoto = (url: string) => {
    if (!modalRepairImages.includes(url)) {
      setModalRepairImages(prev => [...prev, url]);
    }
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setModalRepairImages(prev => prev.filter((_, i) => i !== index));
  };

  // Save Claim / Progress Update
  const handleSaveClaim = async () => {
    if (!selectedClaim) return;

    // MANDATORY PROOF VALIDATION: If marking as 'resolved', MUST have at least 1 repair proof image
    if (modalStatus === 'resolved') {
      if (!modalRepairImages || modalRepairImages.length === 0) {
        setValidationError('QUY TẮC NGHIỆP VỤ BẮT BUỘC: Kỹ thuật viên phải có ít nhất 01 ảnh minh chứng hoàn tất sửa chữa/bảo trì trước khi nghiệm thu hoàn thành!');
        setModalTab('proof_evidence');
        return;
      }
    }

    setSaving(true);
    setValidationError(null);

    const techObj = TECHNICIANS_LIST.find(t => t.id === modalAssigneeId);

    const updates: Partial<ExtendedWarrantyClaim> = {
      status: modalStatus,
      assigned_to: modalAssigneeId || null,
      technician_name: techObj?.name,
      technician_phone: techObj?.phone,
      priority: modalPriority,
      internal_notes: modalNotes,
      replacement_parts: modalParts,
      repair_images: modalRepairImages,
      inspection_checklist: modalChecklist,
      resolved_at: modalStatus === 'resolved' ? (selectedClaim.resolved_at || new Date().toISOString()) : null
    };

    // Update in UI state
    setClaims(prev => prev.map(c => c.id === selectedClaim.id ? { ...c, ...updates } : c));

    // Persist via Service
    await warrantiesService.updateClaimFull(selectedClaim.id, updates);

    setSaving(false);
    setIsModalOpen(false);
  };

  // Quick Advance Status in Kanban
  const handleQuickAdvance = async (claim: ExtendedWarrantyClaim, targetStatus: ClaimStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetStatus === 'resolved' && (!claim.repair_images || claim.repair_images.length === 0)) {
      // Prompt modal to upload proof
      handleOpenEditModal(claim, 'proof_evidence');
      return;
    }

    const updates: Partial<ExtendedWarrantyClaim> = {
      status: targetStatus,
      resolved_at: targetStatus === 'resolved' ? new Date().toISOString() : claim.resolved_at
    };

    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, ...updates } : c));
    await warrantiesService.updateClaimFull(claim.id, updates);
  };

  // Filtering
  const filteredClaims = claims.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || c.priority === filterPriority;
    const matchesAssignee =
      filterAssignee === 'all' ||
      (filterAssignee === 'unassigned' && !c.assigned_to) ||
      (filterAssignee === 'tech-001' && c.assigned_to === 'tech-001') ||
      (filterAssignee === 'tech-002' && c.assigned_to === 'tech-002') ||
      (filterAssignee === 'tech-003' && c.assigned_to === 'tech-003');

    const matchesSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customer_phone || '').includes(searchTerm) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.technician_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesAssignee && matchesSearch;
  });

  // KPI Calculations
  const newClaimsCount = claims.filter(c => c.status === 'new').length;
  const inProgressCount = claims.filter(c => c.status === 'in_progress').length;
  const resolvedCount = claims.filter(c => c.status === 'resolved').length;
  const totalVerifiedProofCount = claims.filter(c => c.repair_images && c.repair_images.length > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Workflow Role Navigator */}
      <div className="card" style={{
        padding: '20px 24px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(37, 99, 235, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
              flexShrink: 0
            }}>
              <ShieldCheck size={25} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Trung Tâm Bảo Hành & Nghiệm Thu Kỹ Thuật
                </h2>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px' }}>
                  <Sparkles size={11} /> Quy Trình Chuẩn 3 Lớp
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px', margin: 0 }}>
                Quản lý vòng đời sự cố SmartBox: Tiếp nhận ➔ Phân công thợ ➔ Đo kiểm sửa chữa ➔ <strong style={{ color: 'var(--accent-emerald)' }}>Bắt buộc ảnh minh chứng nghiệm thu</strong>.
              </p>
            </div>
          </div>

          {/* Quick View Controls - Smooth Rounded Segmented Pill (Blends seamlessly with background) */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '9999px',
              padding: '3px',
              border: 'none',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: viewMode === 'kanban' ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: viewMode === 'kanban' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'kanban' ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none'
                }}
              >
                <Kanban size={14} />
                <span>Kanban Pipeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: viewMode === 'list' ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'list' ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none'
                }}
              >
                <ListFilter size={14} />
                <span>Bảng Danh Sách</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Step Visual Process Tracker */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>1. Tiếp Nhận & Phân Công</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Role Điều Phối / Admin</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.2)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>2. Đo Kiểm & Sửa Chữa</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Role Kỹ Thuật Viên / Thợ</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)', whiteSpace: 'nowrap' }}>3. Minh Chứng & Nghiệm Thu</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Bắt buộc ảnh sau sửa chữa</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)', flexShrink: 0 }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Mới Nhận (Chờ Gán KTV)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {newClaimsCount} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>yêu cầu mới</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Đang Xử Lý Tại Hiện Trường
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {inProgressCount} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>hộp đang sửa</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Đã Nghiệm Thu Hoàn Tất
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {resolvedCount} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>đã bàn giao</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-sky)', flexShrink: 0 }}>
            <Camera size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Tỷ Lệ Có Ảnh Minh Chứng
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              100% <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>({totalVerifiedProofCount} phiếu)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="card" style={{ padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '40px', margin: 0, borderRadius: '9999px', border: 'none', background: 'var(--bg-surface)' }}
              placeholder="Tìm theo mã TK, Serial hộp, Khách hàng, Thợ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Filter Buttons Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            borderRadius: '9999px',
            padding: '3px',
            border: 'none',
            gap: '2px'
          }}>
            {[
              { id: 'all', label: `Tất cả (${claims.length})` },
              { id: 'new', label: `Mới (${newClaimsCount})` },
              { id: 'in_progress', label: `Đang xử lý (${inProgressCount})` },
              { id: 'resolved', label: `Hoàn tất (${resolvedCount})` }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8125rem',
                  fontWeight: filterStatus === st.id ? 700 : 500,
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease',
                  background: filterStatus === st.id ? 'var(--accent-primary)' : 'transparent',
                  color: filterStatus === st.id ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: filterStatus === st.id ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Technician Filter */}
          <select
            className="input-field"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8125rem', margin: 0, borderRadius: '9999px', whiteSpace: 'nowrap', border: 'none', background: 'var(--bg-surface)' }}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">Tất cả thợ</option>
            <option value="tech-001">Trần Kỹ Thuật (ESP32 / Sensor)</option>
            <option value="tech-002">Lê Văn Vũ (Servo / Cơ khí)</option>
            <option value="tech-003">Hoàng Minh Tuấn (Pin / BMS)</option>
            <option value="unassigned">Chưa phân công thợ</option>
          </select>

          {/* Priority Filter */}
          <select
            className="input-field"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8125rem', margin: 0, borderRadius: '9999px', whiteSpace: 'nowrap', border: 'none', background: 'var(--bg-surface)' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">Tất cả mức ưu tiên</option>
            <option value="urgent">Khẩn cấp (SLA 2h)</option>
            <option value="high">Cao (SLA 6h)</option>
            <option value="medium">Bình thường (SLA 24h)</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN VIEW: KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'flex-start'
        }}>
          {/* Column 1: Mới tiếp nhận */}
          <KanbanColumn
            title="Mới Tiếp Nhận"
            subtitle="Yêu cầu mới từ khách hàng, chờ gán thợ"
            count={filteredClaims.filter(c => c.status === 'new').length}
            accentColor="var(--accent-amber)"
            claims={filteredClaims.filter(c => c.status === 'new')}
            onOpenModal={handleOpenEditModal}
            onQuickAdvance={handleQuickAdvance}
            onOpenLightbox={setLightboxImage}
            onCopyId={handleCopyId}
            copiedId={copiedId}
          />

          {/* Column 2: Đang xử lý */}
          <KanbanColumn
            title="Đang Xử Lý & Đo Kiểm"
            subtitle="Kỹ thuật viên đang kiểm định & thay linh kiện"
            count={filteredClaims.filter(c => c.status === 'in_progress').length}
            accentColor="var(--accent-primary)"
            claims={filteredClaims.filter(c => c.status === 'in_progress')}
            onOpenModal={handleOpenEditModal}
            onQuickAdvance={handleQuickAdvance}
            onOpenLightbox={setLightboxImage}
            onCopyId={handleCopyId}
            copiedId={copiedId}
          />

          {/* Column 3: Đã hoàn tất & có ảnh minh chứng */}
          <KanbanColumn
            title="Đã Nghiệm Thu Hoàn Tất"
            subtitle="Đã có ảnh minh chứng & biên bản bàn giao"
            count={filteredClaims.filter(c => c.status === 'resolved').length}
            accentColor="var(--accent-emerald)"
            claims={filteredClaims.filter(c => c.status === 'resolved')}
            onOpenModal={handleOpenEditModal}
            onQuickAdvance={handleQuickAdvance}
            onOpenLightbox={setLightboxImage}
            onCopyId={handleCopyId}
            copiedId={copiedId}
          />
        </div>
      )}

      {/* 5. ALTERNATIVE VIEW: LIST / TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '4px' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '150px' }}>MÃ TICKET & THIẾT BỊ</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '170px' }}>KHÁCH HÀNG & ĐỊA ĐIỂM</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', minWidth: '220px' }}>SỰ CỐ & LINH KIỆN</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '200px' }}>ẢNH ĐỐI CHỨNG (TRƯỚC / SAU)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '150px' }}>KTV PHỤ TRÁCH</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '150px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '110px', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                          #TK-{claim.id.slice(-6).toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => handleCopyId(claim.id, e)}
                          title="Sao chép full UUID"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                        >
                          {copiedId === claim.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 600 }}>
                        {claim.serial_number}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {claim.device_name}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{claim.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={12} /> {claim.customer_phone}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {claim.customer_address}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', minWidth: '220px', verticalAlign: 'middle' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        background: 'rgba(244, 63, 94, 0.1)',
                        color: '#fb7185',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        marginBottom: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        <AlertTriangle size={11} />
                        {claim.fault_category === 'sensor_fault' && 'Cảm Biến HC-SR04'}
                        {claim.fault_category === 'mechanical_jam' && 'Khóa Nắp Servo MG90S'}
                        {claim.fault_category === 'scale_deviation' && 'Cân Đo LoadCell HX711'}
                        {claim.fault_category === 'power_supply' && 'Nguồn Pin Li-ion & BMS'}
                        {claim.fault_category === 'connectivity' && 'Mạch Vi Điều Khiển ESP32'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {claim.description}
                      </div>
                      {claim.replacement_parts && claim.replacement_parts.length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--accent-sky)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Wrench size={11} />
                          {claim.replacement_parts.join(', ')}
                        </div>
                      )}
                    </td>

                    {/* Double Evidence Comparison */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Customer Fault Image */}
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px', whiteSpace: 'nowrap' }}>Khách gửi:</div>
                          {claim.images && claim.images[0] ? (
                            <img
                              src={claim.images[0]}
                              alt="Lỗi khách gửi"
                              onClick={() => setLightboxImage({ url: claim.images![0], title: `Ảnh lỗi khách hàng gửi - #TK-${claim.id.slice(-6).toUpperCase()}`, subtitle: claim.description })}
                              style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '3px', border: '1px solid rgba(244, 63, 94, 0.3)', cursor: 'pointer', display: 'block' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = PRESET_PROOF_IMAGES[0].url;
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chưa có</span>
                          )}
                        </div>

                        {/* Technician Proof Image */}
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap' }}>Thợ minh chứng:</div>
                          {claim.repair_images && claim.repair_images.length > 0 ? (
                            <div style={{ position: 'relative' }}>
                              <img
                                src={claim.repair_images[0]}
                                alt="Minh chứng thợ"
                                onClick={() => setLightboxImage({ url: claim.repair_images![0], title: `Ảnh minh chứng hoàn tất của Thợ - #TK-${claim.id.slice(-6).toUpperCase()}`, subtitle: `KTV: ${claim.technician_name || 'Kỹ thuật viên'} • Ghi chú: ${claim.internal_notes || 'Đã kiểm định hoàn tất.'}` })}
                                style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '3px', border: '2px solid var(--accent-emerald)', cursor: 'pointer', display: 'block' }}
                              />
                              {claim.repair_images.length > 1 && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  right: '2px',
                                  background: 'rgba(0,0,0,0.75)',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  padding: '1px 3px',
                                  borderRadius: '2px',
                                  fontWeight: 700
                                }}>
                                  +{claim.repair_images.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '3px',
                              border: '1px dashed rgba(245, 158, 11, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: 'var(--accent-amber)',
                              textAlign: 'center',
                              padding: '2px'
                            }}>
                              <Camera size={14} />
                              <span style={{ whiteSpace: 'nowrap' }}>Thiếu</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {claim.technician_name ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{claim.technician_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{claim.technician_phone}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--accent-amber)', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Chưa phân công</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {claim.status === 'new' && (
                        <span className="badge badge-warning" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '3px' }}>
                          <Clock size={12} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap' }}>Mới tiếp nhận</span>
                        </span>
                      )}
                      {claim.status === 'in_progress' && (
                        <span className="badge badge-role" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#38bdf8', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '3px' }}>
                          <Wrench size={12} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap' }}>Đang sửa chữa</span>
                        </span>
                      )}
                      {claim.status === 'resolved' && (
                        <span className="badge badge-success" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '3px' }}>
                          <CheckCircle2 size={12} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap' }}>Đã nghiệm thu</span>
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', borderRadius: '3px', flexShrink: 0 }}
                        onClick={() => handleOpenEditModal(claim)}
                      >
                        <Wrench size={13} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>Xử Lý</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL: XỬ LÝ QUY TRÌNH & MINH CHỨNG SỬA CHỮA */}
      {isModalOpen && selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={22} color="var(--accent-primary)" />
                    Xử Lý & Nghiệm Thu Bảo Hành Thiết Bị
                  </h3>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '3px',
                    background: 'rgba(37, 99, 235, 0.15)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.85rem'
                  }}>
                    #TK-{selectedClaim.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                  Thiết bị: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedClaim.serial_number}</strong> • Khách: {selectedClaim.customer_name} ({selectedClaim.customer_phone})
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '3px' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                borderRadius: '4px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '0.8125rem',
                color: '#fb7185',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertTriangle size={18} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Modal Step Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '20px',
              gap: '6px'
            }}>
              {[
                { id: 'general', label: '1. Tiếp Nhận & Phân Công', icon: User },
                { id: 'parts_notes', label: '2. Chẩn Đoán & Linh Kiện', icon: Wrench },
                { id: 'proof_evidence', label: '3. Ảnh Minh Chứng (Thợ)', icon: Camera, highlight: true },
                { id: 'checklist', label: '4. Kiểm Định QC', icon: FileCheck }
              ].map(tab => {
                const IconComponent = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id as any)}
                    style={{
                      padding: '10px 14px',
                      background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: isActive ? (tab.highlight ? 'var(--accent-emerald)' : 'var(--accent-primary)') : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '3px 3px 0 0',
                      transition: 'all 0.15s'
                    }}
                  >
                    <IconComponent size={15} />
                    <span>{tab.label}</span>
                    {tab.id === 'proof_evidence' && modalRepairImages.length > 0 && (
                      <span style={{
                        background: 'var(--accent-emerald)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        fontWeight: 800
                      }}>
                        {modalRepairImages.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: GENERAL & ASSIGNMENT */}
            {modalTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Status Switcher */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>
                    Trạng Thái Quy Trình
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'new', label: '1. Mới Tiếp Nhận', desc: 'Chờ điều phối / gán thợ' },
                      { id: 'in_progress', label: '2. Đang Sửa Chữa', desc: 'Thợ đang đo kiểm tại chỗ' },
                      { id: 'resolved', label: '3. Nghiệm Thu Hoàn Tất', desc: 'Đã có ảnh minh chứng của thợ' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setModalStatus(st.id as any)}
                        style={{
                          padding: '10px',
                          borderRadius: '4px',
                          border: modalStatus === st.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          background: modalStatus === st.id ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: modalStatus === st.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {st.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {st.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority & SLA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>
                      Mức Độ Ưu Tiên & Cam Kết SLA
                    </label>
                    <select
                      className="input-field"
                      style={{ width: '100%', margin: 0, borderRadius: '4px' }}
                      value={modalPriority}
                      onChange={(e) => setModalPriority(e.target.value as any)}
                    >
                      <option value="urgent">Khẩn Cấp (SLA 2 giờ - Khóa kẹt, mất an toàn)</option>
                      <option value="high">Cao (SLA 6 giờ - Cảm biến không nhận hàng)</option>
                      <option value="medium">Bình Thường (SLA 24 giờ - Cân lệch nhẹ, pin chai)</option>
                      <option value="low">Thấp (SLA 48 giờ - Vệ sinh / Bảo trì định kỳ)</option>
                    </select>
                  </div>

                  {/* Technician Assignee */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>
                      Kỹ Thuật Viên (Thợ) Phụ Trách
                    </label>
                    <select
                      className="input-field"
                      style={{ width: '100%', margin: 0, borderRadius: '4px' }}
                      value={modalAssigneeId}
                      onChange={(e) => setModalAssigneeId(e.target.value)}
                    >
                      <option value="">-- Chưa phân công thợ --</option>
                      {TECHNICIANS_LIST.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} • {tech.spec} ({tech.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer Report Summary Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '14px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}>
                  {selectedClaim.images && selectedClaim.images[0] && (
                    <img
                      src={selectedClaim.images[0]}
                      alt="Ảnh lỗi"
                      onClick={() => setLightboxImage({ url: selectedClaim.images![0], title: 'Ảnh lỗi khách hàng gửi ban đầu', subtitle: selectedClaim.description })}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--border-color)', cursor: 'pointer', flexShrink: 0 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_PROOF_IMAGES[0].url;
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Mô Tả Hiện Trạng Sự Cố Từ Khách Hàng:
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                      {selectedClaim.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Địa chỉ: <strong>{selectedClaim.customer_address}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DIAGNOSTICS & REPLACEMENT PARTS */}
            {modalTab === 'parts_notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Replacement Parts Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>
                    Linh Kiện & Phụ Tùng Đã Thay Thế
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {COMMON_PARTS.map(part => {
                      const isChecked = modalParts.includes(part);
                      return (
                        <label
                          key={part}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.8125rem',
                            background: isChecked ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            padding: '8px 12px',
                            borderRadius: '3px',
                            border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalParts([...modalParts, part]);
                              } else {
                                setModalParts(modalParts.filter(p => p !== part));
                              }
                            }}
                          />
                          <span>{part}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Technical Notes Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>
                    Nhật Ký & Phương Án Xử Lý Của Kỹ Thuật Viên
                  </label>
                  <textarea
                    className="input-field"
                    rows={4}
                    style={{ width: '100%', margin: 0, resize: 'vertical', lineHeight: 1.5, borderRadius: '4px' }}
                    placeholder="Ghi lại nguyên nhân gốc (Root Cause), thông số đo kiểm (điện áp, góc quay servo, sai số cân nặng) và các bước đã khắc phục..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: TECHNICIAN PROOF-OF-REPAIR EVIDENCE (MANDATORY FOR RESOLUTION) */}
            {modalTab === 'proof_evidence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Banner Guidance */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '4px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      Yêu Cầu Nghiệm Thu: Ảnh Minh Chứng Sau Sửa Chữa
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Kỹ thuật viên phải cung cấp ảnh chụp góc độ rõ nét (mạch đã hàn / khóa servo đã lắp / quả cân chuẩn / tem niêm phong) để đối chứng và bàn giao cho khách hàng.
                    </div>
                  </div>
                </div>

                {/* Upload Action Area */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handleLocalImageUpload}
                  />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '3px' }}
                    >
                      <Upload size={15} />
                      <span>Tải Ảnh Minh Chứng Từ Máy / Camera</span>
                    </button>
                  </div>
                </div>

                {/* Preset Fast Evidence Library (For quick selection & demonstration) */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Hoặc Chọn Nhanh Ảnh Minh Chứng Kỹ Thuật Chuẩn Hóa:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    {PRESET_PROOF_IMAGES.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleAddPresetPhoto(preset.url)}
                        style={{
                          border: modalRepairImages.includes(preset.url) ? '2px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          background: 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <img src={preset.url} alt={preset.name} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                        <div style={{ padding: '6px 8px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{preset.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.2 }}>{preset.desc}</div>
                        </div>
                        {modalRepairImages.includes(preset.url) && (
                          <div style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'var(--accent-emerald)',
                            color: '#fff',
                            borderRadius: '2px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Proof Photos Gallery */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>Danh Sách Ảnh Minh Chứng Đã Gắn Vào Ticket ({modalRepairImages.length} ảnh):</span>
                  </div>

                  {modalRepairImages.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      border: '2px dashed rgba(245, 158, 11, 0.35)',
                      borderRadius: '4px',
                      textAlign: 'center',
                      color: 'var(--accent-amber)',
                      background: 'rgba(245, 158, 11, 0.04)'
                    }}>
                      <Camera size={28} style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Chưa có ảnh minh chứng của thợ!</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Vui lòng tải ảnh từ máy hoặc chọn ảnh từ thư viện mẫu phía trên trước khi nghiệm thu hoàn tất.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                      {modalRepairImages.map((imgUrl, index) => (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '2px solid var(--accent-emerald)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Minh chứng ${index + 1}`}
                            onClick={() => setLightboxImage({ url: imgUrl, title: `Ảnh minh chứng #${index + 1} của Thợ`, subtitle: `Ticket #TK-${selectedClaim.id.slice(-6).toUpperCase()}` })}
                            style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            title="Xóa ảnh này"
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(244, 63, 94, 0.9)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '2px',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: QC CHECKLIST */}
            {modalTab === 'checklist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Đánh dấu các tiêu chuẩn chất lượng đã kiểm tra thực tế trên thiết bị SmartBox:
                </div>

                {[
                  { key: 'power_tested', label: '1. Đo kiểm nguồn điện 5V/3.3V và mạch bảo vệ pin BMS an toàn', icon: Zap },
                  { key: 'lock_tested', label: '2. Thử nghiệm đóng mở khóa nắp cơ khí Servo 10 chu kỳ liên tục không kẹt', icon: Lock },
                  { key: 'sensor_tested', label: '3. Kiểm tra cảm biến siêu âm HC-SR04 nhận diện vật cản chính xác', icon: Cpu },
                  { key: 'loadcell_tested', label: '4. Hiệu chuẩn cân nặng LoadCell HX711 với quả cân chuẩn sai số < 10g', icon: Scale },
                  { key: 'seal_applied', label: '5. Dán tem niêm phong bảo hành điện tử chính hãng SmartBox', icon: Award }
                ].map(item => {
                  const isChecked = (modalChecklist as any)[item.key];
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '4px',
                        background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setModalChecklist({
                            ...modalChecklist,
                            [item.key]: e.target.checked
                          });
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {modalStatus === 'resolved' && (
                  <span style={{ color: modalRepairImages.length > 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 600 }}>
                    {modalRepairImages.length > 0 ? 'Đã đủ điều kiện nghiệm thu' : 'Cần ít nhất 1 ảnh minh chứng'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ borderRadius: '3px' }} onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveClaim}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '3px' }}
                >
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Lưu Cập Nhật Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. LIGHTBOX IMAGE PREVIEW MODAL */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '100%',
              background: '#0f172a',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{lightboxImage.title}</h4>
                {lightboxImage.subtitle && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{lightboxImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '3px' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', padding: '16px', maxHeight: '75vh' }}>
              <img
                src={lightboxImage.url}
                alt="Enlarged evidence"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '3px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// KANBAN COLUMN COMPONENT
// ==============================================================================
interface KanbanColumnProps {
  title: string;
  subtitle: string;
  count: number;
  accentColor: string;
  claims: ExtendedWarrantyClaim[];
  onOpenModal: (claim: ExtendedWarrantyClaim, tab?: any) => void;
  onQuickAdvance: (claim: ExtendedWarrantyClaim, target: ClaimStatus, e: React.MouseEvent) => void;
  onOpenLightbox: (data: { url: string; title: string; subtitle?: string }) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  subtitle,
  count,
  accentColor,
  claims,
  onOpenModal,
  onQuickAdvance,
  onOpenLightbox,
  onCopyId,
  copiedId
}) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '4px',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '600px'
    }}>
      {/* Column Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        borderTop: `3px solid ${accentColor}`,
        borderRadius: '4px 4px 0 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
            {title}
          </h3>
          <span style={{
            background: `${accentColor}22`,
            color: accentColor,
            fontWeight: 800,
            fontSize: '0.78rem',
            padding: '2px 8px',
            borderRadius: '2px',
            border: `1px solid ${accentColor}44`,
            whiteSpace: 'nowrap'
          }}>
            {count}
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {subtitle}
        </p>
      </div>

      {/* Cards Container */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {claims.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Không có phiếu nào ở giai đoạn này
          </div>
        ) : (
          claims.map(claim => (
            <KanbanCard
              key={claim.id}
              claim={claim}
              onOpenModal={onOpenModal}
              onQuickAdvance={onQuickAdvance}
              onOpenLightbox={onOpenLightbox}
              onCopyId={onCopyId}
              copiedId={copiedId}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// KANBAN CARD COMPONENT
// ==============================================================================
interface KanbanCardProps {
  claim: ExtendedWarrantyClaim;
  onOpenModal: (claim: ExtendedWarrantyClaim, tab?: any) => void;
  onQuickAdvance: (claim: ExtendedWarrantyClaim, target: ClaimStatus, e: React.MouseEvent) => void;
  onOpenLightbox: (data: { url: string; title: string; subtitle?: string }) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  claim,
  onOpenModal,
  onQuickAdvance,
  onOpenLightbox,
  onCopyId,
  copiedId
}) => {
  const shortTicketId = `TK-${claim.id.slice(-6).toUpperCase()}`;
  const isResolved = claim.status === 'resolved';
  const hasProof = claim.repair_images && claim.repair_images.length > 0;

  return (
    <div
      className="card"
      style={{
        padding: '14px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: isResolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}
    >
      {/* Ticket ID, Copy button, Priority Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: 'var(--accent-primary)',
            fontSize: '0.85rem'
          }}>
            #{shortTicketId}
          </span>
          <button
            onClick={(e) => onCopyId(claim.id, e)}
            title="Sao chép ID"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
          >
            {copiedId === claim.id ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
          </button>
        </div>

        {/* Priority Badge */}
        {claim.priority === 'urgent' && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '2px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', whiteSpace: 'nowrap' }}>
            Khẩn cấp (2h)
          </span>
        )}
        {claim.priority === 'high' && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', whiteSpace: 'nowrap' }}>
            Ưu tiên cao
          </span>
        )}
        {(!claim.priority || claim.priority === 'medium') && (
          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 6px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Tiêu chuẩn
          </span>
        )}
      </div>

      {/* Device and Customer info */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '3px',
        padding: '8px 10px',
        border: '1px solid var(--border-color)',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{claim.serial_number}</strong>
          <strong style={{ color: 'var(--text-primary)' }}>{claim.customer_name}</strong>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
          <span>{claim.device_name}</span>
          <span>{claim.customer_phone}</span>
        </div>
      </div>

      {/* Fault Category Tag */}
      <div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          borderRadius: '2px',
          background: 'rgba(244, 63, 94, 0.08)',
          color: '#fb7185',
          fontSize: '0.7rem',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          <AlertTriangle size={11} />
          {claim.fault_category === 'sensor_fault' && 'Lỗi Cảm Biến HC-SR04'}
          {claim.fault_category === 'mechanical_jam' && 'Kẹt Cơ Khí / Servo Khóa'}
          {claim.fault_category === 'scale_deviation' && 'Lệch Cân LoadCell HX711'}
          {claim.fault_category === 'power_supply' && 'Sự Cố Nguồn Pin Li-ion'}
          {claim.fault_category === 'connectivity' && 'Mất Kết Nối ESP32'}
        </span>
      </div>

      {/* Fault Description */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {claim.description}
      </div>

      {/* DOUBLE-EVIDENCE DISPLAY: Customer Photo vs Technician Proof */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        background: 'rgba(0,0,0,0.25)',
        padding: '8px',
        borderRadius: '3px'
      }}>
        {/* Left: Customer Initial Photo */}
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
            Khách gửi:
          </div>
          {claim.images && claim.images[0] ? (
            <img
              src={claim.images[0]}
              alt="Ảnh lỗi"
              onClick={() => onOpenLightbox({ url: claim.images![0], title: `Ảnh lỗi khách gửi - #${shortTicketId}`, subtitle: claim.description })}
              style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '3px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = PRESET_PROOF_IMAGES[0].url;
              }}
            />
          ) : (
            <div style={{ height: '70px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Không có ảnh
            </div>
          )}
        </div>

        {/* Right: Technician Proof Photo */}
        <div>
          <div style={{ fontSize: '0.65rem', color: hasProof ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 700, marginBottom: '4px', whiteSpace: 'nowrap' }}>
            {hasProof ? 'Minh chứng thợ:' : 'Thiếu minh chứng:'}
          </div>
          {hasProof ? (
            <div style={{ position: 'relative' }}>
              <img
                src={claim.repair_images![0]}
                alt="Minh chứng hoàn tất"
                onClick={() => onOpenLightbox({ url: claim.repair_images![0], title: `Minh chứng nghiệm thu #${shortTicketId}`, subtitle: `KTV: ${claim.technician_name || 'Kỹ thuật viên'} • Ghi chú: ${claim.internal_notes || 'Đã kiểm định hoàn tất.'}` })}
                style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '3px', cursor: 'pointer', border: '2px solid var(--accent-emerald)', display: 'block' }}
              />
              {claim.repair_images!.length > 1 && (
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: 'rgba(0,0,0,0.8)',
                  color: '#fff',
                  fontSize: '0.6rem',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  fontWeight: 800
                }}>
                  +{claim.repair_images!.length - 1}
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenModal(claim, 'proof_evidence')}
              style={{
                width: '100%',
                height: '70px',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px dashed rgba(245, 158, 11, 0.4)',
                borderRadius: '3px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                gap: '4px'
              }}
            >
              <Camera size={16} />
              <span style={{ whiteSpace: 'nowrap' }}>+ Tải ảnh thợ</span>
            </button>
          )}
        </div>
      </div>

      {/* Internal Notes Snippet */}
      {claim.internal_notes && (
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          background: 'rgba(37, 99, 235, 0.05)',
          padding: '6px 8px',
          borderRadius: '3px',
          borderLeft: '2px solid var(--accent-primary)'
        }}>
          <strong>KTV: </strong>{claim.internal_notes}
        </div>
      )}

      {/* Footer: Assignee & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <User size={13} color={claim.technician_name ? 'var(--accent-primary)' : 'var(--accent-amber)'} />
          <span style={{ fontWeight: 600, color: claim.technician_name ? 'var(--text-primary)' : 'var(--accent-amber)', whiteSpace: 'nowrap' }}>
            {claim.technician_name || 'Chưa gán thợ'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {claim.status === 'new' && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '3px', whiteSpace: 'nowrap' }}
              onClick={(e) => onQuickAdvance(claim, 'in_progress', e)}
              title="Nhận phiếu và chuyển sang Đang xử lý"
            >
              Nhận Phiếu ➔
            </button>
          )}
          {claim.status === 'in_progress' && (
            <button
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: '0.72rem', background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)', borderRadius: '3px', whiteSpace: 'nowrap' }}
              onClick={(e) => onQuickAdvance(claim, 'resolved', e)}
              title="Nghiệm thu hoàn tất"
            >
              Nghiệm Thu ✓
            </button>
          )}
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '3px', whiteSpace: 'nowrap' }}
            onClick={() => onOpenModal(claim)}
          >
            Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Fallback Scale Icon
function Scale(props: any) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="M7 21h10"/>
      <path d="M12 3v18"/>
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  );
}
