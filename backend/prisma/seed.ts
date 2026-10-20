import { DiscountType, InventoryReason, Prisma, Role } from '@prisma/client';
import { env } from '../src/config/env';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
}

interface SeedProduct {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  brand: string;
  pricePaise: number;
  mrpPaise: number;
  stockQuantity: number;
  isFeatured: boolean;
  shortDescription: string;
  description: string;
  imageUrl: string;
  specifications: Record<string, string | number | boolean>;
}

const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Electronics & Audio',
    slug: 'electronics-audio',
    description:
      '[DEMO CATEGORY] Wireless headphones, Bluetooth speakers, mechanical keyboards, and productivity accessories.',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Smartphones & Accessories',
    slug: 'smartphones-accessories',
    description:
      '[DEMO CATEGORY] 5G smartphones, GaN fast chargers, power banks, and braided Type-C cables.',
    imageUrl:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Fashion & Ethnic Wear',
    slug: 'fashion-ethnic-wear',
    description:
      '[DEMO CATEGORY] Contemporary Indian ethnic wear, cotton kurtas, handloom sarees, and everyday apparel.',
    imageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Home & Kitchen Appliances',
    slug: 'home-kitchen-appliances',
    description:
      '[DEMO CATEGORY] Mixer grinders, induction cooktops, stainless steel flasks, and smart home lighting.',
    imageUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Books & Engineering Study',
    slug: 'books-engineering-study',
    description:
      '[DEMO CATEGORY] Computer Science, AI/ML, DSA interview preparation, and system design reference books.',
    imageUrl:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Fitness & Sports Gear',
    slug: 'fitness-sports-gear',
    description:
      '[DEMO CATEGORY] Yoga mats, adjustable dumbbells, badminton racquets, and hydration gear.',
    imageUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
  },
];

