import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  loading = false,
  itemLabel = 'mục',
}) => {
  if (totalElements <= 0 || totalPages <= 0) return null;

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  // Compute visible pages (max 7 numbers)
  const getVisiblePages = (): number[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    let start = Math.max(0, page - 3);
    let end = Math.min(totalPages - 1, page + 3);

    if (page <= 3) {
      start = 0;
      end = 6;
    } else if (page >= totalPages - 4) {
      start = totalPages - 7;
      end = totalPages - 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="workspace-pagination">
      <span>
        Hiển thị <strong>{startItem}</strong> – <strong>{endItem}</strong> trên <strong>{totalElements}</strong> {itemLabel}
      </span>
      <div className="workspace-pagination-controls">
        <button
          type="button"
          className="workspace-pagination-btn"
          disabled={loading || page === 0}
          onClick={() => onPageChange(page - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={14} /> Trước
        </button>

        {visiblePages[0] > 0 && (
          <>
            <button
              type="button"
              className={`workspace-pagination-btn ${page === 0 ? 'active' : ''}`}
              onClick={() => onPageChange(0)}
              disabled={loading}
            >
              1
            </button>
            {visiblePages[0] > 1 && (
              <span style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem', userSelect: 'none' }}>
                …
              </span>
            )}
          </>
        )}

        {visiblePages.map((p) => {
          // If first or last is already rendered as dedicated boundary button, skip duplicate
          if ((visiblePages[0] > 0 && p === 0) || (visiblePages[visiblePages.length - 1] < totalPages - 1 && p === totalPages - 1)) {
            return null;
          }
          return (
            <button
              key={p}
              type="button"
              className={`workspace-pagination-btn ${page === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              disabled={loading}
            >
              {p + 1}
            </button>
          );
        })}

        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 2 && (
              <span style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem', userSelect: 'none' }}>
                …
              </span>
            )}
            <button
              type="button"
              className={`workspace-pagination-btn ${page === totalPages - 1 ? 'active' : ''}`}
              onClick={() => onPageChange(totalPages - 1)}
              disabled={loading}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          className="workspace-pagination-btn"
          disabled={loading || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Trang sau"
        >
          Sau <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
