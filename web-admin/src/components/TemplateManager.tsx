import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  MessageSquare,
  Bell,
  Search,
  Edit3,
  Eye,
  Send,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Monitor,
  X,
  Plus
} from 'lucide-react';
import { MessageTemplate, TemplateChannel, TestSendResponse } from '../types/database';
import { templatesService } from '../services/api';

interface TemplateManagerProps {
  embedded?: boolean;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ embedded = false }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<'all' | TemplateChannel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    subject: string;
    body: string;
    channel: string;
    isActive: boolean;
  }>({
    name: '',
    subject: '',
    body: '',
    channel: 'email',
    isActive: true
  });
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [saveErrorNotice, setSaveErrorNotice] = useState<string | null>(null);

  // Test Send Modal State
  const [testSendModalTpl, setTestSendModalTpl] = useState<MessageTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('khachhang.demo@gmail.com');
  const [testPhone, setTestPhone] = useState('0988123456');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<TestSendResponse | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchChannel = activeChannel === 'all' || t.channel === activeChannel;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        t.body.toLowerCase().includes(q);

      return matchChannel && matchSearch;
    });
  }, [templates, activeChannel, searchQuery]);

  // Channel count stats
  const stats = useMemo(() => {
    return {
      all: templates.length,
      email: templates.filter(t => t.channel === 'email').length,
      sms: templates.filter(t => t.channel === 'sms').length,
      push: templates.filter(t => t.channel === 'push').length
    };
  }, [templates]);

  // Open Edit Modal
  const handleOpenEdit = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setEditForm({
      name: tpl.name || tpl.code,
      subject: tpl.subject || '',
      body: tpl.body || '',
      channel: tpl.channel || 'email',
      isActive: tpl.is_active !== false
    });
    setSaveSuccessNotice(null);
    setSaveErrorNotice(null);
  };

  // Insert Variable Chip at cursor position
  const handleInsertVariable = (varName: string) => {
    const textToInsert = `{{${varName}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setEditForm(prev => ({ ...prev, body: prev.body + textToInsert }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = editForm.body;

    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    setEditForm(prev => ({ ...prev, body: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // Save changes
  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      setIsSaving(true);
      setSaveSuccessNotice(null);
      setSaveErrorNotice(null);

      const res = await templatesService.saveTemplate({
        code: editingTemplate.code,
        name: editForm.name,
        channel: editForm.channel,
        subject: editForm.subject,
        body: editForm.body,
        is_active: editForm.isActive
      });

      if (res.success) {
        setSaveSuccessNotice('Đã lưu cập nhật mẫu thông báo thành công!');
        await loadTemplates();
        setTimeout(() => setSaveSuccessNotice(null), 3000);
      } else {
        setSaveErrorNotice(res.error || 'Không thể lưu mẫu thông báo');
      }
    } catch (err: any) {
      setSaveErrorNotice(err.message || 'Lỗi khi lưu');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetDefault = async () => {
    if (!editingTemplate) return;
    if (!window.confirm(`Bạn có chắc muốn khôi phục mẫu [${editingTemplate.code}] về nguyên bản của hệ thống SmartBox?`)) {
      return;
    }

    try {
      setIsSaving(true);
      const res = await templatesService.resetTemplateToDefault(editingTemplate.code);
      if (res.success && res.data) {
        setEditForm({
          name: res.data.name || res.data.code,
          subject: res.data.subject || '',
          body: res.data.body || '',
          channel: res.data.channel,
          isActive: true
        });
        setSaveSuccessNotice('Đã khôi phục về mẫu mặc định ban đầu!');
        await loadTemplates();
      }
    } catch (err: any) {
      setSaveErrorNotice(err.message || 'Lỗi khôi phục mẫu mặc định');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Test Send
  const handleOpenTestSend = (tpl: MessageTemplate) => {
    setTestSendModalTpl(tpl);
    setTestSendResult(null);
  };

  // Execute Test Send
  const handleExecuteTestSend = async () => {
    if (!testSendModalTpl) return;
    try {
      setIsSendingTest(true);
      setTestSendResult(null);

      const res = await templatesService.testSendTemplate({
        templateCode: testSendModalTpl.code,
        recipientEmail: testEmail,
        recipientPhone: testPhone,
        customSubject: editForm.subject || testSendModalTpl.subject,
        customBody: editForm.body || testSendModalTpl.body
      });

      setTestSendResult(res);
    } catch (err: any) {
      setTestSendResult({
        success: false,
        channel: testSendModalTpl.channel,
        recipient: testEmail,
        renderedSubject: '',
        renderedBody: '',
        message: err.message || 'Lỗi khi gửi thử nghiệm'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Helper render mock preview text
  const renderMockBody = (rawBody: string, rawSubject?: string) => {
    const mockMap: Record<string, string> = {
      customer_name: 'Nguyễn Văn An',
      otp_code: '795584',
      expire_minutes: '5',
      order_id: 'SB-2026-8899',
      order_date: '13/09/2026',
      total_amount: '4.850.000 đ',
      shipping_address: 'Tòa Landmark 81, P.22, Bình Thạnh, TP.HCM',
      payment_method: 'VNPay QR',
      shipping_carrier: 'GHTK Express',
      tracking_number: 'GHTK-HCM-2026-882',
      estimated_delivery: '15/09/2026',
      device_name: 'SmartBox Resident Pro',
      serial_number: 'BOX-2026-001',
      weight_kg: '2.45',
      pickup_pin: '849201',
      claim_id: 'TCK-9901',
      technician_name: 'Trần Kỹ Thuật',
      inspection_summary: 'Đã thay module cảm biến siêu âm, kiểm định Servo cơ học đạt 100%',
      alert_type: 'Cảm biến cửa MC-38 cảnh báo kẹt nắp hộp',
      battery_level: '14',
      time_occurred: '02:15 AM',
      hotline: '1900 8888'
    };

    let subject = rawSubject || '';
    let body = rawBody || '';

    for (const [key, val] of Object.entries(mockMap)) {
      subject = subject.split(`{{${key}}}`).join(val);
      body = body.split(`{{${key}}}`).join(val);
    }

    return { subject, body };
  };

  // Channel badge component
  const renderChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return (
          <span className="badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-sky)', border: '1px solid rgba(14, 165, 233, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Mail size={12} />
            <span>Email HTML</span>
          </span>
        );
      case 'sms':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={12} />
            <span>SMS Brandname</span>
          </span>
        );
      case 'push':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Bell size={12} />
            <span>Push App</span>
          </span>
        );
      default:
        return <span className="badge">{channel}</span>;
    }
  };

  // Parse variables into array
  const getVariablesList = (varsString?: string | null) => {
    if (!varsString) return [];
    return varsString
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER SECTION (If not embedded) */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Sparkles size={22} color="var(--accent-sky)" />
              Trung Tâm Quản Lý Mẫu Thông Báo (Templates Center)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Quản lý cú pháp, chèn biến động, xem trước thời gian thực (Live Preview) và gửi thử nghiệm Email HTML, SMS & Push Notification.
            </p>
          </div>
        </div>
      )}

      {/* CHANNELS FILTER TABS & SEARCH BAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--surface-elevated)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeChannel === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8125rem' }}
            onClick={() => setActiveChannel('all')}
          >
            Tất cả ({stats.all})
          </button>
          <button
            type="button"
            className={`btn ${activeChannel === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveChannel('email')}
          >
            <Mail size={14} />
            Email HTML ({stats.email})
          </button>
          <button
            type="button"
            className={`btn ${activeChannel === 'sms' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveChannel('sms')}
          >
            <MessageSquare size={14} />
            SMS Brandname ({stats.sms})
          </button>
          <button
            type="button"
            className={`btn ${activeChannel === 'push' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveChannel('push')}
          >
            <Bell size={14} />
            Push App ({stats.push})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo tên hoặc mã code..."
            style={{ paddingLeft: '32px', paddingRight: '12px', height: '36px', fontSize: '0.8125rem', margin: 0, borderRadius: '20px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TEMPLATES GRID */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Đang tải danh sách mẫu thông báo...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--surface-elevated)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Không tìm thấy mẫu thông báo phù hợp với từ khóa.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {filteredTemplates.map(tpl => {
            const vars = getVariablesList(tpl.variables);
            return (
              <div
                key={tpl.id}
                className="card card-animated"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                  padding: '18px'
                }}
              >
                <div>
                  {/* Top row: Badge & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    {renderChannelBadge(tpl.channel)}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: tpl.is_active !== false ? '#10b981' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: tpl.is_active !== false ? '#10b981' : 'var(--text-muted)'
                        }}
                      />
                      {tpl.is_active !== false ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>

                  {/* Template Title & Code */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                    {tpl.name || tpl.code}
                  </h4>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-sky)', marginBottom: '8px' }}>
                    <code>{tpl.code}</code>
                  </div>

                  {/* Description */}
                  {tpl.description && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                      {tpl.description}
                    </p>
                  )}

                  {/* Subject Preview (For Email / Push) */}
                  {tpl.subject && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        marginBottom: '10px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <strong style={{ color: 'var(--text-muted)' }}>Tiêu đề: </strong>
                      {tpl.subject}
                    </div>
                  )}

                  {/* Variables pills */}
                  {vars.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {vars.slice(0, 4).map(v => (
                        <span
                          key={v}
                          style={{
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            background: 'rgba(14, 165, 233, 0.08)',
                            color: 'var(--accent-sky)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {vars.length > 4 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          +{vars.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleOpenTestSend(tpl)}
                  >
                    <Send size={13} />
                    <span>Gửi thử</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenEdit(tpl)}
                  >
                    <Edit3 size={14} />
                    <span>Chỉnh sửa & Xem</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TEMPLATE EDITOR & LIVE DUAL-PANE PREVIEW                         */}
      {/* ========================================================================= */}
      {editingTemplate && (
        <div
          className="modal-overlay"
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '1100px',
              width: '95vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--surface-elevated)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="var(--accent-sky)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Chỉnh Sửa Mẫu: {editForm.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Mã code: <code>{editingTemplate.code}</code>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {renderChannelBadge(editForm.channel)}
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="template-editor-grid">
              {/* LEFT COLUMN: EDIT FORM */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Notices */}
                {saveSuccessNotice && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} />
                    <span>{saveSuccessNotice}</span>
                  </div>
                )}
                {saveErrorNotice && (
                  <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={15} />
                    <span>{saveErrorNotice}</span>
                  </div>
                )}

                {/* Template Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Tên hiển thị mẫu thông báo *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ margin: 0 }}
                  />
                </div>

                {/* Channel & Status Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                      Kênh truyền thông *
                    </label>
                    <select
                      className="input-field"
                      value={editForm.channel}
                      onChange={e => setEditForm(prev => ({ ...prev, channel: e.target.value }))}
                      style={{ margin: 0 }}
                    >
                      <option value="email">Email HTML</option>
                      <option value="sms">Tin nhắn SMS Brandname</option>
                      <option value="push">Push Notification (App)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px' }}>
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-sky)' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kích hoạt mẫu này</span>
                    </label>
                  </div>
                </div>

                {/* Subject Field (Email / Push) */}
                {editForm.channel !== 'sms' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tiêu đề thông báo (Subject) *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.subject}
                      onChange={e => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Nhập tiêu đề hoặc chèn biến..."
                      style={{ margin: 0 }}
                    />
                  </div>
                )}

                {/* Dynamic Variables Selector */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      Chèn Biến Động (Nhấp để chèn vào nội dung)
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cú pháp: {`{{tên_biến}}`}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    {getVariablesList(editingTemplate.variables).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        style={{
                          background: 'rgba(14, 165, 233, 0.12)',
                          border: '1px solid rgba(14, 165, 233, 0.3)',
                          color: 'var(--accent-sky)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Bấm để chèn {{${v}}}`}
                      >
                        + {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Content Textarea */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      Nội dung mẫu (Body) {editForm.channel === 'email' ? '(Hỗ trợ mã HTML)' : ''} *
                    </label>
                    {editForm.channel === 'sms' && (
                      <span style={{ fontSize: '0.75rem', color: editForm.body.length > 160 ? '#f59e0b' : 'var(--text-muted)' }}>
                        Độ dài: {editForm.body.length}/160 ký tự ({Math.ceil(editForm.body.length / 160) || 1} SMS)
                      </span>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="input-field"
                    rows={12}
                    value={editForm.body}
                    onChange={e => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      margin: 0
                    }}
                  />
                </div>

                {/* Reset to default link */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Khôi phục mẫu gốc của hệ thống</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE REAL-TIME PREVIEW */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={16} color="var(--accent-sky)" />
                    <span>Trình Xem Trước Thời Gian Thực (Live Preview)</span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-elevated)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      style={{
                        background: previewDevice === 'desktop' ? 'var(--primary)' : 'transparent',
                        color: previewDevice === 'desktop' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onClick={() => setPreviewDevice('desktop')}
                    >
                      <Monitor size={12} />
                      Desktop
                    </button>
                    <button
                      type="button"
                      style={{
                        background: previewDevice === 'mobile' ? 'var(--primary)' : 'transparent',
                        color: previewDevice === 'mobile' ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onClick={() => setPreviewDevice('mobile')}
                    >
                      <Smartphone size={12} />
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Render Simulated Preview according to channel */}
                {(() => {
                  const { subject: mockSubject, body: mockHtml } = renderMockBody(editForm.body, editForm.subject);

                  if (editForm.channel === 'email') {
                    return (
                      <div
                        style={{
                          maxWidth: previewDevice === 'mobile' ? '360px' : '100%',
                          margin: '0 auto',
                          width: '100%',
                          background: '#ffffff',
                          color: '#1e293b',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        {/* Email Client Header */}
                        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 14px', fontSize: '0.75rem' }}>
                          <div><strong>Người gửi:</strong> SmartBox IoT &lt;support@smartbox.vn&gt;</div>
                          <div style={{ marginTop: '2px' }}><strong>Người nhận:</strong> Nguyễn Văn An &lt;khachhang@smartbox.vn&gt;</div>
                          <div style={{ marginTop: '2px', color: '#0284c7', fontWeight: 600 }}><strong>Tiêu đề:</strong> {mockSubject}</div>
                        </div>

                        {/* Email Body Banner */}
                        <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', padding: '16px 20px', textAlign: 'center' }}>
                          <h4 style={{ margin: 0, letterSpacing: '1px', fontSize: '1.05rem', fontWeight: 800 }}>SMARTBOX</h4>
                          <div style={{ fontSize: '11px', color: '#bae6fd', marginTop: '2px' }}>Hệ Sinh Thái Tủ Giao Nhận Hàng IoT</div>
                        </div>

                        {/* Email Rendered Content */}
                        <div
                          style={{
                            padding: '20px',
                            fontSize: '13.5px',
                            lineHeight: 1.6,
                            color: '#334155'
                          }}
                          dangerouslySetInnerHTML={{ __html: mockHtml }}
                        />

                        {/* Email Footer */}
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                          © 2026 SmartBox Vietnam Co., Ltd. Hotline: <strong>1900 8888</strong>
                        </div>
                      </div>
                    );
                  }

                  if (editForm.channel === 'sms') {
                    return (
                      <div
                        style={{
                          maxWidth: '320px',
                          margin: '0 auto',
                          background: '#0f172a',
                          borderRadius: '28px',
                          border: '8px solid #334155',
                          overflow: 'hidden',
                          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        {/* Phone Top Notch */}
                        <div style={{ background: '#0f172a', padding: '8px 16px', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: '60px', height: '4px', background: '#475569', borderRadius: '4px' }} />
                        </div>

                        {/* SMS Header */}
                        <div style={{ background: '#1e293b', padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #334155' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tin nhắn đến</div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>SMARTBOX</div>
                        </div>

                        {/* SMS Conversation View */}
                        <div style={{ padding: '24px 14px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              padding: '10px 14px',
                              borderRadius: '16px 16px 4px 16px',
                              fontSize: '13px',
                              lineHeight: 1.4,
                              maxWidth: '90%',
                              alignSelf: 'flex-end',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                            }}
                          >
                            {mockHtml}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', alignSelf: 'flex-end', marginTop: '4px' }}>
                            Hôm nay • 09:30
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Push notification preview
                  return (
                    <div
                      style={{
                        maxWidth: '320px',
                        margin: '0 auto',
                        background: '#0f172a',
                        borderRadius: '28px',
                        border: '8px solid #334155',
                        overflow: 'hidden',
                        padding: '14px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', marginBottom: '14px' }}>
                        12:45 • Thứ Bảy, 13 tháng 9
                      </div>

                      {/* Notification card */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.9)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '14px',
                          padding: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-sky)' }}>
                            <Bell size={12} />
                            <span>SMARTBOX APP</span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>vừa xong</span>
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f8fafc', marginBottom: '3px' }}>
                          {mockSubject}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.4 }}>
                          {mockHtml}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 24px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--surface-elevated)'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleOpenTestSend(editingTemplate)}
              >
                <Send size={14} />
                <span>Gửi Thử Nghiệm Qua Email / SMS</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTemplate(null)}
                  disabled={isSaving}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEST SEND MODAL VIA SMTP / SIMULATION                            */}
      {/* ========================================================================= */}
      {testSendModalTpl && (
        <div
          className="modal-overlay"
          style={{ zIndex: 100001 }}
          onClick={() => setTestSendModalTpl(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '500px', width: '92vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--accent-sky)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Gửi Thử Nghiệm Mẫu Thông Báo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTestSendModalTpl(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Hệ thống sẽ điền dữ liệu giả lập mẫu (Tên khách: Nguyễn Văn An, Mã đơn: SB-2026-8899...) và thực hiện gửi thử nghiệm để kiểm tra hiển thị.
              </div>

              {testSendModalTpl.channel === 'email' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Nhập địa chỉ Email nhận thử nghiệm *
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    style={{ margin: 0 }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Nếu server đã điền tài khoản SMTP, thư sẽ bay thẳng tới hộp thư này.
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Nhập số điện thoại nhận tin nhắn thử nghiệm *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="0988123456"
                    style={{ margin: 0 }}
                  />
                </div>
              )}

              {/* Result Notice */}
              {testSendResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    background: testSendResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${testSendResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    color: testSendResult.success ? '#10b981' : '#fb7185'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    {testSendResult.success ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                    <span>{testSendResult.message}</span>
                  </div>
                  {testSendResult.isRealSent && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                      🚀 Đã gửi email thực tế qua SMTP server tới <strong>{testSendResult.recipient}</strong>!
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTestSendModalTpl(null)}
                  disabled={isSendingTest}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ borderRadius: '8px', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleExecuteTestSend}
                  disabled={isSendingTest}
                >
                  {isSendingTest ? 'Đang gửi...' : 'Gửi Thử Ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
