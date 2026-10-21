import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Play,
  Package,
  Wrench,
  Camera,
  AlertTriangle,
  RotateCcw,
  Check,
  ArrowLeft,
  Copy,
  CheckCheck,
  X,
  ZoomIn,
  ShieldCheck,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import {
  deliveryApi,
  backendRequest,
  DeliveryApiError,
  Checks,
  Job,
  JobStatus,
  JobSummary,
  Page
} from '../../services/deliveryInstallation';
import { PoDeliveryDispatch } from '../../components/delivery/PoDeliveryDispatch';
import { Pagination } from '../../components/Pagination';
import './delivery-installations.css';

interface SummaryCounts {
  counts: Record<string, number>;
  observedAt: string;
}

export type DeliverySortField = 'orderId' | 'customerName' | 'technicianName' | 'scheduledAt' | 'shippingAddress' | 'attempt' | 'status';
export type DeliverySortOrder = 'asc' | 'desc';

const statusDisplayMap: Record<string, { text: string; class: string }> = {
  ASSIGNED: { text: 'Chờ phân công', class: 'assigned' },
  ASSIGNED_TECH: { text: 'Chưa nhận việc', class: 'assigned' },
  IN_PROGRESS: { text: 'Đang làm', class: 'in-progress' },
  DELIVERED: { text: 'Đã giao hàng', class: 'delivered' },
  INSTALLED: { text: 'Đã lắp đặt', class: 'installed' },
  WAITING_PO_CONFIRMATION: { text: 'Chờ duyệt', class: 'waiting' },
  COMPLETED: { text: 'Đã nghiệm thu', class: 'completed' },
  FAILED: { text: 'Cần xử lý lại', class: 'failed' }
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return val;
  }
};

