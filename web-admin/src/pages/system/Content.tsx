import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  MessageSquare,
  HelpCircle,
  Plus,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Edit3,
  ExternalLink,
  Star,
  CornerDownRight,
  TrendingUp,
  Tag,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import {
  contentService,
  ArticleItem,
  BannerItem,
  ReviewItem,
  FaqItem,
  ContentSummaryStats
} from '../../services/api';
import { toast } from '../../contexts/ToastContext';

const alert = (msg: string) => toast.error(msg);

export const ContentPage: React.FC = () => {
  // Main Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<'articles' | 'banners' | 'reviews' | 'faqs'>('articles');

  // Stats
  const [stats, setStats] = useState<ContentSummaryStats>({
    totalArticles: 3,
    publishedArticles: 3,
    totalBanners: 3,
    activeBanners: 3,
    totalReviews: 4,
    pendingReviews: 1,
    totalFaqs: 5
  });

  // Data states
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [articleCategory, setArticleCategory] = useState('all');
  const [articleStatus, setArticleStatus] = useState('all');
  const [bannerPosition, setBannerPosition] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [faqCategory, setFaqCategory] = useState('all');

  // Modal States
  // 1. Article Modal
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    slug: '',
    category: 'guide',
    summary: '',
    content: '',
    coverImage: '',
    authorName: 'Ban Biên Tập SmartBox',
    status: 'published',
    tags: ''
  });

  // 2. Banner Modal
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    targetUrl: '',
    position: 'hero_home',
    displayOrder: 1,
    isActive: true
  });

  // 3. Review Action Modals
  const [selectedReviewForReject, setSelectedReviewForReject] = useState<ReviewItem | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [selectedReviewForReply, setSelectedReviewForReply] = useState<ReviewItem | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState('');

  // 4. FAQ Modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'usage',
    displayOrder: 1,
    isPublished: true
  });

  // Accordion open IDs for FAQ
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Load stats & initial tab data
  useEffect(() => {
    loadStats();
    loadCurrentTabData();
  }, [activeMainTab]);

  const loadStats = async () => {
    try {
      const res = await contentService.getSummaryStats();
      setStats(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCurrentTabData = async () => {
    setLoading(true);
    try {
      if (activeMainTab === 'articles') {
        const res = await contentService.getArticles();
        setArticles(res);
      } else if (activeMainTab === 'banners') {
        const res = await contentService.getBanners();
        setBanners(res);
      } else if (activeMainTab === 'reviews') {
        const res = await contentService.getReviews();
        setReviews(res);
      } else if (activeMainTab === 'faqs') {
        const res = await contentService.getFaqs();
        setFaqs(res);
      }
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu tab:', e);
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // ARTICLE HANDLERS
  // ==============================================================
  const handleOpenCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      slug: '',
      category: 'guide',
      summary: '',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80',
      authorName: 'Ban Biên Tập SmartBox',
      status: 'published',
      tags: 'SmartBox, Tủ thông minh, Hướng dẫn'
    });
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticle = (art: ArticleItem) => {
    setEditingArticle(art);
    setArticleForm({
      title: art.title,
      slug: art.slug,
      category: art.category,
      summary: art.summary,
      content: art.content,
      coverImage: art.coverImage || '',
      authorName: art.authorName || 'Ban Biên Tập SmartBox',
      status: art.status,
      tags: art.tags ? art.tags.join(', ') : ''
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bài viết.');
      return;
    }

    const payload = {
      ...articleForm,
      tags: articleForm.tags ? articleForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    try {
      if (editingArticle) {
        await contentService.updateArticle(editingArticle.id, payload as any);
        toast.success('Cập nhật bài viết thành công!');
      } else {
        await contentService.createArticle(payload as any);
        toast.success('Thêm bài viết mới thành công!');
      }
      setIsArticleModalOpen(false);
      loadCurrentTabData();
      loadStats();
    } catch (err: any) {
      toast.error('Lỗi lưu bài viết: ' + (err.message || err));
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}" không?`)) return;
    try {
      await contentService.deleteArticle(id);
      setArticles(articles.filter(a => a.id !== id));
      loadStats();
      toast.success('Đã xóa bài viết.');
    } catch (err: any) {
      toast.error('Lỗi khi xóa bài viết: ' + (err.message || err));
    }
  };

  // ==============================================================
  // BANNER HANDLERS
  // ==============================================================
  const handleOpenCreateBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80',
      targetUrl: '/products',
      position: 'hero_home',
      displayOrder: banners.length + 1,
      isActive: true
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: BannerItem) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl || '',
      position: b.position,
      displayOrder: b.displayOrder,
      isActive: b.isActive
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim() || !bannerForm.imageUrl.trim()) {
      toast.warning('Vui lòng nhập tiêu đề và link ảnh banner.');
      return;
    }

    try {
      if (editingBanner) {
        await contentService.updateBanner(editingBanner.id, bannerForm);
        toast.success('Cập nhật banner thành công!');
      } else {
        await contentService.createBanner(bannerForm);
        toast.success('Tạo banner mới thành công!');
      }
      setIsBannerModalOpen(false);
      loadCurrentTabData();
      loadStats();
    } catch (err: any) {
      toast.error('Lỗi lưu banner: ' + (err.message || err));
    }
  };

  const handleToggleBanner = async (id: string) => {
    try {
      const nextStatus = await contentService.toggleBanner(id);
      setBanners(banners.map(b => b.id === id ? { ...b, isActive: nextStatus } : b));
      loadStats();
      toast.success(nextStatus ? 'Đã hiển thị banner.' : 'Đã ẩn banner.');
    } catch (err: any) {
      toast.error('Lỗi bật/tắt banner: ' + (err.message || err));
    }
  };

  const handleDeleteBanner = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa banner "${title}"?`)) return;
    try {
      await contentService.deleteBanner(id);
      setBanners(banners.filter(b => b.id !== id));
      loadStats();
      toast.success('Đã xóa banner.');
    } catch (err: any) {
      toast.error('Lỗi khi xóa banner: ' + (err.message || err));
    }
  };

  // ==============================================================
  // REVIEW HANDLERS
  // ==============================================================
  const handleApproveReview = async (rev: ReviewItem) => {
    try {
      await contentService.updateReviewStatus(rev.id, 'approved');
      setReviews(reviews.map(r => r.id === rev.id ? { ...r, status: 'approved' } : r));
      loadStats();
      toast.success('Đã duyệt đánh giá thành công.');
    } catch (err: any) {
      toast.error('Lỗi duyệt review: ' + (err.message || err));
    }
  };

  const handleConfirmRejectReview = async () => {
    if (!selectedReviewForReject) return;
    try {
      await contentService.updateReviewStatus(
        selectedReviewForReject.id,
        'rejected',
        rejectReasonInput.trim() || 'Nội dung không phù hợp quy chuẩn đánh giá'
      );
      setReviews(reviews.map(r => r.id === selectedReviewForReject.id ? {
        ...r,
        status: 'rejected',
        rejectReason: rejectReasonInput
      } : r));
      setSelectedReviewForReject(null);
      setRejectReasonInput('');
      loadStats();
      toast.success('Đã từ chối đánh giá.');
    } catch (err: any) {
      toast.error('Lỗi từ chối đánh giá: ' + (err.message || err));
    }
  };

  const handleConfirmReplyReview = async () => {
    if (!selectedReviewForReply || !adminReplyInput.trim()) {
      toast.warning('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    try {
      await contentService.replyReview(selectedReviewForReply.id, adminReplyInput.trim());
      setReviews(reviews.map(r => r.id === selectedReviewForReply.id ? {
        ...r,
        adminReply: adminReplyInput.trim(),
        adminRepliedAt: new Date().toISOString()
      } : r));
      setSelectedReviewForReply(null);
      setAdminReplyInput('');
      toast.success('Đã gửi phản hồi đánh giá.');
    } catch (err: any) {
      toast.error('Lỗi gửi phản hồi: ' + (err.message || err));
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa vĩnh viễn đánh giá này?')) return;
    try {
      await contentService.deleteReview(id);
      setReviews(reviews.filter(r => r.id !== id));
      loadStats();
      toast.success('Đã xóa đánh giá.');
    } catch (err: any) {
      toast.error('Lỗi khi xóa đánh giá: ' + (err.message || err));
    }
  };

  // ==============================================================
  // FAQ HANDLERS
  // ==============================================================
  const handleOpenCreateFaq = () => {
    setEditingFaq(null);
    setFaqForm({
      question: '',
      answer: '',
      category: 'usage',
      displayOrder: faqs.length + 1,
      isPublished: true
    });
    setIsFaqModalOpen(true);
  };

  const handleOpenEditFaq = (f: FaqItem) => {
    setEditingFaq(f);
    setFaqForm({
      question: f.question,
      answer: f.answer,
      category: f.category,
      displayOrder: f.displayOrder,
      isPublished: f.isPublished
    });
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.warning('Vui lòng nhập câu hỏi và câu trả lời.');
      return;
    }
    try {
      if (editingFaq) {
        await contentService.updateFaq(editingFaq.id, faqForm);
        toast.success('Cập nhật câu hỏi thành công!');
      } else {
        await contentService.createFaq(faqForm);
        toast.success('Tạo câu hỏi FAQ mới thành công!');
      }
      setIsFaqModalOpen(false);
      loadCurrentTabData();
      loadStats();
    } catch (err: any) {
      toast.error('Lỗi lưu FAQ: ' + (err.message || err));
    }
  };

  const handleToggleFaq = async (id: string) => {
    try {
      const nextStatus = await contentService.toggleFaq(id);
      setFaqs(faqs.map(f => f.id === id ? { ...f, isPublished: nextStatus } : f));
      loadStats();
      toast.success(nextStatus ? 'Đã hiển thị FAQ.' : 'Đã ẩn FAQ.');
    } catch (err: any) {
      toast.error('Lỗi bật/tắt FAQ: ' + (err.message || err));
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
      await contentService.deleteFaq(id);
      setFaqs(faqs.filter(f => f.id !== id));
      loadStats();
      toast.success('Đã xóa câu hỏi FAQ.');
    } catch (err: any) {
      toast.error('Lỗi khi xóa FAQ: ' + (err.message || err));
    }
  };

  // Filtered lists
  const filteredArticles = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = articleCategory === 'all' || a.category === articleCategory;
    const matchStat = articleStatus === 'all' || a.status === articleStatus;
    return matchSearch && matchCat && matchStat;
  });

  const filteredBanners = banners.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPos = bannerPosition === 'all' || b.position === bannerPosition;
    return matchSearch && matchPos;
  });

  const filteredReviews = reviews.filter(r => {
    const matchSearch = r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStat = reviewStatus === 'all' || r.status === reviewStatus;
    return matchSearch && matchStat;
  });

  const filteredFaqs = faqs.filter(f => {
    const matchSearch = f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = faqCategory === 'all' || f.category === faqCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--text-primary)' }}>
            <Globe size={22} color="var(--primary)" />
            Quản Lý Nội Dung Website
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: '4px 0 0 0' }}>
            Quản lý bài viết blog, banner quảng cáo trang chủ, duyệt đánh giá từ khách hàng và câu hỏi thường gặp.
          </p>
        </div>

        {/* Action Button theo Tab */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeMainTab === 'articles' && (
            <button className="btn btn-primary" onClick={handleOpenCreateArticle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} />
              <span>Viết Bài Mới</span>
            </button>
          )}
          {activeMainTab === 'banners' && (
            <button className="btn btn-primary" onClick={handleOpenCreateBanner} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} />
              <span>Thêm Banner Mới</span>
            </button>
          )}
          {activeMainTab === 'faqs' && (
            <button className="btn btn-primary" onClick={handleOpenCreateFaq} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} />
              <span>Thêm Câu Hỏi FAQ</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs Bar with integrated badges */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '10px',
          overflowX: 'auto',
          alignItems: 'center'
        }}
      >
        <button
          type="button"
          className={`btn ${activeMainTab === 'articles' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '7px 16px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setActiveMainTab('articles'); setSearchTerm(''); }}
        >
          <FileText size={15} />
          <span>Bài Viết Blog</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 7px',
            borderRadius: '999px',
            background: activeMainTab === 'articles' ? 'rgba(255,255,255,0.25)' : 'var(--bg-shell)',
            color: activeMainTab === 'articles' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600
          }}>
            {stats.totalArticles}
          </span>
        </button>

        <button
          type="button"
          className={`btn ${activeMainTab === 'banners' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '7px 16px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setActiveMainTab('banners'); setSearchTerm(''); }}
        >
          <ImageIcon size={15} />
          <span>Banner Trang Chủ</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 7px',
            borderRadius: '999px',
            background: activeMainTab === 'banners' ? 'rgba(255,255,255,0.25)' : 'var(--bg-shell)',
            color: activeMainTab === 'banners' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600
          }}>
            {stats.activeBanners}
          </span>
        </button>

        <button
          type="button"
          className={`btn ${activeMainTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '7px 16px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setActiveMainTab('reviews'); setSearchTerm(''); }}
        >
          <Star size={15} />
          <span>Đánh Giá Khách Hàng</span>
          {stats.pendingReviews > 0 ? (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              padding: '1px 7px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {stats.pendingReviews} chờ duyệt
            </span>
          ) : (
            <span style={{
              fontSize: '0.72rem',
              padding: '1px 7px',
              borderRadius: '999px',
              background: activeMainTab === 'reviews' ? 'rgba(255,255,255,0.25)' : 'var(--bg-shell)',
              color: activeMainTab === 'reviews' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600
            }}>
              {stats.totalReviews}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`btn ${activeMainTab === 'faqs' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '7px 16px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setActiveMainTab('faqs'); setSearchTerm(''); }}
        >
          <HelpCircle size={15} />
          <span>Hỏi Đáp FAQ</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 7px',
            borderRadius: '999px',
            background: activeMainTab === 'faqs' ? 'rgba(255,255,255,0.25)' : 'var(--bg-shell)',
            color: activeMainTab === 'faqs' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600
          }}>
            {stats.totalFaqs}
          </span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* ============================================================== */}
      {/* TAB 1: BÀI VIẾT BLOG / TIN TỨC */}
      {/* ============================================================== */}
      {activeMainTab === 'articles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  className="input-field"
                  style={{ margin: 0, paddingLeft: '36px', height: '36px', fontSize: '0.8125rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-field"
                style={{ margin: 0, height: '36px', fontSize: '0.8125rem', width: 'auto' }}
                value={articleCategory}
                onChange={(e) => setArticleCategory(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                <option value="guide">Hướng dẫn sử dụng</option>
                <option value="product_intro">Giới thiệu sản phẩm</option>
                <option value="tech_news">Tin công nghệ</option>
                <option value="promotion">Khuyến mãi / Sự kiện</option>
              </select>

              <select
                className="input-field"
                style={{ margin: 0, height: '36px', fontSize: '0.8125rem', width: 'auto' }}
                value={articleStatus}
                onChange={(e) => setArticleStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đã xuất bản</option>
                <option value="draft">Bản nháp</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>
          </div>

          {/* Articles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredArticles.map((art) => (
              <div
                key={art.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px'
                }}
              >
                {/* Cover Image */}
                <div style={{ position: 'relative', height: '160px', background: '#1e293b' }}>
                  <img
                    src={art.coverImage || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80'}
                    alt={art.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: art.status === 'published' ? '#10b981' : '#f59e0b',
                      color: '#ffffff'
                    }}
                  >
                    {art.status === 'published' ? 'Đã Xuất Bản' : 'Bản Nháp'}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={12} /> {art.viewCount}
                  </div>
                </div>

                {/* Article Info */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                    {art.category === 'guide' ? '📖 Hướng Dẫn' :
                      art.category === 'product_intro' ? '🚀 Sản Phẩm Mới' :
                        art.category === 'tech_news' ? '⚡ Tin Công Nghệ' : '🎁 Khuyến Mãi'}
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                    {art.title}
                  </h3>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {art.summary}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Tác giả: <strong>{art.authorName || 'Ban Biên Tập'}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                        onClick={() => handleOpenEditArticle(art)}
                        title="Chỉnh sửa bài viết"
                      >
                        <Edit3 size={13} /> Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px', color: '#ef4444' }}
                        onClick={() => handleDeleteArticle(art.id, art.title)}
                        title="Xóa bài viết"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              Không tìm thấy bài viết nào phù hợp với bộ lọc.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BANNER TRANG CHỦ & QUẢNG CÁO */}
      {/* ============================================================== */}
      {activeMainTab === 'banners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm banner theo tiêu đề..."
                  className="input-field"
                  style={{ margin: 0, paddingLeft: '36px', height: '36px', fontSize: '0.8125rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-field"
                style={{ margin: 0, height: '36px', fontSize: '0.8125rem', width: 'auto' }}
                value={bannerPosition}
                onChange={(e) => setBannerPosition(e.target.value)}
              >
                <option value="all">Tất cả vị trí hiển thị</option>
                <option value="hero_home">Hero Slider Đầu Trang Chủ</option>
                <option value="mid_banner">Banner Giữa Trang (Mid-Page)</option>
                <option value="sidebar">Sidebar Cạnh Bên</option>
                <option value="popup_promo">Popup Khuyến Mãi</option>
              </select>
            </div>
          </div>

          {/* Banner Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredBanners.map((b) => (
              <div
                key={b.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  background: 'var(--bg-surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  gap: '12px'
                }}
              >
                {/* Image Preview */}
                <div style={{ position: 'relative', height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ffffff'
                    }}
                  >
                    Vị trí: <strong>{b.position}</strong> &bull; Thứ tự: #{b.displayOrder}
                  </div>
                </div>

                {/* Banner Meta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {b.title}
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Link đích: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{b.targetUrl || '/'}</span>
                  </div>
                </div>

                {/* Status Toggle & Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={b.isActive}
                      onChange={() => handleToggleBanner(b.id)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ color: b.isActive ? '#10b981' : 'var(--text-muted)' }}>
                      {b.isActive ? 'Đang Hiển Thị' : 'Đã Tắt'}
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                      onClick={() => handleOpenEditBanner(b)}
                    >
                      <Edit3 size={13} /> Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px', color: '#ef4444' }}
                      onClick={() => handleDeleteBanner(b.id, b.title)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ĐÁNH GIÁ SẢN PHẨM & KIỂM DUYỆT */}
      {/* ============================================================== */}
      {activeMainTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo khách hàng, sản phẩm hoặc nội dung..."
                  className="input-field"
                  style={{ margin: 0, paddingLeft: '36px', height: '36px', fontSize: '0.8125rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-field"
                style={{ margin: 0, height: '36px', fontSize: '0.8125rem', width: 'auto' }}
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái kiểm duyệt</option>
                <option value="pending">⏳ Chờ duyệt (Cần xử lý)</option>
                <option value="approved">✅ Đã duyệt hiển thị</option>
                <option value="rejected">❌ Đã ẩn / Từ chối</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="card"
                style={{
                  padding: '16px',
                  background: 'var(--bg-surface)',
                  borderRadius: '12px',
                  border: rev.status === 'pending' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {rev.customerName}
                      </span>
                      {rev.customerPhone && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {rev.customerPhone}</span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({rev.customerEmail})</span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>
                      Sản phẩm: {rev.productName}
                    </div>
                  </div>

                  {/* Rating Stars & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          fill={s <= rev.rating ? '#f59e0b' : 'none'}
                          color="#f59e0b"
                        />
                      ))}
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        background: rev.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' :
                          rev.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: rev.status === 'approved' ? '#10b981' :
                          rev.status === 'pending' ? '#f59e0b' : '#ef4444'
                      }}
                    >
                      {rev.status === 'approved' ? 'Đã duyệt' : rev.status === 'pending' ? 'Chờ duyệt' : 'Đã ẩn'}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                  {rev.title && <div style={{ fontWeight: 700, marginBottom: '4px' }}>"{rev.title}"</div>}
                  {rev.comment}
                </div>

                {/* Reject reason if any */}
                {rev.status === 'rejected' && rev.rejectReason && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={13} /> Lý do ẩn: {rev.rejectReason}
                  </div>
                )}

                {/* Official Admin Reply */}
                {rev.adminReply && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid #3b82f6', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <CornerDownRight size={14} /> Phản hồi chính thức từ SmartBox:
                    </div>
                    <div style={{ color: 'var(--text-primary)' }}>{rev.adminReply}</div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', paddingTop: '6px' }}>
                  {rev.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '6px', background: '#10b981', borderColor: '#10b981' }}
                        onClick={() => handleApproveReview(rev)}
                      >
                        <CheckCircle2 size={13} /> Duyệt Hiển Thị
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '6px', color: '#ef4444' }}
                        onClick={() => { setSelectedReviewForReject(rev); setRejectReasonInput(''); }}
                      >
                        <XCircle size={13} /> Ẩn Đánh Giá
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                    onClick={() => { setSelectedReviewForReply(rev); setAdminReplyInput(rev.adminReply || ''); }}
                  >
                    <CornerDownRight size={13} /> {rev.adminReply ? 'Sửa Phản Hồi' : 'Phản Hồi'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px', color: '#ef4444' }}
                    onClick={() => handleDeleteReview(rev.id)}
                    title="Xóa đánh giá"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {filteredReviews.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                Không có đánh giá nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: HỎI ĐÁP FAQ */}
      {/* ============================================================== */}
      {activeMainTab === 'faqs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm câu hỏi hoặc câu trả lời FAQ..."
                  className="input-field"
                  style={{ margin: 0, paddingLeft: '36px', height: '36px', fontSize: '0.8125rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-field"
                style={{ margin: 0, height: '36px', fontSize: '0.8125rem', width: 'auto' }}
                value={faqCategory}
                onChange={(e) => setFaqCategory(e.target.value)}
              >
                <option value="all">Tất cả chủ đề FAQ</option>
                <option value="technical">Kỹ thuật & Khẩn cấp</option>
                <option value="usage">Hướng dẫn sử dụng & Mở nắp</option>
                <option value="warranty">Bảo hành & Lắp đặt</option>
                <option value="payment">Thanh toán & Đơn hàng</option>
                <option value="general">Câu hỏi chung</option>
              </select>
            </div>
          </div>

          {/* Accordion FAQ List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="card"
                  style={{
                    padding: 0,
                    background: 'var(--bg-surface)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Question Row */}
                  <div
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: faq.category === 'technical' ? 'rgba(239, 68, 68, 0.15)' :
                            faq.category === 'usage' ? 'rgba(59, 130, 246, 0.15)' :
                              faq.category === 'warranty' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: faq.category === 'technical' ? '#ef4444' :
                            faq.category === 'usage' ? '#3b82f6' :
                              faq.category === 'warranty' ? '#10b981' : '#a855f7'
                        }}
                      >
                        {faq.category === 'technical' ? 'KỸ THUẬT' :
                          faq.category === 'usage' ? 'SỬ DỤNG' :
                            faq.category === 'warranty' ? 'BẢO HÀNH' : 'CHUNG'}
                      </span>

                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {faq.question}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ThumbsUp size={12} /> {faq.helpfulCount}
                      </div>

                      <div
                        onClick={(e) => { e.stopPropagation(); handleToggleFaq(faq.id); }}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: faq.isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: faq.isPublished ? '#10b981' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {faq.isPublished ? 'Đang hiện' : 'Đã ẩn'}
                      </div>

                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Answer */}
                  {isExpanded && (
                    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                        {faq.answer}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => handleOpenEditFaq(faq)}
                        >
                          <Edit3 size={13} /> Sửa FAQ
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', color: '#ef4444' }}
                          onClick={() => handleDeleteFaq(faq.id)}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ============================================================== */}
      {/* MODAL 1: TẠO / SỬA BÀI VIẾT BLOG */}
      {/* ============================================================== */}
      {isArticleModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-shell)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingArticle ? 'Chỉnh Sửa Bài Viết' : 'Tạo Bài Viết Mới'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setIsArticleModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArticle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tiêu Đề Bài Viết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hướng Dẫn Cài Đặt Khóa SmartBox Cho Shipper..."
                  className="input-field"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Chuyên Mục *
                  </label>
                  <select
                    className="input-field"
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                  >
                    <option value="guide">📖 Hướng dẫn sử dụng</option>
                    <option value="product_intro">🚀 Giới thiệu sản phẩm mới</option>
                    <option value="tech_news">⚡ Tin công nghệ</option>
                    <option value="promotion">🎁 Tin tức khuyến mãi</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Trạng Thái Xuất Bản *
                  </label>
                  <select
                    className="input-field"
                    value={articleForm.status}
                    onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}
                  >
                    <option value="published">Đã xuất bản (Công khai)</option>
                    <option value="draft">Bản nháp (Chưa công khai)</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Đường Dẫn Ảnh Bìa (Cover Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  className="input-field"
                  value={articleForm.coverImage}
                  onChange={(e) => setArticleForm({ ...articleForm, coverImage: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tóm Tắt Ngắn (Summary) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Đoạn mô tả ngắn hiển thị trên thẻ bài viết và kết quả tìm kiếm..."
                  className="input-field"
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Nội Dung Chi Tiết (Content) *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Nội dung chi tiết bài viết..."
                  className="input-field"
                  style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Tác Giả
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={articleForm.authorName}
                    onChange={(e) => setArticleForm({ ...articleForm, authorName: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Thẻ Tags (Phân cách bởi dấu phẩy)
                  </label>
                  <input
                    type="text"
                    placeholder="SmartBox, Hướng dẫn, OTP"
                    className="input-field"
                    value={articleForm.tags}
                    onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsArticleModalOpen(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingArticle ? 'Cập Nhật Bài Viết' : 'Xuất Bản Bài Viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: TẠO / SỬA BANNER TRANG CHỦ */}
      {/* ============================================================== */}
      {isBannerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', background: 'var(--bg-shell)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingBanner ? 'Sửa Banner Trang Chủ' : 'Thêm Banner Mới'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setIsBannerModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tiêu Đề Chiến Dịch / Banner *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm Giá Khai Xuân 2026..."
                  className="input-field"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Link Ảnh Banner (Image URL) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  className="input-field"
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Vị Trí Hiển Thị *
                  </label>
                  <select
                    className="input-field"
                    value={bannerForm.position}
                    onChange={(e) => setBannerForm({ ...bannerForm, position: e.target.value })}
                  >
                    <option value="hero_home">Hero Slider Đầu Trang</option>
                    <option value="mid_banner">Banner Giữa Trang (Mid)</option>
                    <option value="sidebar">Sidebar Cạnh Bên</option>
                    <option value="popup_promo">Popup Khuyến Mãi</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Thứ Tự Sắp Xếp
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={bannerForm.displayOrder}
                    onChange={(e) => setBannerForm({ ...bannerForm, displayOrder: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Link Đích Khi Bấm Vào (Target URL)
                </label>
                <input
                  type="text"
                  placeholder="/products hoặc https://..."
                  className="input-field"
                  value={bannerForm.targetUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, targetUrl: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={bannerForm.isActive}
                  onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Kích hoạt hiển thị ngay sau khi lưu</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsBannerModalOpen(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBanner ? 'Cập Nhật' : 'Lưu Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: TỪ CHỐI / ẨN ĐÁNH GIÁ KÈM LÝ DO */}
      {/* ============================================================== */}
      {selectedReviewForReject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', background: 'var(--bg-shell)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>
              Xác Nhận Ẩn Đánh Giá
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Đánh giá của <strong>{selectedReviewForReject.customerName}</strong> sẽ bị ẩn khỏi trang bán hàng công khai.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Lý Do Từ Chối / Ẩn *
              </label>
              <textarea
                rows={3}
                className="input-field"
                placeholder="Ví dụ: Nội dung spam quảng cáo, ngôn từ không phù hợp quy tắc cộng đồng..."
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedReviewForReject(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleConfirmRejectReview}
              >
                Xác Nhận Ẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADMIN PHẢN HỒI ĐÁNH GIÁ */}
      {/* ============================================================== */}
      {selectedReviewForReply && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', background: 'var(--bg-shell)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Phản Hồi Đánh Giá Khách Hàng
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Phản hồi cho khách hàng <strong>{selectedReviewForReply.customerName}</strong> về sản phẩm <strong>{selectedReviewForReply.productName}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Nội Dung Phản Hồi Từ Ban Quản Trị SmartBox *
              </label>
              <textarea
                rows={4}
                className="input-field"
                placeholder="Ví dụ: SmartBox chân thành cảm ơn quý khách đã tin dùng sản phẩm..."
                value={adminReplyInput}
                onChange={(e) => setAdminReplyInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedReviewForReply(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReplyReview}
              >
                Gửi Phản Hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: TẠO / SỬA FAQ */}
      {/* ============================================================== */}
      {isFaqModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', background: 'var(--bg-shell)', border: '1px solid var(--border-glass)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingFaq ? 'Sửa Câu Hỏi FAQ' : 'Thêm Câu Hỏi FAQ Mới'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
                onClick={() => setIsFaqModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFaq} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Câu Hỏi (Question) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khi mất điện làm thế nào để mở nắp SmartBox?..."
                  className="input-field"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Chủ Đề Danh Mục *
                </label>
                <select
                  className="input-field"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                >
                  <option value="technical">⚡ Kỹ thuật & Khẩn cấp</option>
                  <option value="usage">📖 Hướng dẫn sử dụng & Mở nắp</option>
                  <option value="warranty">🛡️ Bảo hành & Lắp đặt</option>
                  <option value="payment">💳 Thanh toán & Đặt hàng</option>
                  <option value="general">❓ Câu hỏi chung</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Câu Trả Lời Chi Tiết (Answer) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Giải đáp chi tiết, rõ ràng cho người dùng..."
                  className="input-field"
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Thứ Tự Hiển Thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={faqForm.displayOrder}
                    onChange={(e) => setFaqForm({ ...faqForm, displayOrder: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={faqForm.isPublished}
                      onChange={(e) => setFaqForm({ ...faqForm, isPublished: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Hiển thị ra Web</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFaqModalOpen(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFaq ? 'Cập Nhật' : 'Lưu FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
