import React from 'react';

interface ProductGridSkeletonProps {
  count?: number;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
}) => {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse"
        >
          <div className="aspect-square w-full bg-slate-200" />
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-14 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-full bg-slate-200 rounded" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <div className="h-5 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