const formatTimeDate = (val: string | null | undefined) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} · ${date}`;
  } catch {
    return val;
  }
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Không xử lý được yêu cầu.');

const getJobActionInfo = (action: string) => {
  const act = (action || '').toUpperCase();
  if (act.includes('APPROVE')) return { label: 'PO duyệt nghiệm thu', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  if (act.includes('SUBMIT')) return { label: 'Nộp hồ sơ nghiệm thu', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
  if (act.includes('INSTALL')) return { label: 'Lắp đặt hoàn tất', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  if (act.includes('LINK_SERIAL')) return { label: 'Gán Serial thiết bị', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
  if (act.includes('DELIVER')) return { label: 'Đã đến địa chỉ', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' };
  if (act.includes('START')) return { label: 'KTV di chuyển', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' };
  if (act.includes('ASSIGN')) return { label: 'Phân công KTV', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
  if (act.includes('REWORK') || act.includes('FAIL')) return { label: 'Yêu cầu xử lý lại', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  return { label: action.replace(/^TECH_/, ''), color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
};

export const DeliveryInstallations: React.FC = () => {
  const { jobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const manager = profile?.role === 'super_admin' || profile?.role === 'product_manager';

  const basePath = profile?.role === 'product_manager'
    ? '/po/delivery'
    : profile?.role === 'technician'
    ? '/technician/delivery'
    : '/admin/orders/delivery';

  // List states
  const [list, setList] = useState<Page<JobSummary> | null>(null);
  const [summary, setSummary] = useState<SummaryCounts | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [sortField, setSortField] = useState<DeliverySortField>('scheduledAt');
  const [sortOrder, setSortOrder] = useState<DeliverySortOrder>('desc');

  const handleSort = (field: DeliverySortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Detail states
  const [job, setJob] = useState<Job | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Modals & form states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showReworkDialog, setShowReworkDialog] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [serialInput, setSerialInput] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [busy, setBusy] = useState(false);

  // Copy helper
  const handleCopy = (text: string, id: string, label: string = 'Đã sao chép') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Fetch List & Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await backendRequest<SummaryCounts>('/delivery-installations/dashboard');
      setSummary(res);
    } catch {
      // Ignore background summary error
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await deliveryApi.list(!manager, page, statusFilter);
      setList(res);
    } catch (e: any) {
      toast.error(errorText(e), 'Lỗi tải danh sách');
    } finally {
      setLoadingList(false);
    }
  }, [manager, page, statusFilter]);

  // 2. Fetch Detail for a specific job
  const fetchJobDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const [detailData, checksData] = await Promise.all([
        deliveryApi.detail(id),
        deliveryApi.checks(id).catch(() => null)
      ]);
      setJob(detailData);
      setChecks(checksData);
      if (detailData?.devices?.length && !selectedDeviceId) {
        const unlinked = detailData.devices.find((d: any) => !d.serialNumber);
        if (unlinked) {
          setSelectedDeviceId(unlinked.orderItemId || unlinked.deviceId);
        }
      }
    } catch (e: any) {
      toast.error(errorText(e), 'Lỗi tải chi tiết');
      setJob(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedDeviceId]);

  // Sync data on route changes
  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!jobId) {
      void fetchList();
      setJob(null);
      setChecks(null);
    } else {
      void fetchJobDetail(jobId);
    }
  }, [jobId, fetchList, fetchJobDetail]);

  // Mutations
  const performMutation = async (action: string, body: unknown) => {
    if (!job || busy) return;
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await deliveryApi.mutate(job, action, body, idempotencyKey);
      await fetchJobDetail(job.id);
      await fetchSummary();
      toast.success('Đã cập nhật trạng thái công việc thành công!');
      if (action === 'devices') setSerialInput('');
    } catch (e: any) {
      toast.error(errorText(e), 'Lỗi thao tác');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveCompletion = async () => {
    if (!job || busy) return;
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.approveCompletion(job.id, {}, job.version, idempotencyKey);
      setJob(updated);
      await fetchJobDetail(job.id);
      await fetchSummary();
      toast.success('Đã phê duyệt nghiệm thu công việc thành công!');
    } catch (e: any) {
      toast.error(errorText(e), 'Lỗi phê duyệt');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectCompletion = async () => {
    if (!job || !reworkReason.trim() || busy) return;
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.rejectCompletion(
        job.id,
        { reason: reworkReason.trim() },
        job.version,
        idempotencyKey
      );
      setJob(updated);
      setShowReworkDialog(false);
      setReworkReason('');
      await fetchJobDetail(job.id);
      await fetchSummary();
      toast.success('Đã gửi yêu cầu xử lý lại tới Kỹ thuật viên!');
    } catch (e: any) {
      toast.error(errorText(e), 'Lỗi gửi yêu cầu');
    } finally {
      setBusy(false);
    }
  };

  // Client-side search and sorting
  const sortedAndFilteredJobs = useMemo(() => {
    const items = list?.content || [];
    let result = items;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((j) =>
        j.orderId.toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q) ||
        (j.customerName && j.customerName.toLowerCase().includes(q)) ||
        (j.customerPhone && j.customerPhone.includes(q)) ||
        (j.shippingAddress && j.shippingAddress.toLowerCase().includes(q)) ||
        (j.technicianName && j.technicianName.toLowerCase().includes(q))
      );
    }
    if (!sortField) return result;

    return [...result].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'orderId':
          valA = (a.orderId || a.id).toLowerCase();
          valB = (b.orderId || b.id).toLowerCase();
          break;
        case 'customerName':
          valA = (a.customerName || '').toLowerCase();
          valB = (b.customerName || '').toLowerCase();
          break;
        case 'technicianName':
          valA = (a.technicianName || '').toLowerCase();
          valB = (b.technicianName || '').toLowerCase();
          break;
        case 'scheduledAt':
          valA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          valB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          break;
        case 'shippingAddress':
          valA = (a.shippingAddress || '').toLowerCase();
          valB = (b.shippingAddress || '').toLowerCase();
          break;
        case 'attempt':
          valA = a.attempt || 1;
          valB = b.attempt || 1;
          break;
        case 'status': {
          const textA = statusDisplayMap[a.status]?.text || a.status;
          const textB = statusDisplayMap[b.status]?.text || b.status;
          valA = textA.toLowerCase();
          valB = textB.toLowerCase();
          break;
        }
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [list?.content, searchTerm, sortField, sortOrder]);

  // Counts from summary
  const unassignedCount = (summary?.counts?.unassigned || 0) + (summary?.counts?.pendingApproval || 0) + (summary?.counts?.ASSIGNED || 0);
  const inProgressCount = (summary?.counts?.IN_PROGRESS || 0) + (summary?.counts?.DELIVERED || 0) + (summary?.counts?.INSTALLED || 0);
  const waitingPoCount = summary?.counts?.WAITING_PO_CONFIRMATION || 0;
  const completedCount = summary?.counts?.COMPLETED || 0;

  // Stepper Stage Calculation for Detail Page
  const stepperProgress = useMemo(() => {
    if (!job) return { step1: false, step2: false, step3: false, step4: false, activeIndex: 1 };
    const st = job.status;
    const isCompleted = st === 'COMPLETED';
    const isWaiting = st === 'WAITING_PO_CONFIRMATION';
    const isInstalled = st === 'INSTALLED';
    const isDelivered = st === 'DELIVERED';
    const isInProgress = st === 'IN_PROGRESS';
    const isAssigned = st === 'ASSIGNED';

    return {
      step1: !!job.assignedTo, // Đã tiếp nhận
      step2: isDelivered || isInstalled || isWaiting || isCompleted, // Đã giao hàng
      step3: isInstalled || isWaiting || isCompleted, // Đã lắp đặt
      step4: isCompleted, // Đã nghiệm thu
      activeIndex: isCompleted ? 4 : isWaiting ? 4 : isInstalled ? 3 : isDelivered ? 3 : isInProgress ? 2 : 1
    };
  }, [job]);

  // Sort Job History: Newest First
  const sortedHistory = useMemo(() => {
    if (!job?.history) return [];
    return [...job.history].sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [job?.history]);

  const displayedHistory = useMemo(() => {
    if (showAllHistory) return sortedHistory;
    return sortedHistory.slice(0, 4);
  }, [sortedHistory, showAllHistory]);

  // ==============================================================
  // VIEW 1: TRANG DANH SÁCH CÔNG VIỆC (MOCKUP EXACT MATCH)
  // ==============================================================
  if (!jobId) {
    return (
      <div className="di-page">
        {/* 1. Header */}
        <div className="di-list-header">
          <div className="di-list-title-wrap">
            <h1>Điều phối giao & lắp đặt</h1>
            <p>Quản lý phân công, tiến độ và nghiệm thu</p>
          </div>
        </div>

        {/* 2. 4 Thẻ thống kê (Chờ tiếp nhận, Đang làm, Chờ nghiệm thu, Hoàn tất) */}
        <div className="di-metrics-strip">
          <div
            className={`di-stat-tile ${statusFilter === 'ASSIGNED' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'ASSIGNED' ? '' : 'ASSIGNED')}
          >
            <span className="di-stat-label">Chờ tiếp nhận</span>
            <span className="di-stat-num">{unassignedCount}</span>
          </div>

          <div
            className={`di-stat-tile ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
          >
            <span className="di-stat-label">Đang làm</span>
            <span className="di-stat-num">{inProgressCount}</span>
          </div>

          <div
            className={`di-stat-tile ${statusFilter === 'WAITING_PO_CONFIRMATION' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'WAITING_PO_CONFIRMATION' ? '' : 'WAITING_PO_CONFIRMATION')}
          >
            <span className="di-stat-label">Chờ nghiệm thu</span>
            <span className="di-stat-num">{waitingPoCount}</span>
          </div>

          <div
            className={`di-stat-tile ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
          >
            <span className="di-stat-label">Hoàn tất</span>
            <span className="di-stat-num">{completedCount}</span>
          </div>
        </div>

        {/* 3. Search & Lọc bar */}
        <div className="di-search-filter-row">
          <div className="di-search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="di-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm đơn hàng hoặc Job ID..."
            />
          </div>
          <button
            type="button"
            className="di-btn-filter-trigger"
            onClick={() => void fetchList()}
          >
            <span>Lọc</span>
          </button>
        </div>

        {/* 4. Filter pill tabs */}
        <div className="di-pills-row">
          <button
            type="button"
            className={`di-filter-pill ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`di-filter-pill ${statusFilter === 'ASSIGNED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ASSIGNED')}
          >
            Chưa nhận
          </button>
          <button
            type="button"
            className={`di-filter-pill ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            Đang làm
          </button>
          <button
            type="button"
            className={`di-filter-pill ${statusFilter === 'WAITING_PO_CONFIRMATION' ? 'active' : ''}`}
            onClick={() => setStatusFilter('WAITING_PO_CONFIRMATION')}
          >
            Chờ duyệt
          </button>
          <button
            type="button"
            className={`di-filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Đã xong
          </button>
        </div>

        {/* 5. Bảng danh sách công việc có hỗ trợ sort */}
        <div className="di-table-card">
          <div className="di-table-responsive">
            <table className="di-jobs-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortField === 'orderId' ? 'active' : ''}`}
                    onClick={() => handleSort('orderId')}
                    style={{ width: '11%' }}
                    title="Nhấn để sắp xếp theo mã đơn"
                  >
                    <div className="th-content">
                      <span>MÃ ĐƠN</span>
                      <span className={`sort-icon ${sortField === 'orderId' ? 'active' : 'inactive'}`}>
                        {sortField === 'orderId' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'customerName' ? 'active' : ''}`}
                    onClick={() => handleSort('customerName')}
                    style={{ width: '15%' }}
                    title="Nhấn để sắp xếp theo khách hàng"
                  >
                    <div className="th-content">
                      <span>KHÁCH HÀNG</span>
                      <span className={`sort-icon ${sortField === 'customerName' ? 'active' : 'inactive'}`}>
                        {sortField === 'customerName' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'technicianName' ? 'active' : ''}`}
                    onClick={() => handleSort('technicianName')}
                    style={{ width: '15%' }}
                    title="Nhấn để sắp xếp theo kỹ thuật viên"
                  >
                    <div className="th-content">
                      <span>KỸ THUẬT VIÊN</span>
                      <span className={`sort-icon ${sortField === 'technicianName' ? 'active' : 'inactive'}`}>
                        {sortField === 'technicianName' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'scheduledAt' ? 'active' : ''}`}
                    onClick={() => handleSort('scheduledAt')}
                    style={{ width: '14%' }}
                    title="Nhấn để sắp xếp theo lịch hẹn"
                  >
                    <div className="th-content">
                      <span>LỊCH HẸN</span>
                      <span className={`sort-icon ${sortField === 'scheduledAt' ? 'active' : 'inactive'}`}>
                        {sortField === 'scheduledAt' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'shippingAddress' ? 'active' : ''}`}
                    onClick={() => handleSort('shippingAddress')}
                    style={{ width: '21%' }}
                    title="Nhấn để sắp xếp theo địa chỉ"
                  >
                    <div className="th-content">
                      <span>ĐỊA CHỈ THI CÔNG</span>
                      <span className={`sort-icon ${sortField === 'shippingAddress' ? 'active' : 'inactive'}`}>
                        {sortField === 'shippingAddress' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'attempt' ? 'active' : ''}`}
                    onClick={() => handleSort('attempt')}
                    style={{ width: '6%', textAlign: 'center' }}
                    title="Nhấn để sắp xếp theo lượt thi công"
                  >
                    <div className="th-content" style={{ justifyContent: 'center' }}>
                      <span>LƯỢT</span>
                      <span className={`sort-icon ${sortField === 'attempt' ? 'active' : 'inactive'}`}>
                        {sortField === 'attempt' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th
                    className={`sortable ${sortField === 'status' ? 'active' : ''}`}
                    onClick={() => handleSort('status')}
                    style={{ width: '10%', textAlign: 'center' }}
                    title="Nhấn để sắp xếp theo trạng thái"
                  >
                    <div className="th-content" style={{ justifyContent: 'center' }}>
                      <span>TRẠNG THÁI</span>
                      <span className={`sort-icon ${sortField === 'status' ? 'active' : 'inactive'}`}>
                        {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>

                  <th style={{ width: '8%', textAlign: 'right' }}>
                    <span>THAO TÁC</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} className="spin" style={{ marginBottom: 8, display: 'inline-block' }} />
                      <div>Đang tải danh sách công việc...</div>
                    </td>
                  </tr>
                ) : sortedAndFilteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <Package size={36} style={{ marginBottom: 8, opacity: 0.5, display: 'inline-block' }} />
                      <div>Không tìm thấy công việc giao &amp; lắp đặt nào phù hợp.</div>
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredJobs.map((j) => {
                    const shortOrderCode = (j.orderId || j.id).replace(/-/g, '').slice(0, 8).toUpperCase();
                    const isAssigned = j.status === 'ASSIGNED';
                    const hasTech = !!j.assignedTo || !!j.technicianName;
                    const statusKey = isAssigned && !hasTech ? 'ASSIGNED' : isAssigned && hasTech ? 'ASSIGNED_TECH' : j.status;
                    const statusInfo = statusDisplayMap[statusKey] || { text: j.status, class: 'assigned' };

                    return (
                      <tr
                        key={j.id}
                        className="di-table-row"
                        onClick={() => navigate(`${basePath}/${j.id}`)}
                      >
                        {/* Mã đơn */}
                        <td>
                          <div className="di-code-cell">
                            <span className="di-code-text">#{shortOrderCode}</span>
                            <button
                              type="button"
                              className="tkd-copy-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(j.orderId, `order-${j.id}`, 'Mã đơn');
                              }}
                              title="Sao chép UUID đơn hàng"
                            >
                              {copiedId === `order-${j.id}` ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>

                        {/* Khách hàng */}
                        <td>
                          <div className="di-cust-cell">
                            <div className="di-cust-name">{j.customerName || 'Khách hàng khác'}</div>
                            <div className="di-cust-sub">
                              {j.customerPhone ? (
                                <span>{j.customerPhone}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Chưa có SĐT</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kỹ thuật viên */}
                        <td>
                          <div className="di-tech-cell">
                            {hasTech ? (
                              <>
                                <div className="di-tech-name">{j.technicianName || 'Đã phân công'}</div>
                                {j.technicianPhone && <div className="di-tech-phone">{j.technicianPhone}</div>}
                              </>
                            ) : (
                              <span className="di-unassigned-badge">Chưa phân công</span>
                            )}
                          </div>
                        </td>

                        {/* Lịch hẹn */}
                        <td>
                          <div className="di-schedule-cell">
                            {j.scheduledAt ? (
                              formatTimeDate(j.scheduledAt)
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Chưa lên lịch</span>
                            )}
                          </div>
                        </td>

                        {/* Địa chỉ thi công */}
                        <td>
                          <div className="di-address-cell" title={j.shippingAddress || ''}>
                            {j.shippingAddress || '—'}
                          </div>
                        </td>

                        {/* Lượt */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="di-attempt-badge">
                            Lượt {j.attempt || 1}
                          </span>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`di-job-badge ${statusInfo.class}`}>
                            {statusInfo.text}
                          </span>
                        </td>

                        {/* Thao tác */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="di-btn-view-detail"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${basePath}/${j.id}`);
                            }}
                            title="Xem chi tiết công việc"
                          >
                            <span>Chi tiết</span>
                            <span className="arrow">→</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân trang */}
        {list && list.totalPages > 1 && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              page={page}
              totalPages={list.totalPages}
              totalElements={list.totalElements}
              pageSize={list.size || 20}
              onPageChange={(p) => setPage(p)}
              loading={loadingList}
              itemLabel="công việc"
            />
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: TRANG CHI TIẾT CÔNG VIỆC (DEDICATED FULL DETAIL PAGE)
  // ==============================================================
  if (loadingDetail) {
    return (
      <div className="di-page">
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
          <div>Đang tải chi tiết công việc #{jobId?.slice(0, 8)}...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="di-page">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <AlertCircle size={36} color="#ef4444" style={{ marginBottom: 12 }} />
          <h3>Không tìm thấy công việc</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Công việc không tồn tại hoặc đã được chuyển sang mã khác.
          </p>
          <button type="button" className="di-btn-back-link" onClick={() => navigate(basePath)}>
            ← Quay lại danh sách công việc
          </button>
        </div>
      </div>
    );
  }

  const shortOrderCode = (job.orderId || job.id).replace(/-/g, '').slice(0, 8).toUpperCase();
  const statusInfo = statusDisplayMap[job.status] || { text: job.status, class: 'assigned' };
  const photos = job.completionPhotos || [];
  const devices = job.devices || (checks?.devices as any) || [];
  const allSerialsLinked = devices.length > 0 && devices.every((d: any) => !!d.serialNumber);

  return (
    <div className="di-page">
      {/* 1. Header Trang Chi Tiết */}
      <div className="di-detail-page-header">
        <div className="di-detail-header-left">
          <button
            type="button"
            className="di-btn-back-link"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft size={14} />
            <span>Danh sách công việc</span>
          </button>

          <span className="di-detail-code">
            #{shortOrderCode}
            <button
              type="button"
              className="tkd-copy-btn"
              onClick={(e) => handleCopy(job.orderId, 'orderId', 'Mã đơn')}
              title="Sao chép UUID đơn hàng"
            >
              {copiedId === 'orderId' ? <CheckCheck size={13} color="#10b981" /> : <Copy size={13} />}
            </button>
          </span>

          <span className={`di-job-badge ${statusInfo.class}`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="di-detail-header-right">
          <Link
            to={profile?.role === 'product_manager' ? `/po/orders/${job.orderId}` : `/orders/${job.orderId}`}
            className="di-btn-order-link"
          >
            <ExternalLink size={13} />
            <span>Xem đơn hàng #{shortOrderCode}</span>
          </Link>

          <button
            type="button"
            className="di-btn-back-link"
            onClick={() => void fetchJobDetail(job.id)}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} className={busy ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Thanh tiến trình ngang 4 bước (Không xuống dòng) */}
      <div className="di-stepper-card">
        <div className="di-stepper-horizontal">
          <div className={`di-step-item ${stepperProgress.step1 ? 'completed' : 'active'}`}>
            <div className="di-step-node">
              {stepperProgress.step1 ? <Check size={13} /> : '1'}
            </div>
            <span>Tiếp nhận</span>
          </div>

          <div className={`di-step-connector ${stepperProgress.step2 ? 'filled' : ''}`} />

          <div className={`di-step-item ${stepperProgress.step2 ? 'completed' : stepperProgress.activeIndex === 2 ? 'active' : ''}`}>
            <div className="di-step-node">
              {stepperProgress.step2 ? <Check size={13} /> : '2'}
            </div>
            <span>Giao hàng</span>
          </div>

          <div className={`di-step-connector ${stepperProgress.step3 ? 'filled' : ''}`} />

          <div className={`di-step-item ${stepperProgress.step3 ? 'completed' : stepperProgress.activeIndex === 3 ? 'active' : ''}`}>
            <div className="di-step-node">
              {stepperProgress.step3 ? <Check size={13} /> : '3'}
            </div>
            <span>Lắp đặt</span>
          </div>

          <div className={`di-step-connector ${stepperProgress.step4 ? 'filled' : ''}`} />

          <div className={`di-step-item ${stepperProgress.step4 ? 'completed' : stepperProgress.activeIndex === 4 ? 'active' : ''}`}>
            <div className="di-step-node">
              {stepperProgress.step4 ? <Check size={13} /> : '4'}
            </div>
            <span>Nghiệm thu</span>
          </div>
        </div>
      </div>

      {/* 3. Bố cục 2 cột (Main Workspace & History Side Column) */}
      <div className="di-detail-grid">
        {/* ======================================================== */}
        {/* CỘT TRÁI: TIẾN TRÌNH & THÔNG TIN CÔNG VIỆC CHÍNH (~62%) */}
        {/* ======================================================== */}
        <div className="di-detail-main-col">
          {/* Thông tin công việc thi công (GỌN GÀNG) */}
          <div className="di-section-box">
            <div className="di-section-box-header">
              <h3 className="di-section-box-title">
                <User size={16} color="var(--accent-primary, #ea580c)" />
                <span>Thông tin công việc thi công</span>
              </h3>
            </div>

            <div className="di-work-info-grid">
              {/* Khách hàng */}
              <div className="di-info-tile">
                <div className="di-info-tile-label">
                  <User size={12} /> Khách hàng
                </div>
                <div className="di-info-tile-val">
                  {job.customerName || job.customer?.fullName || 'Khách hàng SmartBox'}
                </div>
                <div className="di-info-tile-sub">
                  {(job.customerPhone || job.customer?.phone) ? (
                    <a href={`tel:${job.customerPhone || job.customer?.phone}`}>
                      {job.customerPhone || job.customer?.phone}
                    </a>
                  ) : 'Chưa có SĐT'}
                  {job.customer?.email ? ` · ${job.customer.email}` : ''}
                </div>
              </div>

              {/* Địa chỉ giao & lắp đặt */}
              <div className="di-info-tile">
                <div className="di-info-tile-label">
                  <MapPin size={12} /> Địa chỉ thi công
                </div>
                <div className="di-info-tile-val">
                  {job.shippingAddress || job.customer?.shippingAddress || 'Chưa có địa chỉ'}
                </div>
                {job.installationNote && (
                  <div className="di-note-pill">
                    <strong>Lưu ý:</strong> {job.installationNote}
                  </div>
                )}
              </div>

              {/* Lịch hẹn thi công */}
              <div className="di-info-tile">
                <div className="di-info-tile-label">
                  <Calendar size={12} /> Lịch hẹn thi công
                </div>
                <div className="di-info-tile-val">
                  {job.scheduledAt ? formatTimeDate(job.scheduledAt) : 'Chưa xếp lịch'}
                </div>
                <div className="di-info-tile-sub">
                  {job.estimatedEndTime ? `Dự kiến xong: ${formatTimeDate(job.estimatedEndTime)}` : 'Thời gian tiêu chuẩn 2 giờ'}
                </div>
              </div>

              {/* Kỹ thuật viên phụ trách */}
              <div className="di-info-tile">
                <div className="di-info-tile-label">
                  <Wrench size={12} /> Kỹ thuật viên phụ trách
                </div>
                <div className="di-info-tile-val">
                  {job.technicianName || job.technician?.fullName || (job.assignedTo ? 'Kỹ thuật viên SmartBox' : 'Chưa phân công')}
                </div>
                <div className="di-info-tile-sub">
                  {(job.technicianPhone || job.technician?.phone) ? (
                    <a href={`tel:${job.technicianPhone || job.technician?.phone}`}>
                      {job.technicianPhone || job.technician?.phone}
                    </a>
                  ) : (job.assignedTo ? 'Đã xếp lịch thi công' : 'Chờ phân công')}
                </div>
              </div>
            </div>
          </div>

          {/* Thiết bị & Sản phẩm */}
          <div className="di-section-box">
            <div className="di-section-box-header">
              <h3 className="di-section-box-title">
                <Package size={16} color="#0ea5e9" />
                <span>Thiết bị &amp; Sản phẩm ({devices.length > 0 ? devices.length : (job.items?.length || 0)})</span>
              </h3>
              {job.status === 'COMPLETED' ? (
                <span className="di-job-badge completed">
                  ✓ Đã hoàn tất bảo hành
                </span>
              ) : allSerialsLinked ? (
                <span className="di-job-badge completed">
                  ✓ Đã đủ Serial
                </span>
              ) : (
                <span
                  className="di-job-badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.28)'
                  }}
                >
                  Chờ gắn Serial
                </span>
              )}
            </div>

            {devices.length > 0 ? (
              <table className="di-devices-table">
                <thead>
                  <tr>
                    <th>Thiết bị / Sản phẩm</th>
                    <th>SKU</th>
                    <th>Serial Number</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d: any, idx: number) => (
                    <tr key={d.id || idx}>
                      <td>
                        <strong>{d.productName || 'SmartBox Residential Pro'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Mã: {d.orderItemId || d.deviceId || d.id}
                        </div>
                      </td>
                      <td>
                        <code>{d.sku || 'SBK-PRO-85L'}</code>
                      </td>
                      <td>
                        {d.serialNumber && d.serialNumber !== 'N/A' ? (
                          <span className="di-serial-code">{d.serialNumber}</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Chưa gán serial</span>
                        )}
                      </td>
                      <td>
                        {job.status === 'COMPLETED' ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Đã kích hoạt BH</span>
                        ) : d.serialNumber && d.serialNumber !== 'N/A' ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Hợp lệ</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Cần nhập serial</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : job.items && job.items.length > 0 ? (
              <table className="di-devices-table">
                <thead>
                  <tr>
                    <th>Sản phẩm đơn hàng</th>
                    <th>SKU</th>
                    <th>Số lượng</th>
                    <th>Serial / Bảo hành</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {job.items.map((it: any, idx: number) => (
                    <tr key={it.id || idx}>
                      <td>
                        <strong>{it.productName || 'SmartBox Residential Pro'}</strong>
                        {it.variantName && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {it.variantName}
                          </div>
                        )}
                      </td>
                      <td>
                        <code>{it.sku || 'SBK-PRO-85L'}</code>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{it.quantity || 1}</span>
                      </td>
                      <td>
                        {job.status === 'COMPLETED' ? (
                          <span className="di-serial-code">Bảo hành điện tử SmartBox</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>Chưa gán serial</span>
                        )}
                      </td>
                      <td>
                        {job.status === 'COMPLETED' ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Đã kích hoạt BH</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Chờ KTV bàn giao</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Chưa có thông tin thiết bị hoặc sản phẩm cho công việc này.
              </div>
            )}

            {/* Form gán serial nếu chưa hoàn tất */}
            {job.status !== 'COMPLETED' && (
              <div className="di-serial-input-form">
                <input
                  type="text"
                  className="di-serial-input"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="Nhập mã Serial (VD: SBX-2026-0001)..."
                />
                <button
                  type="button"
                  className="di-btn-view-detail"
                  disabled={busy || !serialInput.trim()}
                  onClick={() => {
                    const target = selectedDeviceId || (devices[0] && ((devices[0] as any).orderItemId || (devices[0] as any).deviceId)) || (job.items && job.items[0]?.id);
                    if (!target) {
                      toast.error('Vui lòng chọn thiết bị để gắn serial');
                      return;
                    }
                    void performMutation('devices', {
                      orderItemId: target,
                      serialNumber: serialInput.trim()
                    });
                  }}
                >
                  <Check size={13} />
                  <span>Gắn Serial</span>
                </button>
              </div>
            )}
          </div>

          {/* Nghiệm thu & Bàn giao */}
          <div className="di-section-box">
            <div className="di-section-box-header">
              <h3 className="di-section-box-title">
                <Camera size={16} color="#10b981" />
                <span>Nghiệm thu &amp; Ảnh minh chứng</span>
              </h3>
              <span className="di-attempt-badge">
                Lượt thi công: <strong>Lượt {job.attempt || 1}</strong>
              </span>
            </div>

            <div className="di-acceptance-content">
              {photos.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <strong>{photos.length} ảnh minh chứng hiện trường</strong> (Bấm ảnh để phóng to):
                  </div>
                  <div className="di-photos-preview-strip">
                    {photos.map((url, idx) => (
                      <div
                        key={idx}
                        className="di-photo-thumb-box"
                        onClick={() => setActiveLightboxImg(url)}
                        title="Bấm để phóng to ảnh"
                      >
                        <img src={url} alt={`Ảnh minh chứng ${idx + 1}`} />
                        <div className="di-photo-overlay">
                          <ZoomIn size={16} />
                          <span>Phóng to</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Chưa có ảnh minh chứng nghiệm thu nào được tải lên.
                </div>
              )}

              <div className="di-acceptance-meta-row">
                <div className="di-meta-pill">
                  <Clock size={13} />
                  <span>Thời gian hoàn thành: <strong>{job.completedAt ? formatDate(job.completedAt) : formatDate(job.updatedAt)}</strong></span>
                </div>
                <div className={`di-meta-pill ${job.customerAccepted ? 'success' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Kết quả biên bản: <strong>{job.customerAccepted ? 'Đã ký biên bản nghiệm thu & bàn giao' : 'Chờ xác nhận biên bản'}</strong></span>
                </div>
              </div>

              {job.reworkNotes && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontSize: '0.82rem' }}>
                  <strong>Lý do yêu cầu xử lý lại:</strong> {job.reworkNotes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CỘT PHẢI: BIỂU ĐỒ LỊCH SỬ TIẾN ĐỘ DẠNG CỘT (~38%)       */}
        {/* ======================================================== */}
        <div className="di-detail-side-col">
          {/* Card: Nhật ký lịch sử tiến độ */}
          <div className="di-history-card">
            <div className="di-history-card-header">
              <h3 className="di-history-card-title">
                <Clock size={15} style={{ color: 'var(--accent-sky, #0284c7)' }} />
                <span>Nhật ký lịch sử tiến độ</span>
              </h3>
              <span className="di-history-count-badge">
                {sortedHistory.length} mốc
              </span>
            </div>

            {/* Continuous Vertical Timeline */}
            <ol className="tkd-continuous-timeline">
              {displayedHistory.length > 0 ? (
                displayedHistory.map((h: any, idx: number) => {
                  const isNewest = idx === 0;
                  const actInfo = getJobActionInfo(h.action);
                  return (
                    <li key={h.id || idx} className="tkd-timeline-event">
                      <span className={`tkd-timeline-dot ${isNewest ? 'newest' : ''}`} />
                      <div className="tkd-event-headline">
                        <span>{actInfo.label}</span>
                        <span
                          className="tkd-event-tag"
                          style={{ background: actInfo.bg, color: actInfo.color }}
                        >
                          {actInfo.label}
                        </span>
                      </div>
                      <div className="tkd-event-time">{formatDate(h.createdAt || h.created_at)}</div>
                      {h.reason && <div className="tkd-event-note">{h.reason}</div>}
                    </li>
                  );
                })
              ) : (
                <li style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Chưa có lịch sử thao tác.
                </li>
              )}
            </ol>

            {/* Toggle show all history button */}
            {sortedHistory.length > 4 && (
              <button
                type="button"
                className="di-history-toggle-btn"
                onClick={() => setShowAllHistory(!showAllHistory)}
              >
                {showAllHistory ? 'Thu gọn ▲' : `Xem toàn bộ lịch sử (${sortedHistory.length} mốc) ▼`}
              </button>
            )}
          </div>

          {/* Card: Quy trình thi công SmartBox */}
          <div className="di-guidelines-accordion">
            <div
              className="di-accordion-header"
              onClick={() => setShowGuidelines(!showGuidelines)}
            >
              <h4 className="di-accordion-title">
                <ShieldCheck size={14} style={{ color: 'var(--accent-primary, #ea580c)' }} />
                <span>Quy trình thi công &amp; bàn giao</span>
              </h4>
              <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                {showGuidelines ? 'Thu gọn ▲' : 'Mở rộng ▼'}
              </span>
            </div>

            {showGuidelines && (
              <div className="di-accordion-body">
                <ul className="di-accordion-list">
                  <li><strong>Bước 1:</strong> Tiếp nhận ca thi công &amp; xác nhận lịch hẹn với khách hàng.</li>
                  <li><strong>Bước 2:</strong> Di chuyển đến địa chỉ, khảo sát mặt bằng và kiểm tra kết nối nguồn điện/pin.</li>
                  <li><strong>Bước 3:</strong> Thi công lắp đặt hộp SmartBox, gắn mã Serial chính xác cho từng thiết bị.</li>
                  <li><strong>Bước 4:</strong> Chụp ảnh minh chứng hiện trường và nộp biên bản nghiệm thu để PO thẩm duyệt.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Thanh hành động Sticky ở cuối trang */}
      <div className="di-sticky-action-bar">
        <div className="di-action-bar-left">
          Trạng thái hiện tại: <strong style={{ color: 'var(--text-primary)' }}>{statusInfo.text}</strong>
        </div>

        <div className="di-action-bar-right">
          {/* Chưa phân công -> Phân công KTV */}
          {manager && job.status === 'ASSIGNED' && !job.assignedTo && (
            <button
              type="button"
              className="btn-tkd-approve"
              onClick={() => setShowDispatchModal(true)}
            >
              <User size={14} />
              <span>Phân công kỹ thuật viên</span>
            </button>
          )}

          {/* Đã phân công -> KTV bắt đầu di chuyển */}
          {job.status === 'ASSIGNED' && job.assignedTo && (
            <button
              type="button"
              className="btn-tkd-approve"
              disabled={busy}
              onClick={() => void performMutation('start', {})}
            >
              <Play size={14} />
              <span>Bắt đầu ca làm việc</span>
            </button>
          )}

          {/* Đang di chuyển -> Đã tới địa chỉ */}
          {job.status === 'IN_PROGRESS' && (
            <button
              type="button"
              className="btn-tkd-approve"
              disabled={busy}
              onClick={() => void performMutation('confirm-delivery', {})}
            >
              <MapPin size={14} />
              <span>Xác nhận đã đến địa chỉ</span>
            </button>
          )}

          {/* Đã tới địa chỉ -> Hoàn tất lắp đặt */}
          {job.status === 'DELIVERED' && (
            <button
              type="button"
              className="btn-tkd-approve"
              disabled={busy}
              onClick={() => void performMutation('confirm-installation', {})}
            >
              <Wrench size={14} />
              <span>Hoàn tất thi công lắp đặt</span>
            </button>
          )}

          {/* Chờ PO duyệt nghiệm thu */}
          {manager && job.status === 'WAITING_PO_CONFIRMATION' && (
            <>
              <button
                type="button"
                className="btn-tkd-approve"
                disabled={busy}
                onClick={handleApproveCompletion}
              >
                <CheckCircle2 size={14} />
                <span>Phê duyệt nghiệm thu</span>
              </button>
              <button
                type="button"
                className="btn-tkd-reject"
                disabled={busy}
                onClick={() => setShowReworkDialog(true)}
              >
                <RotateCcw size={14} />
                <span>Yêu cầu xử lý lại</span>
              </button>
            </>
          )}

          {/* Đã hoàn tất */}
          {job.status === 'COMPLETED' && (
            <div className="di-completed-bar">
              <div className="di-completed-status">
                <ShieldCheck size={18} color="#10b981" />
                <span>Đã hoàn tất nghiệm thu &amp; kích hoạt bảo hành</span>
              </div>
              <div className="di-completed-actions">
                <button
                  type="button"
                  className="di-btn-action-outline"
                  onClick={() => navigate(profile?.role === 'product_manager' ? '/po/warranties' : '/warranties')}
                  title="Xem thông tin bảo hành thiết bị"
                >
                  <ShieldCheck size={13} color="#10b981" />
                  <span>Tra cứu bảo hành</span>
                </button>
                <button
                  type="button"
                  className="di-btn-action-outline"
                  onClick={() => navigate(profile?.role === 'product_manager' ? `/po/orders/${job.orderId}` : `/orders/${job.orderId}`)}
                  title="Mở hồ sơ đơn hàng"
                >
                  <ExternalLink size={13} />
                  <span>Xem đơn hàng</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS: Dispatch, Rework, Lightbox                             */}
      {/* ============================================================== */}

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div className="di-lightbox-overlay" onClick={() => setActiveLightboxImg(null)}>
          <img src={activeLightboxImg} alt="Ảnh minh chứng phóng to" />
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="di-modal-backdrop" onClick={() => setShowDispatchModal(false)}>
          <div className="di-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="di-modal-header">
              <h4>Phân công kỹ thuật viên cho đơn #{shortOrderCode}</h4>
              <button type="button" className="di-modal-close-btn" onClick={() => setShowDispatchModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="di-modal-body">
              <PoDeliveryDispatch
                orderId={job.orderId}
                orderCode={shortOrderCode}
                onAssigned={(created) => {
                  setJob(created);
                  setShowDispatchModal(false);
                  void fetchJobDetail(created.id);
                  void fetchSummary();
                }}
                onCancel={() => setShowDispatchModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rework Reason Modal */}
      {showReworkDialog && (
        <div className="di-modal-backdrop" onClick={() => setShowReworkDialog(false)}>
          <div className="di-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="di-modal-header">
              <h4>Yêu cầu Kỹ thuật viên xử lý lại</h4>
              <button type="button" className="di-modal-close-btn" onClick={() => setShowReworkDialog(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="di-modal-body">
              <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Nhập chi tiết các điểm kỹ thuật chưa đạt hoặc cần chụp lại ảnh minh chứng:
              </p>
              <textarea
                rows={3}
                className="di-search-input"
                style={{ height: 'auto', padding: '10px' }}
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                placeholder="VD: Cần chụp rõ hơn mã QR và vị trí lắp đặt..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="di-btn-back-link"
                  onClick={() => setShowReworkDialog(false)}
                  disabled={busy}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-tkd-reject"
                  disabled={busy || !reworkReason.trim()}
                  onClick={handleRejectCompletion}
                >
                  Gửi yêu cầu xử lý lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryInstallations;
