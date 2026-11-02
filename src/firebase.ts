import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { Platform, BannerSlide } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Collection references
export const platformsCol = collection(db, 'platforms');
export const bannersCol = collection(db, 'banners');

// Validate connection once
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice, local offline cache active.');
    }
  }
}
testConnection();

// Real-time Cloud Listeners for all users across all devices
export function subscribeToPlatforms(
  onData: (platforms: Platform[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  // Read local cache immediately for instant 0ms rendering
  try {
    const cached = localStorage.getItem('gb_study_platforms');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onData(parsed);
      }
    }
  } catch (e) {}

  // Listen to live Cloud Firestore updates across all devices
  return onSnapshot(
    platformsCol,
    (snapshot) => {
      const cloudPlatforms: Platform[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Platform;
        cloudPlatforms.push({
          ...data,
          id: docSnap.id || data.id,
        });
      });

      // Sort by createdAt desc or keep order
      cloudPlatforms.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Update state and cache locally
      if (cloudPlatforms.length > 0) {
        localStorage.setItem('gb_study_platforms', JSON.stringify(cloudPlatforms));
        onData(cloudPlatforms);
      } else {
        // If cloud collection is completely empty, check if we have local platforms to seed into cloud
        try {
          const cached = localStorage.getItem('gb_study_platforms');
          if (cached) {
            const localList: Platform[] = JSON.parse(cached);
            if (Array.isArray(localList) && localList.length > 0) {
              // Upload local platforms to cloud so all devices get them
              localList.forEach((p) => {
                savePlatformToCloud(p).catch(() => {});
              });
              onData(localList);
              return;
            }
          }
        } catch (e) {}
        onData([]);
      }
    },
    (err) => {
      console.warn('Real-time platforms sync fallback to local cache:', err);
      onError?.(err);
    }
  );
}

export function subscribeToBanners(
  onData: (banners: BannerSlide[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const cached = localStorage.getItem('gb_study_banners');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onData(parsed);
      }
    }
  } catch (e) {}

  return onSnapshot(
    bannersCol,
    (snapshot) => {
      const cloudBanners: BannerSlide[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BannerSlide;
        cloudBanners.push({
          ...data,
          id: docSnap.id || data.id,
        });
      });

      if (cloudBanners.length > 0) {
        localStorage.setItem('gb_study_banners', JSON.stringify(cloudBanners));
        onData(cloudBanners);
      } else {
        try {
          const cached = localStorage.getItem('gb_study_banners');
          if (cached) {
            const localBanners: BannerSlide[] = JSON.parse(cached);
            if (Array.isArray(localBanners) && localBanners.length > 0) {
              localBanners.forEach((b) => {
                saveBannerToCloud(b).catch(() => {});
              });
              onData(localBanners);
              return;
            }
          }
        } catch (e) {}
        onData([]);
      }
    },
    (err) => {
      console.warn('Real-time banners sync fallback to local cache:', err);
      onError?.(err);
    }
  );
}

// Cloud Persistence Functions: guarantees global cross-device synchronization
export async function savePlatformToCloud(platform: Platform): Promise<void> {
  const docRef = doc(db, 'platforms', platform.id);
  const cleanData: any = {
    id: platform.id,
    name: platform.name || '',
    subtitle: platform.subtitle || '',
    logo: platform.logo || '/app-icon.png',
    url: platform.url || '',
    category: platform.category || 'General',
    openMode: platform.openMode || 'new_tab',
    tabPlacement: platform.tabPlacement || 'live',
    batchesCount: platform.batchesCount || 15,
    createdAt: platform.createdAt || new Date().toISOString(),
  };
  if (platform.bgColor) cleanData.bgColor = platform.bgColor;
  if (platform.badge) cleanData.badge = platform.badge;

  // 1. Save to Cloud Firestore (instantly visible on all devices)
  await setDoc(docRef, cleanData, { merge: true });

  // 2. Also keep local storage updated
  try {
    const cached = localStorage.getItem('gb_study_platforms');
    const list: Platform[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((p) => p.id === platform.id);
    if (idx >= 0) {
      list[idx] = cleanData;
    } else {
      list.unshift(cleanData);
    }
    localStorage.setItem('gb_study_platforms', JSON.stringify(list));
  } catch (e) {}
}

export async function deletePlatformFromCloud(id: string): Promise<void> {
  const docRef = doc(db, 'platforms', id);
  // 1. Delete from Cloud Firestore
  await deleteDoc(docRef);

  // 2. Remove from local storage
  try {
    const cached = localStorage.getItem('gb_study_platforms');
    if (cached) {
      const list: Platform[] = JSON.parse(cached);
      const filtered = list.filter((p) => p.id !== id);
      localStorage.setItem('gb_study_platforms', JSON.stringify(filtered));
    }
  } catch (e) {}
}

export async function saveBannerToCloud(banner: BannerSlide): Promise<void> {
  const docRef = doc(db, 'banners', banner.id);
  const cleanData: any = {
    id: banner.id,
    title: banner.title || '',
    subtitle: banner.subtitle || '',
    imageUrl: banner.imageUrl || '/banners/banner_clean_1.jpg',
    actionUrl: banner.actionUrl || 'https://t.me/GBFreestudy',
    actionType: banner.actionType || 'platform',
  };
  if (banner.badgeText) cleanData.badgeText = banner.badgeText;
  if (banner.authorText) cleanData.authorText = banner.authorText;
  if (banner.handleText) cleanData.handleText = banner.handleText;

  await setDoc(docRef, cleanData, { merge: true });

  try {
    const cached = localStorage.getItem('gb_study_banners');
    const list: BannerSlide[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((b) => b.id === banner.id);
    if (idx >= 0) {
      list[idx] = cleanData;
    } else {
      list.push(cleanData);
    }
    localStorage.setItem('gb_study_banners', JSON.stringify(list));
  } catch (e) {}
}

export async function deleteBannerFromCloud(id: string): Promise<void> {
  const docRef = doc(db, 'banners', id);
  await deleteDoc(docRef);

  try {
    const cached = localStorage.getItem('gb_study_banners');
    if (cached) {
      const list: BannerSlide[] = JSON.parse(cached);
      const filtered = list.filter((b) => b.id !== id);
      localStorage.setItem('gb_study_banners', JSON.stringify(filtered));
    }
  } catch (e) {}
}
