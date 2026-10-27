import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Platform, AppConfig, ImportSummary, Banner, OpenMode } from '../types';
import { VIDEO_PLATFORMS, DEFAULT_BANNER_IMAGE, DEFAULT_TELEGRAM_URL } from '../data/videoPlatforms';
import { compressImage, isSafeFirestorePayload } from '../lib/imageCompressor';

export const DEFAULT_CONFIG: AppConfig = {
  bannerImageUrl: DEFAULT_BANNER_IMAGE,
  telegramUrl: DEFAULT_TELEGRAM_URL,
};

export const INITIAL_BANNERS: Banner[] = [
  {
    id: 'banner-navratri-1',
    title: 'GB STUDY - Learn | Grow | Succeed',
    imageUrl: DEFAULT_BANNER_IMAGE,
    actionUrl: 'https://t.me/GBFreestudy',
    openMode: 'new_tab',
    order: 1,
    active: true,
  }
];

// Instant LocalStorage Cache Keys for 0ms initial load
const CACHE_KEY_PLATFORMS = 'gb_cached_platforms_v4';
const CACHE_KEY_BANNERS = 'gb_cached_banners_v4';
const CACHE_KEY_CONFIG = 'gb_cached_config_v4';

export function getCachedPlatforms(): Platform[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PLATFORMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortPlatforms(parsed);
      }
    }
  } catch {}
  return sortPlatforms(VIDEO_PLATFORMS);
}

export function getCachedBanners(): Banner[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_BANNERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_BANNERS;
}

export function getCachedConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.telegramUrl === 'string') {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_CONFIG;
}

// Helper to sanitize and compress icon before writing to Firestore
async function sanitizeIcon(rawIcon?: string): Promise<string> {
  if (!rawIcon) return '';
  const trimmed = rawIcon.trim();

  // If already a short URL, return clean
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('ibb.co/0R7qc34v')) {
      return 'https://i.ibb.co/Q3g9fGSt/1791541921524.png';
    }
    return trimmed;
  }

  // If base64 data URL, ensure it is compressed strictly under 45 KB
  if (trimmed.startsWith('data:image/')) {
    try {
      const compressed = await compressImage(trimmed, 128, 128, 0.7);
      if (compressed.length > 50000) {
        return await compressImage(compressed, 96, 96, 0.5);
      }
      return compressed;
    } catch {
      return 'https://api.iconify.design/lucide:book-open.svg?color=%2338bdf8';
    }
  }

  return trimmed;
}

// Helper to sanitize banner image
async function sanitizeBannerImage(rawImg?: string): Promise<string> {
  if (!rawImg) return DEFAULT_BANNER_IMAGE;
  const trimmed = rawImg.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/')) {
    try {
      const compressed = await compressImage(trimmed, 800, 360, 0.7);
      if (compressed.length > 90000) {
        return await compressImage(compressed, 640, 280, 0.55);
      }
      return compressed;
    } catch {
      return DEFAULT_BANNER_IMAGE;
    }
  }

  return trimmed;
}

// ----------------- PLATFORMS ----------------- //

/**
 * Ensures whichever platform is added or edited goes to the VERY TOP (sabse upar)
 * for both admin and users.
 */
export function comparePlatformsByTopPriority(a: Platform, b: Platform): number {
  const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
  const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);

  // If one was added or edited more recently (difference > 2.5s), it goes to the very top
  if (Math.abs(timeA - timeB) > 2500) {
    return timeB - timeA; // Newest first (highest position)
  }

  // If timestamps are tied (e.g. batch seed or bulk import), use order ascending
  return (a.order ?? 9999) - (b.order ?? 9999);
}

export function sortPlatforms(platforms: Platform[]): Platform[] {
  return [...platforms].sort(comparePlatformsByTopPriority);
}

export function subscribePlatforms(callback: (platforms: Platform[]) => void, onError?: (err: Error) => void) {
  const platformsRef = collection(db, 'platforms');

  return onSnapshot(platformsRef, (snapshot) => {
    if (snapshot.empty) {
      seedVideoPlatformsIfEmpty().then((seeded) => {
        if (!seeded) {
          callback(sortPlatforms(VIDEO_PLATFORMS));
        }
      });
      return;
    }
    const items: Platform[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Platform, 'id'>) });
    });
    const sorted = sortPlatforms(items);
    try {
      localStorage.setItem(CACHE_KEY_PLATFORMS, JSON.stringify(sorted));
    } catch {}
    // Newly added or edited platforms appear at the VERY TOP for both admin and user
    callback(sorted);
  }, (error) => {
    console.error('Error subscribing to platforms:', error);
    try {
      handleFirestoreError(error, OperationType.GET, 'platforms');
    } catch (e: any) {
      onError?.(e);
    }
    callback(sortPlatforms(VIDEO_PLATFORMS));
  });
}

export async function seedVideoPlatformsIfEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'platforms'));
    if (snap.size > 0) return false;

    const batch = writeBatch(db);
    // Baseline timestamp for seed platforms
    const seedTime = '2024-01-01T00:00:00.000Z';
    for (const p of VIDEO_PLATFORMS) {
      const ref = doc(db, 'platforms', p.id);
      batch.set(ref, {
        name: p.name,
        url: p.url,
        description: p.description,
        icon: p.icon || '',
        status: p.status || 'active',
        openMode: p.openMode || 'internal',
        order: p.order,
        createdAt: seedTime,
        updatedAt: seedTime,
      });
    }
    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Seeding note:', error);
    return false;
  }
}

export async function addPlatform(platform: Omit<Platform, 'id'>): Promise<string> {
  const cleanId = (platform.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36)).slice(0, 60);
  const docRef = doc(db, 'platforms', cleanId);
  try {
    const icon = await sanitizeIcon(platform.icon);
    const now = new Date().toISOString();

    const payload = {
      ...platform,
      icon,
      openMode: platform.openMode || 'internal',
      order: 0, // Top priority order
      createdAt: now,
      updatedAt: now,
    };

    if (!isSafeFirestorePayload(payload)) {
      throw new Error('Payload size too large. Please select a smaller icon or enter an image URL.');
    }

    await setDoc(docRef, payload);
    return cleanId;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, `platforms/${cleanId}`);
    throw error;
  }
}

export async function updatePlatform(id: string, data: Partial<Platform>): Promise<void> {
  const docRef = doc(db, 'platforms', id);
  try {
    let icon = data.icon;
    if (icon !== undefined) {
      icon = await sanitizeIcon(icon);
    }

    const payload: any = {
      ...data,
      order: 0, // Sent directly to top upon edit
      updatedAt: new Date().toISOString(),
    };
    if (icon !== undefined) {
      payload.icon = icon;
    }

    if (!isSafeFirestorePayload(payload)) {
      throw new Error('Payload size too large. Please select a smaller icon or enter an image URL.');
    }

    await updateDoc(docRef, payload);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `platforms/${id}`);
    throw error;
  }
}

/**
 * 1-click action to move any platform to the VERY TOP immediately
 */
export async function movePlatformToTop(id: string): Promise<void> {
  const docRef = doc(db, 'platforms', id);
  try {
    await updateDoc(docRef, {
      order: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `platforms/${id}`);
    throw error;
  }
}

export async function updatePlatformOpenMode(id: string, openMode: OpenMode): Promise<void> {
  const docRef = doc(db, 'platforms', id);
  try {
    await updateDoc(docRef, {
      openMode,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `platforms/${id}`);
    throw error;
  }
}

export async function deletePlatform(id: string): Promise<void> {
  const docRef = doc(db, 'platforms', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `platforms/${id}`);
    throw error;
  }
}

// ----------------- MULTIPLE BANNERS COLLECTION ----------------- //

export function subscribeBanners(callback: (banners: Banner[]) => void) {
  const bannersRef = collection(db, 'banners');

  return onSnapshot(bannersRef, (snapshot) => {
    if (snapshot.empty) {
      seedBannersIfEmpty().then((seeded) => {
        if (!seeded) callback(INITIAL_BANNERS);
      });
      return;
    }
    const items: Banner[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as Omit<Banner, 'id'>) });
    });
    items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    try {
      localStorage.setItem(CACHE_KEY_BANNERS, JSON.stringify(items));
    } catch {}
    callback(items);
  }, (err) => {
    console.warn('Banners snapshot note:', err);
    callback(getCachedBanners());
  });
}

export async function seedBannersIfEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'banners'));
    if (snap.size > 0) return false;

    const batch = writeBatch(db);
    for (const b of INITIAL_BANNERS) {
      batch.set(doc(db, 'banners', b.id), b);
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Banners seed skipped:', err);
    return false;
  }
}

export async function addBanner(banner: Omit<Banner, 'id'>): Promise<string> {
  const cleanId = `banner-${Date.now()}`;
  const docRef = doc(db, 'banners', cleanId);
  try {
    const imageUrl = await sanitizeBannerImage(banner.imageUrl);

    const payload = {
      ...banner,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    if (!isSafeFirestorePayload(payload, 250000)) {
      throw new Error('Banner image too large. Please choose a smaller image file or URL.');
    }

    await setDoc(docRef, payload);
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `banners/${cleanId}`);
    throw error;
  }
}

