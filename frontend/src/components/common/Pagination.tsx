import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, limit, totalItems, totalPages, hasPrevPage, hasNextPage } =
    pagination;

  if (totalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200"
    >
      <p className="text-xs sm:text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{startItem}</span>{' '}
        to <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span>{' '}
        products
      </p>

      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="btn-secondary !px-3 !py-1.5 text-xs"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {pages.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-current={pageNum === page ? 'page' : undefined}
            className={`h-8 min-w-[2rem] px-2.5 rounded-lg text-xs font-semibold transition-colors ${
              pageNum === page
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="btn-secondary !px-3 !py-1.5 text-xs"
          aria-label="Next Page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};