// 24 Clearly Labelled Demo Products (all monetary amounts in integer paise: ₹1 = 100 paise)
const SEED_PRODUCTS: SeedProduct[] = [
  // 1. Electronics & Audio (4 items)
  {
    sku: 'DEMO-ELEC-001',
    name: '[DEMO] IndiSound Nirvana ANC Pro Wireless Headphones',
    slug: 'demo-indisound-nirvana-anc-pro-wireless-headphones',
    categorySlug: 'electronics-audio',
    brand: 'IndiSound',
    pricePaise: 349900, // ₹3,499.00
    mrpPaise: 599900,   // ₹5,999.00
    stockQuantity: 35,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Over-ear Bluetooth 5.3 headphones with 42dB Hybrid Active Noise Cancellation and 60-hour battery.',
    description:
      'This is a ShopSphere demonstration product. Engineered for Indian commuters and remote developers, the IndiSound Nirvana ANC Pro features 40mm titanium drivers, quad-mic ENC for crystal-clear calls, and USB Type-C fast charging.',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    specifications: {
      connectivity: 'Bluetooth 5.3 + 3.5mm Aux',
      batteryLifeHours: 60,
      noiseCancellation: '42dB Hybrid ANC',
      warranty: '1 Year Domestic Warranty',
    },
  },
  {
    sku: 'DEMO-ELEC-002',
    name: '[DEMO] KeyCraft BharatKBD 75% Hot-Swappable Mechanical Keyboard',
    slug: 'demo-keycraft-bharatkbd-75-mechanical-keyboard',
    categorySlug: 'electronics-audio',
    brand: 'KeyCraft',
    pricePaise: 429900, // ₹4,299.00
    mrpPaise: 549900,   // ₹5,499.00
    stockQuantity: 22,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Compact 84-key wireless mechanical keyboard with pre-lubed tactile switches and PBT keycaps.',
    description:
      'This is a ShopSphere demonstration product. Built for coding marathons and gaming, featuring tri-mode connectivity (2.4GHz, Bluetooth 5.1, wired USB-C), gasket mount dampening, and per-key RGB.',
    imageUrl:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    specifications: {
      layout: '75% (84 Keys)',
      switches: 'Tactile Brown (Hot-Swappable)',
      connectivity: 'Tri-Mode Wireless & USB-C',
      batteryCapacity: '4000mAh',
    },
  },
  {
    sku: 'DEMO-ELEC-003',
    name: '[DEMO] SonicPulse Monsoon IPX7 Portable Bluetooth Speaker',
    slug: 'demo-sonicpulse-monsoon-ipx7-bluetooth-speaker',
    categorySlug: 'electronics-audio',
    brand: 'IndiSound',
    pricePaise: 179900, // ₹1,799.00
    mrpPaise: 299900,   // ₹2,999.00
    stockQuantity: 50,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] 24W stereo waterproof portable speaker with dual passive radiators and TWS pairing.',
    description:
      'This is a ShopSphere demonstration product. Rugged outdoor speaker designed to handle monsoon splashes with IPX7 waterproofing and 16 hours of playback on a single charge.',
    imageUrl:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
    specifications: {
      outputPowerWatts: 24,
      waterproofRating: 'IPX7',
      playbackTimeHours: 16,
      chargingPort: 'USB Type-C',
    },
  },
  {
    sku: 'DEMO-ELEC-004',
    name: '[DEMO] AeroDesk Aluminum Ergonomic Laptop Stand',
    slug: 'demo-aerodesk-aluminum-ergonomic-laptop-stand',
    categorySlug: 'electronics-audio',
    brand: 'AeroDesk',
    pricePaise: 119900, // ₹1,199.00
    mrpPaise: 199900,   // ₹1,999.00
    stockQuantity: 60,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Foldable anodized aluminum stand compatible with 11-inch to 17-inch laptops.',
    description:
      'This is a ShopSphere demonstration product. Improves posture and airflow during long study and coding sessions with 7 adjustable height levels and anti-slip silicone pads.',
    imageUrl:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
    specifications: {
      material: 'Anodized Aircraft Aluminum',
      supportedSizes: '11 to 17.3 inches',
      weightGrams: 260,
      adjustableLevels: 7,
    },
  },

  // 2. Smartphones & Accessories (4 items)
  {
    sku: 'DEMO-MOB-001',
    name: '[DEMO] BharatPhone Nova 5G (8GB RAM, 256GB Storage)',
    slug: 'demo-bharatphone-nova-5g-8gb-256gb',
    categorySlug: 'smartphones-accessories',
    brand: 'BharatPhone',
    pricePaise: 2199900, // ₹21,999.00
    mrpPaise: 2499900,   // ₹24,999.00
    stockQuantity: 18,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] 120Hz AMOLED 5G smartphone with 50MP OIS camera and 5000mAh battery.',
    description:
      'This is a ShopSphere demonstration product. Supports all Indian 5G bands, features a 6.67-inch FHD+ 120Hz AMOLED display, clean Android experience, and 67W fast charging adapter in the box.',
    imageUrl:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    specifications: {
      ram: '8GB LPDDR5',
      storage: '256GB UFS 3.1',
      display: '6.67-inch 120Hz AMOLED',
      battery: '5000mAh with 67W Charger',
    },
  },
  {
    sku: 'DEMO-MOB-002',
    name: '[DEMO] VoltEdge 65W Dual-Port GaN Fast Charger (BIS Certified)',
    slug: 'demo-voltedge-65w-gan-fast-charger',
    categorySlug: 'smartphones-accessories',
    brand: 'VoltEdge',
    pricePaise: 159900, // ₹1,599.00
    mrpPaise: 249900,   // ₹2,499.00
    stockQuantity: 75,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Compact Indian-plug 65W Gallium Nitride charger for laptops and smartphones.',
    description:
      'This is a ShopSphere demonstration product. BIS-certified Indian 2-pin plug charger capable of charging a MacBook Air or ultrabook alongside a 5G smartphone simultaneously.',
    imageUrl:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    specifications: {
      maxOutputWatts: 65,
      ports: '2x USB-C PD 3.0 + 1x USB-A QC',
      plugType: 'Indian Standard Type C/D (BIS Certified)',
      surgeProtection: true,
    },
  },
  {
    sku: 'DEMO-MOB-003',
    name: '[DEMO] VoltEdge 20000mAh 22.5W Fast Charging Power Bank',
    slug: 'demo-voltedge-20000mah-power-bank',
    categorySlug: 'smartphones-accessories',
    brand: 'VoltEdge',
    pricePaise: 149900, // ₹1,499.00
    mrpPaise: 219900,   // ₹2,199.00
    stockQuantity: 45,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] High-density Li-Polymer 20000mAh power bank with two-way USB-C PD.',
    description:
      'This is a ShopSphere demonstration product. Airline-safe 20000mAh backup battery with 12-layer circuit protection and LED battery percentage indicator.',
    imageUrl:
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80',
    specifications: {
      capacity: '20000mAh / 74Wh',
      fastChargeWatts: 22.5,
      inputOutput: 'Bidirectional USB-C',
      weightGrams: 410,
    },
  },
  {
    sku: 'DEMO-MOB-004',
    name: '[DEMO] ArmorWeave 100W Braided USB-C to USB-C Cable (2 Meter)',
    slug: 'demo-armorweave-100w-braided-usb-c-cable-2m',
    categorySlug: 'smartphones-accessories',
    brand: 'VoltEdge',
    pricePaise: 39900, // ₹399.00
    mrpPaise: 69900,   // ₹699.00
    stockQuantity: 120,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] E-Marker smart chip 100W PD nylon-braided cable tested for 15,000+ bends.',
    description:
      'This is a ShopSphere demonstration product. Supports up to 100W (20V/5A) power delivery and 480Mbps data sync for laptops, tablets, and Android/iOS USB-C devices.',
    imageUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    specifications: {
      lengthMeters: 2,
      maxPowerWatts: 100,
      eMarkerChip: true,
      jacketMaterial: 'Double-Braided Nylon',
    },
  },

  // 3. Fashion & Ethnic Wear (4 items)
  {
    sku: 'DEMO-FASH-001',
    name: '[DEMO] UtsavWeaves Men Pure Cotton Indigo Chikankari Kurta',
    slug: 'demo-utsavweaves-men-cotton-indigo-chikankari-kurta',
    categorySlug: 'fashion-ethnic-wear',
    brand: 'UtsavWeaves',
    pricePaise: 129900, // ₹1,299.00
    mrpPaise: 219900,   // ₹2,199.00
    stockQuantity: 40,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Breathable 100% combed cotton straight kurta with traditional Lucknowi embroidery.',
    description:
      'This is a ShopSphere demonstration product. Handcrafted straight-fit men kurta featuring subtle tone-on-tone Chikankari work, mandarin collar, and side pockets for festive and campus events.',
    imageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    specifications: {
      fabric: '100% Pure Combed Cotton',
      fit: 'Regular Straight Fit',
      collar: 'Mandarin Collar',
      washCare: 'Gentle Hand Wash',
    },
  },
  {
    sku: 'DEMO-FASH-002',
    name: '[DEMO] KashiLoom Woven Banarasi Art Silk Festive Saree',
    slug: 'demo-kashiloom-woven-banarasi-art-silk-saree',
    categorySlug: 'fashion-ethnic-wear',
    brand: 'KashiLoom',
    pricePaise: 249900, // ₹2,499.00
    mrpPaise: 449900,   // ₹4,499.00
    stockQuantity: 25,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Crimson & gold zari woven Banarasi art silk saree with unstitched blouse piece.',
    description:
      'This is a ShopSphere demonstration product. Features intricate zari motif borders inspired by Varanasi handlooms, lightweight drape, and an included 0.8m matching blouse piece.',
    imageUrl:
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    specifications: {
      fabric: 'Banarasi Art Silk',
      sareeLengthMeters: 5.5,
      blousePieceMeters: 0.8,
      weaveType: 'Jacquard Zari Weave',
    },
  },
  {
    sku: 'DEMO-FASH-003',
    name: '[DEMO] UrbanYatra Water-Resistant 28L Laptop Backpack',
    slug: 'demo-urbanyatra-water-resistant-28l-laptop-backpack',
    categorySlug: 'fashion-ethnic-wear',
    brand: 'UrbanYatra',
    pricePaise: 169900, // ₹1,699.00
    mrpPaise: 279900,   // ₹2,799.00
    stockQuantity: 55,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Ergonomic college & office backpack with padded 16-inch laptop sleeve and rain cover.',
    description:
      'This is a ShopSphere demonstration product. Designed for daily metro and campus travel with high-density 900D polyester, secret anti-theft back pocket, and integrated rain cover.',
    imageUrl:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    specifications: {
      capacityLiters: 28,
      laptopCompartment: 'Up to 16 inches',
      rainCoverIncluded: true,
      waterResistant: true,
    },
  },
  {
    sku: 'DEMO-FASH-004',
    name: '[DEMO] DeccanThread Unisex Heavyweight 240 GSM Oversized Tee',
    slug: 'demo-deccanthread-unisex-240gsm-oversized-tee',
    categorySlug: 'fashion-ethnic-wear',
    brand: 'DeccanThread',
    pricePaise: 69900, // ₹699.00
    mrpPaise: 119900,  // ₹1,199.00
    stockQuantity: 90,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Bio-washed 100% Tirupur French Terry cotton drop-shoulder t-shirt.',
    description:
      'This is a ShopSphere demonstration product. Knitted in Tirupur from premium 240 GSM combed cotton with Lycra ribbed crew neck that retains shape wash after wash.',
    imageUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    specifications: {
      fabricWeight: '240 GSM French Terry',
      material: '100% Bio-Washed Cotton',
      origin: 'Tirupur, India',
      fit: 'Oversized Drop Shoulder',
    },
  },

  // 4. Home & Kitchen Appliances (4 items)
  {
    sku: 'DEMO-HOME-001',
    name: '[DEMO] RasoiMaster 750W Heavy-Duty 3-Jar Mixer Grinder',
    slug: 'demo-rasoimaster-750w-3-jar-mixer-grinder',
    categorySlug: 'home-kitchen-appliances',
    brand: 'RasoiMaster',
    pricePaise: 329900, // ₹3,299.00
    mrpPaise: 499900,   // ₹4,999.00
    stockQuantity: 28,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] 100% copper-winded 750W motor with food-grade 304 stainless steel jars for Indian kitchens.',
    description:
      'This is a ShopSphere demonstration product. Effortlessly grinds tough turmeric, idli/dosa batter, and dry masalas with overload circuit breaker protection and 3-speed pulse control.',
    imageUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
    specifications: {
      motorWattage: 750,
      jarsIncluded: '1.5L Liquidizing, 1.0L Dry/Wet, 0.4L Chutney',
      jarMaterial: 'SS 304 Food-Grade Steel',
      warranty: '2 Years Product + 5 Years Motor',
    },
  },
  {
    sku: 'DEMO-HOME-002',
    name: '[DEMO] RasoiMaster 2000W Feather-Touch Induction Cooktop',
    slug: 'demo-rasoimaster-2000w-induction-cooktop',
    categorySlug: 'home-kitchen-appliances',
    brand: 'RasoiMaster',
    pricePaise: 219900, // ₹2,199.00
    mrpPaise: 349900,   // ₹3,499.00
    stockQuantity: 32,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Micro-crystal glass plate induction stove with Indian menu presets (Roti, Dal, Chai).',
    description:
      'This is a ShopSphere demonstration product. Ideal for hostels and modern kitchens with automatic voltage regulator (130V-270V), auto pan detection, and 8 power levels.',
    imageUrl:
      'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    specifications: {
      powerWatts: 2000,
      presets: 'Roti/Dosa, Dal, Boil, Curry, Fry, Milk/Chai',
      autoShutOff: true,
      cordLengthMeters: 1.5,
    },
  },
  {
    sku: 'DEMO-HOME-003',
    name: '[DEMO] ThermoCraft 1L Double-Wall Vacuum Insulated Steel Flask',
    slug: 'demo-thermocraft-1l-vacuum-insulated-steel-flask',
    categorySlug: 'home-kitchen-appliances',
    brand: 'ThermoCraft',
    pricePaise: 89900, // ₹899.00
    mrpPaise: 129900,  // ₹1,299.00
    stockQuantity: 85,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Copper-coated 304 stainless steel thermosteel bottle keeping drinks hot or cold for 24 hours.',
    description:
      'This is a ShopSphere demonstration product. BPA-free, leak-proof insulated bottle designed for Indian summers and winter travel.',
    imageUrl:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    specifications: {
      capacityMl: 1000,
      steelGrade: '304 Stainless Steel',
      hotColdRetentionHours: 24,
      leakProof: true,
    },
  },
  {
    sku: 'DEMO-HOME-004',
    name: '[DEMO] LumiSmart Wi-Fi 12W RGB+CCT Smart LED Study Lamp',
    slug: 'demo-lumismart-wifi-12w-smart-led-study-lamp',
    categorySlug: 'home-kitchen-appliances',
    brand: 'LumiSmart',
    pricePaise: 109900, // ₹1,099.00
    mrpPaise: 179900,   // ₹1,799.00
    stockQuantity: 42,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Flicker-free eye-care LED desk lamp with tunable warm-to-cool white and app control.',
    description:
      'This is a ShopSphere demonstration product. Features 3000K-6500K color temperature adjustment, stepless dimming, and built-in 4-hour emergency battery backup for power cuts.',
    imageUrl:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    specifications: {
      wattage: 12,
      colorTemperature: '3000K - 6500K + RGB',
      batteryBackupHours: 4,
      connectivity: '2.4GHz Wi-Fi',
    },
  },

  // 5. Books & Engineering Study (4 items)
  {
    sku: 'DEMO-BOOK-001',
    name: '[DEMO] Mastering Full-Stack System Design & Campus Interviews (Indian Ed.)',
    slug: 'demo-mastering-fullstack-system-design-campus-interviews',
    categorySlug: 'books-engineering-study',
    brand: 'TechPress India',
    pricePaise: 64900, // ₹649.00
    mrpPaise: 89900,   // ₹899.00
    stockQuantity: 110,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Practical guide to ACID transactions, indexing, caching, authentication, and payment systems.',
    description:
      'This is a ShopSphere demonstration product. Written specifically for final-year CSE students preparing for SDE placements, covering real-world trade-offs with case studies.',
    imageUrl:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    specifications: {
      binding: 'Paperback',
      pages: 480,
      language: 'English',
      isbn: '978-81-900000-1-1',
    },
  },
  {
    sku: 'DEMO-BOOK-002',
    name: '[DEMO] Deep Learning & Foundations of Modern AI/ML Engineering',
    slug: 'demo-deep-learning-foundations-modern-aiml-engineering',
    categorySlug: 'books-engineering-study',
    brand: 'TechPress India',
    pricePaise: 79900, // ₹799.00
    mrpPaise: 109900,  // ₹1,099.00
    stockQuantity: 65,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Comprehensive textbook covering linear algebra, backpropagation, Transformers, and MLOps.',
    description:
      'This is a ShopSphere demonstration product. Bridges mathematical theory with production PyTorch implementations for CSE AIML undergraduates.',
    imageUrl:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
    specifications: {
      binding: 'Paperback',
      pages: 612,
      language: 'English',
      isbn: '978-81-900000-2-8',
    },
  },
  {
    sku: 'DEMO-BOOK-003',
    name: '[DEMO] Problem Solving in Data Structures & Algorithms with TypeScript & C++',
    slug: 'demo-problem-solving-dsa-typescript-cpp',
    categorySlug: 'books-engineering-study',
    brand: 'CodeScholar',
    pricePaise: 54900, // ₹549.00
    mrpPaise: 74900,   // ₹749.00
    stockQuantity: 95,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] 250+ curated algorithmic problems with complexity proofs and dry-run diagrams.',
    description:
      'This is a ShopSphere demonstration product. Covers graphs, dynamic programming, trees, tries, and sliding window patterns with step-by-step space/time trade-offs.',
    imageUrl:
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
    specifications: {
      binding: 'Paperback',
      pages: 520,
      language: 'English',
      isbn: '978-81-900000-3-5',
    },
  },
  {
    sku: 'DEMO-BOOK-004',
    name: '[DEMO] PostgreSQL Internals & High-Concurrency Database Engineering',
    slug: 'demo-postgresql-internals-high-concurrency-database-engineering',
    categorySlug: 'books-engineering-study',
    brand: 'CodeScholar',
    pricePaise: 69900, // ₹699.00
    mrpPaise: 94900,   // ₹949.00
    stockQuantity: 48,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Deep dive into MVCC, B-Tree indexes, isolation levels, row locking, and query plans.',
    description:
      'This is a ShopSphere demonstration product. Explains how PostgreSQL guarantees data consistency under heavy concurrent load.',
    imageUrl:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    specifications: {
      binding: 'Paperback',
      pages: 410,
      language: 'English',
      isbn: '978-81-900000-4-2',
    },
  },

  // 6. Fitness & Sports Gear (4 items)
  {
    sku: 'DEMO-FIT-001',
    name: '[DEMO] PranaFlow 6mm Natural Cork & TPE Anti-Slip Yoga Mat',
    slug: 'demo-pranaflow-6mm-cork-tpe-yoga-mat',
    categorySlug: 'fitness-sports-gear',
    brand: 'PranaFlow',
    pricePaise: 139900, // ₹1,399.00
    mrpPaise: 229900,   // ₹2,299.00
    stockQuantity: 52,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Eco-friendly 6mm cushioned yoga mat with alignment lines and cotton carry strap.',
    description:
      'This is a ShopSphere demonstration product. Combines antimicrobial natural cork surface with high-density TPE base for superior grip during Surya Namaskar and floor workouts.',
    imageUrl:
      'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80',
    specifications: {
      thicknessMm: 6,
      dimensionsCm: '183 x 66',
      material: 'Natural Cork + Eco TPE',
      carryStrapIncluded: true,
    },
  },
  {
    sku: 'DEMO-FIT-002',
    name: '[DEMO] IronCore 20kg Cast-Iron Adjustable Dumbbell Set (2 x 10kg)',
    slug: 'demo-ironcore-20kg-adjustable-dumbbell-set',
    categorySlug: 'fitness-sports-gear',
    brand: 'IronCore',
    pricePaise: 289900, // ₹2,899.00
    mrpPaise: 429900,   // ₹4,299.00
    stockQuantity: 19,
    isFeatured: true,
    shortDescription:
      '[DEMO PRODUCT] Rust-resistant cast iron weight plates with knurled chrome spinlock rods.',
    description:
      'This is a ShopSphere demonstration product. Complete home gym strength kit allowing incremental adjustments from 2.5kg to 10kg per dumbbell.',
    imageUrl:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    specifications: {
      totalWeightKg: 20,
      plateMaterial: 'Machined Cast Iron',
      rodMaterial: 'Chrome-Plated Solid Steel',
      collarType: 'Threaded Star Spinlock',
    },
  },
  {
    sku: 'DEMO-FIT-003',
    name: '[DEMO] AeroSmash Carbon-Graphite Strung Badminton Racquet (82g)',
    slug: 'demo-aerosmash-carbon-graphite-badminton-racquet',
    categorySlug: 'fitness-sports-gear',
    brand: 'AeroSmash',
    pricePaise: 189900, // ₹1,899.00
    mrpPaise: 299900,   // ₹2,999.00
    stockQuantity: 38,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] Lightweight 4U isometric graphite racquet supporting up to 30 lbs string tension.',
    description:
      'This is a ShopSphere demonstration product. Pre-strung at 24 lbs with a full protective zip cover, engineered for offensive smashes and rapid net play.',
    imageUrl:
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    specifications: {
      weightCategory: '4U (82 Grams)',
      frameMaterial: 'High-Modulus Carbon Graphite',
      maxTensionLbs: 30,
      coverIncluded: true,
    },
  },
  {
    sku: 'DEMO-FIT-004',
    name: '[DEMO] IronCore Heavy-Duty Latex Resistance Loop Bands (Set of 5)',
    slug: 'demo-ironcore-latex-resistance-loop-bands-set-of-5',
    categorySlug: 'fitness-sports-gear',
    brand: 'IronCore',
    pricePaise: 59900, // ₹599.00
    mrpPaise: 99900,   // ₹999.00
    stockQuantity: 100,
    isFeatured: false,
    shortDescription:
      '[DEMO PRODUCT] 5 progressive resistance levels (5 lbs to 50 lbs) made from 100% Malaysian natural latex.',
    description:
      'This is a ShopSphere demonstration product. Portable strength training, mobility warm-up, and physiotherapy band set with mesh travel pouch.',
    imageUrl:
      'https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80',
    specifications: {
      bandsCount: 5,
      resistanceRange: '5 lbs to 50 lbs',
      material: '100% Natural Latex',
      travelPouchIncluded: true,
    },
  },
];

