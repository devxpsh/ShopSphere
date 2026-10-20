import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  formatPaiseToINR,
  rupeesToPaise,
  calculateDiscountPercent,
} from '../utils/currency';
import { ProductCard } from '../components/common/ProductCard';
import { Pagination } from '../components/common/Pagination';
import { NotFoundPage } from '../pages/NotFoundPage';
import { HomePage } from '../pages/HomePage';
import { ProductListingPage } from '../pages/ProductListingPage';
import { categoriesApi } from '../api/categories.api';
import { productsApi } from '../api/products.api';
import type { Category, Product, PaginationMeta } from '../types';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockDemoProduct: Product = {
  id: '11111111-2222-3333-4444-555555555555',
  sku: 'DEMO-ELEC-001',
  title: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
  slug: 'demo-indicsonic-pro-anc-wireless-headphones',
  shortDescription: 'Hybrid Active Noise Cancellation with 45-hour battery.',
  brand: 'IndicSonic',
  pricePaise: 349900,
  mrpPaise: 599900,
  stockQuantity: 42,
  lowStockThreshold: 5,
  isFeatured: true,
  isDemo: true,
  ratingAvg: 4.5,
  reviewCount: 12,
  category: {
    id: 'cat-elec-1',
    name: 'Electronics',
    slug: 'electronics',
  },
  primaryImage: {
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    altText: 'Indicsonic Headphones',
  },
  createdAt: new Date().toISOString(),
};

const mockCategories: Category[] = [
  {
    id: 'cat-elec-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Headphones, smartwatches, and accessories',
    imageUrl: null,
    parentId: null,
    parent: null,
    children: [],
    productCount: 4,
    createdAt: new Date().toISOString(),
  },
];

describe('Phase 3 Frontend — Currency Utilities (Integer Paise <-> INR)', () => {
  it('formats integer paise into Indian Rupee strings accurately', () => {
    expect(formatPaiseToINR(349900)).toBe('₹3,499.00');
    expect(formatPaiseToINR(349900, { trimZeroPaise: true })).toBe('₹3,499');
    expect(formatPaiseToINR(1299950)).toBe('₹12,999.50');
    expect(formatPaiseToINR(0, { trimZeroPaise: true })).toBe('₹0');
  });

  it('converts Rupee filter inputs into integer paise without floating-point drift', () => {
    expect(rupeesToPaise(1499)).toBe(149900);
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(-50)).toBe(0);
  });

  it('calculates percentage discount between MRP paise and selling price paise', () => {
    expect(calculateDiscountPercent(349900, 599900)).toBe(42);
    expect(calculateDiscountPercent(50000, 50000)).toBe(0);
    expect(calculateDiscountPercent(60000, 50000)).toBe(0);
  });
});

describe('Phase 3 Frontend — ProductCard Component', () => {
  it('renders [DEMO] badge, formatted INR price, MRP strikethrough, discount %, and stock state', () => {
    render(
      <MemoryRouter future={routerFutureFlags}>
        <ProductCard product={mockDemoProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText('DEMO')).toBeInTheDocument();
    expect(
      screen.getByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
    ).toBeInTheDocument();
    expect(screen.getByText('₹3,499')).toBeInTheDocument();
    expect(screen.getByText('₹5,999')).toBeInTheDocument();
    expect(screen.getByText('42% OFF')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('renders Out of Stock badge when stockQuantity is 0', () => {
    const outOfStockProduct: Product = {
      ...mockDemoProduct,
      stockQuantity: 0,
    };

    render(
      <MemoryRouter future={routerFutureFlags}>
        <ProductCard product={outOfStockProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});

describe('Phase 3 Frontend — Pagination & 404 Page', () => {
  it('renders pagination summary and triggers onPageChange when clicking Next', () => {
    const pagination: PaginationMeta = {
      page: 1,
      limit: 12,
      totalItems: 24,
      totalPages: 2,
      hasPrevPage: false,
      hasNextPage: true,
    };
    const onPageChange = vi.fn();

    render(
      <Pagination pagination={pagination} onPageChange={onPageChange} />
    );

    expect(screen.getByLabelText('Pagination')).toBeInTheDocument();
    const nextBtn = screen.getByLabelText('Next Page');
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders 404 NotFoundPage with links back to Home and Product Catalog', () => {
    render(
      <MemoryRouter future={routerFutureFlags}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Home/i })).toHaveAttribute(
      'href',
      '/'
    );
    expect(
      screen.getByRole('link', { name: /Browse Products/i })
    ).toHaveAttribute('href', '/products');
  });
});

describe('Phase 3 Frontend — HomePage & ProductListingPage API Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(categoriesApi, 'listCategories').mockResolvedValue(mockCategories);
    vi.spyOn(productsApi, 'listProducts').mockResolvedValue({
      items: [mockDemoProduct],
      pagination: {
        page: 1,
        limit: 12,
        totalItems: 1,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
      },
    });
  });

  it('renders HomePage with live categories and featured products from the API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={routerFutureFlags}>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getAllByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
          .length
      ).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
  });

  it('renders ProductListingPage and passes filter parameters to productsApi.listProducts', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/products?category=electronics&minPrice=1000']}
          future={routerFutureFlags}
        >
          <ProductListingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(productsApi.listProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
          minPricePaise: 100000,
        })
      );
    });

    expect(
      await screen.findByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
    ).toBeInTheDocument();
  });
});
