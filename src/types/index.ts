export type PlatformStatus = 'active' | 'upcoming';
export type OpenMode = 'internal' | 'external' | 'new_tab' | 'same_tab';

export interface Platform {
  id: string;
  name: string;
  url: string;
  description: string;
  icon?: string;
  status: PlatformStatus;
  order: number;
  openMode?: OpenMode; // 'internal' (In-App Browser), 'new_tab' (External new window), 'same_tab' (Same tab)
  featured?: boolean;
  visits?: number;
  rating?: number;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  id: string;
  title?: string;
  imageUrl: string;
  actionUrl?: string;
  openMode?: OpenMode;
  order: number;
  active: boolean;
  createdAt?: string;
}

export interface AppConfig {
  bannerImageUrl: string;
  telegramUrl: string;
}

export interface ImportSummary {
  total: number;
  added: number;
  skipped: number;
  errors: string[];
}