async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting ShopSphere idempotent database seed...');

  let adminUserId: string | null = null;

  // 1. Seed Demo Users ONLY in non-production environments (Security Rule #12)
  if (env.NODE_ENV !== 'production') {
    const [adminPasswordHash, customerPasswordHash] = await Promise.all([
      hashPassword(env.SEED_ADMIN_PASSWORD),
      hashPassword(env.SEED_CUSTOMER_PASSWORD),
    ]);

    const adminUser = await prisma.user.upsert({
      where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
      update: {
        fullName: 'ShopSphere Demo Admin',
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        email: env.SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash: adminPasswordHash,
        fullName: 'ShopSphere Demo Admin',
        phone: '+919876543210',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    const customerUser = await prisma.user.upsert({
      where: { email: env.SEED_CUSTOMER_EMAIL.toLowerCase() },
      update: {
        fullName: 'Aarav Sharma (Demo Customer)',
        role: Role.CUSTOMER,
        isActive: true,
      },
      create: {
        email: env.SEED_CUSTOMER_EMAIL.toLowerCase(),
        passwordHash: customerPasswordHash,
        fullName: 'Aarav Sharma (Demo Customer)',
        phone: '+919812345678',
        role: Role.CUSTOMER,
        isActive: true,
      },
    });

    // Ensure persistent carts exist for both demo users
    await Promise.all([
      prisma.cart.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: { userId: adminUser.id },
      }),
      prisma.cart.upsert({
        where: { userId: customerUser.id },
        update: {},
        create: { userId: customerUser.id },
      }),
    ]);

    // Ensure demo customer has a default Indian shipping address
    const existingAddresses = await prisma.address.count({
      where: { userId: customerUser.id },
    });
    if (existingAddresses === 0) {
      await prisma.address.create({
        data: {
          userId: customerUser.id,
          label: 'Home',
          recipientName: 'Aarav Sharma',
          phone: '9812345678',
          line1: 'Flat 402, Neelkanth Residency, 100 Feet Road',
          line2: 'Indiranagar',
          landmark: 'Near Indiranagar Metro Station',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
          isDefault: true,
        },
      });
    }

    console.log(
      `✅ Seeded development demo accounts: Admin (${adminUser.email}) & Customer (${customerUser.email})`
    );
  } else {
    console.log('🔒 Skipping demo user credentials in production mode.');
  }

  // 2. Seed Categories
  const categoryMap = new Map<string, string>();
  for (const cat of SEED_CATEGORIES) {
    const upsertedCategory = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        imageUrl: cat.imageUrl,
        isActive: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        isActive: true,
      },
    });
    categoryMap.set(cat.slug, upsertedCategory.id);
  }
  console.log(`✅ Seeded ${categoryMap.size} categories.`);

  // 3. Seed 24 Clearly Labelled Demo Products
  let seededProductsCount = 0;
  for (const item of SEED_PRODUCTS) {
    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category slug ${item.categorySlug} during product seed`);
    }

    const existingProduct = await prisma.product.findUnique({
      where: { sku: item.sku },
      select: { id: true },
    });

    if (!existingProduct) {
      await prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            categoryId,
            sku: item.sku,
            name: item.name,
            slug: item.slug,
            shortDescription: item.shortDescription,
            description: item.description,
            brand: item.brand,
            pricePaise: item.pricePaise,
            mrpPaise: item.mrpPaise,
            stockQuantity: item.stockQuantity,
            lowStockThreshold: 5,
            isActive: true,
            isFeatured: item.isFeatured,
            specifications: item.specifications as Prisma.InputJsonValue,
            averageRating: 0, // Never fabricate ratings (Rule #11)
            reviewCount: 0,
            images: {
              create: [
                {
                  url: item.imageUrl,
                  altText: item.name,
                  displayOrder: 0,
                  isPrimary: true,
                },
              ],
            },
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId: createdProduct.id,
            actorUserId: adminUserId,
            changeQuantity: item.stockQuantity,
            previousStock: 0,
            newStock: item.stockQuantity,
            reason: InventoryReason.INITIAL_STOCK,
            notes: 'Initial demo catalog seed stock',
          },
        });
      });
    } else {
      await prisma.product.update({
        where: { sku: item.sku },
        data: {
          categoryId,
          name: item.name,
          slug: item.slug,
          shortDescription: item.shortDescription,
          description: item.description,
          brand: item.brand,
          pricePaise: item.pricePaise,
          mrpPaise: item.mrpPaise,
          isActive: true,
          isFeatured: item.isFeatured,
          specifications: item.specifications as Prisma.InputJsonValue,
        },
      });
    }
    seededProductsCount++;
  }
  console.log(`✅ Seeded ${seededProductsCount} clearly labelled demo products.`);

  // 4. Seed Demo Coupons (all monetary thresholds/caps in integer paise)
  const now = new Date();
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  const demoCoupons = [
    {
      code: 'WELCOME10',
      description: '[DEMO COUPON] 10% off up to ₹300 on orders above ₹999',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderPaise: 99900,      // ₹999.00
      maxDiscountPaise: 30000,   // ₹300.00
      usageLimit: 500,
      perUserLimit: 1,
      startsAt: now,
      expiresAt: sixMonthsFromNow,
      isActive: true,
    },
    {
      code: 'FESTIVE500',
      description: '[DEMO COUPON] Flat ₹500 off on orders above ₹2,999',
      discountType: DiscountType.FIXED_PAISE,
      discountValue: 50000,      // ₹500.00 in paise
      minOrderPaise: 299900,     // ₹2,999.00 in paise
      maxDiscountPaise: null,
      usageLimit: 200,
      perUserLimit: 2,
      startsAt: now,
      expiresAt: sixMonthsFromNow,
      isActive: true,
    },
    {
      code: 'CAMPUS15',
      description: '[DEMO COUPON] 15% student discount up to ₹750 on orders above ₹1,499',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      minOrderPaise: 149900,     // ₹1,499.00
      maxDiscountPaise: 75000,   // ₹750.00
      usageLimit: 300,
      perUserLimit: 1,
      startsAt: now,
      expiresAt: sixMonthsFromNow,
      isActive: true,
    },
  ];

  for (const coupon of demoCoupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderPaise: coupon.minOrderPaise,
        maxDiscountPaise: coupon.maxDiscountPaise,
        usageLimit: coupon.usageLimit,
        perUserLimit: coupon.perUserLimit,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive,
      },
      create: coupon,
    });
  }
  console.log(`✅ Seeded ${demoCoupons.length} demo coupons.`);
  console.log('🎉 ShopSphere database seed completed successfully!');
}

seedDatabase()
  .catch((error) => {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