export async function updateBanner(id: string, banner: Partial<Banner>): Promise<void> {
  const docRef = doc(db, 'banners', id);
  try {
    let imageUrl = banner.imageUrl;
    if (imageUrl !== undefined) {
      imageUrl = await sanitizeBannerImage(imageUrl);
    }

    const payload: any = { ...banner };
    if (imageUrl !== undefined) {
      payload.imageUrl = imageUrl;
    }

    if (!isSafeFirestorePayload(payload, 250000)) {
      throw new Error('Banner image too large. Please choose a smaller image file or URL.');
    }

    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `banners/${id}`);
    throw error;
  }
}

export async function deleteBanner(id: string): Promise<void> {
  const docRef = doc(db, 'banners', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `banners/${id}`);
    throw error;
  }
}

// ----------------- CONFIG / SETTINGS ----------------- //

export function subscribeConfig(callback: (config: AppConfig) => void) {
  const docRef = doc(db, 'settings', 'global');

  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      setDoc(docRef, DEFAULT_CONFIG).catch(() => {});
      callback(DEFAULT_CONFIG);
      return;
    }
    const data = snap.data() as AppConfig;
    try {
      localStorage.setItem(CACHE_KEY_CONFIG, JSON.stringify(data));
    } catch {}
    callback(data);
  }, (err) => {
    console.warn('Settings snapshot note:', err);
    callback(getCachedConfig());
  });
}

export async function updateConfig(partial: Partial<AppConfig>): Promise<void> {
  const docRef = doc(db, 'settings', 'global');
  try {
    let bannerImageUrl = partial.bannerImageUrl;
    if (bannerImageUrl !== undefined) {
      bannerImageUrl = await sanitizeBannerImage(bannerImageUrl);
    }

    const payload: any = { ...partial };
    if (bannerImageUrl !== undefined) {
      payload.bannerImageUrl = bannerImageUrl;
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    throw error;
  }
}

// ----------------- BULK IMPORT / EXPORT ----------------- //

export function parseCSVPlatforms(csvText: string): Array<Partial<Platform>> {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('link'));
  const descIdx = headers.findIndex((h) => h.includes('desc'));
  const iconIdx = headers.findIndex((h) => h.includes('icon'));
  const modeIdx = headers.findIndex((h) => h.includes('mode') || h.includes('target'));

  const results: Array<Partial<Platform>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
    const url = urlIdx !== -1 ? cols[urlIdx] : cols[1];
    const description = descIdx !== -1 ? cols[descIdx] : 'Open platform to explore content.';
    const icon = iconIdx !== -1 ? cols[iconIdx] : '';
    const openMode = (modeIdx !== -1 ? cols[modeIdx] : 'new_tab') as OpenMode;

    if (name && url) {
      results.push({
        name,
        url,
        description,
        icon,
        openMode: ['internal', 'external', 'new_tab', 'same_tab'].includes(openMode) ? openMode : 'internal',
        status: 'active',
      });
    }
  }

  return results;
}

export async function bulkImportPlatforms(
  items: Array<Partial<Platform>>,
  existingPlatforms: Platform[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: items.length,
    added: 0,
    skipped: 0,
    errors: [],
  };

  const existingUrls = new Set(existingPlatforms.map((p) => p.url.toLowerCase().trim()));

  const batch = writeBatch(db);
  let batchCount = 0;

  for (const item of items) {
    if (!item.name || !item.url) {
      summary.skipped++;
      summary.errors.push(`Row missing Name or URL`);
      continue;
    }

    const cleanUrl = item.url.toLowerCase().trim();
    if (existingUrls.has(cleanUrl)) {
      summary.skipped++;
      continue;
    }

    const cleanId = (item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)).slice(0, 60);
    const docRef = doc(db, 'platforms', cleanId);

    const safeIcon = await sanitizeIcon(item.icon);

    batch.set(docRef, {
      name: item.name.trim(),
      url: item.url.trim(),
      description: item.description?.trim() || 'Open platform to explore content.',
      icon: safeIcon,
      status: item.status || 'active',
      openMode: item.openMode || 'new_tab',
      order: existingPlatforms.length + summary.added + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    existingUrls.add(cleanUrl);
    summary.added++;
    batchCount++;

    if (batchCount >= 450) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return summary;
}
