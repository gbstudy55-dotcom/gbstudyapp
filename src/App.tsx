import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon } from 'lucide-react';
import { Platform, BannerSlide, UserProfile } from './types';
import { SplashScreens } from './components/SplashScreens';
import { WelcomeModal } from './components/WelcomeModal';
import { TelegramModal } from './components/TelegramModal';
import { ProfileModal } from './components/ProfileModal';
import { BannerCarousel } from './components/BannerCarousel';
import { PlatformList } from './components/PlatformList';
import { BatchesView } from './components/BatchesView';
import { UpcomingView } from './components/UpcomingView';
import { GBAiView } from './components/GBAiView';
import { BottomNav, NavTab } from './components/BottomNav';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import {
  subscribeToPlatforms,
  subscribeToBanners,
  savePlatformToCloud,
  deletePlatformFromCloud,
  saveBannerToCloud,
  deleteBannerFromCloud,
} from './firebase';

export default function App() {
  // Database / Backend State with localStorage fallback for 100% Vercel persistence
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const saved = localStorage.getItem('gb_study_platforms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [banners, setBanners] = useState<BannerSlide[]>(() => {
    const saved = localStorage.getItem('gb_study_banners');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // App state & user profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('gb_study_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      name: 'SARVOTTAM',
      enrolledBatches: ['yakeen-2027'],
      activeMinutes: 0,
      hasSeenWelcome: false,
      hasSeenTelegram: false,
    };
  });

  // Flow states
  const [showSplash, setShowSplash] = useState(true);
  const [isTransitionSplash, setIsTransitionSplash] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Admin 10-tap gesture state
  const [iconTapCount, setIconTapCount] = useState(0);
  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  // Navigation & Platform selection (Platforms, GB AI, Upcoming)
  const [activeTab, setActiveTab] = useState<NavTab>('platforms');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [activeScreen, setActiveScreen] = useState<'main' | 'batches'>('main');

  // Fetch live platforms & banners from backend database (and merge safely with localStorage)
  const refreshBackendData = async () => {
    try {
      const [platRes, banRes] = await Promise.all([
        fetch('/api/platforms').catch(() => null),
        fetch('/api/banners').catch(() => null),
      ]);

      if (platRes && platRes.ok) {
        const contentType = platRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const platData = await platRes.json();
          if (Array.isArray(platData)) {
            // Get local platforms and deleted IDs
            const localRaw = localStorage.getItem('gb_study_platforms');
            let localPlatforms: Platform[] = [];
            try {
              if (localRaw) localPlatforms = JSON.parse(localRaw);
            } catch (e) {}

            let deletedIds: string[] = [];
            try {
              const dRaw = localStorage.getItem('gb_study_deleted_platforms');
              if (dRaw) deletedIds = JSON.parse(dRaw);
            } catch (e) {}

            // Combine local and backend platforms, preserving user added platforms
            const platformMap = new Map<string, Platform>();

            // Add local platforms first (unless user explicitly deleted them)
            localPlatforms.forEach((p) => {
              if (p && p.id && !deletedIds.includes(p.id)) {
                platformMap.set(p.id, p);
              }
            });

            // Merge with backend platforms (unless deleted)
            platData.forEach((p: Platform) => {
              if (p && p.id && !deletedIds.includes(p.id)) {
                platformMap.set(p.id, { ...(platformMap.get(p.id) || {}), ...p });
              }
            });

            const merged = Array.from(platformMap.values());
            if (merged.length > 0 || (localPlatforms.length === 0 && platData.length === 0)) {
              setPlatforms(merged);
              localStorage.setItem('gb_study_platforms', JSON.stringify(merged));
            }

            // If local has platforms that the backend does not have yet, push them to backend
            if (platData.length < merged.length) {
              const missingOnBackend = merged.filter(
                (lp) => !platData.some((bp: Platform) => bp.id === lp.id)
              );
              for (const missing of missingOnBackend) {
                fetch('/api/platforms', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(missing),
                }).catch(() => {});
              }
            }
          }
        }
      }

      if (banRes && banRes.ok) {
        const contentType = banRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const banData = await banRes.json();
          if (Array.isArray(banData)) {
            const localRaw = localStorage.getItem('gb_study_banners');
            let localBanners: BannerSlide[] = [];
            try {
              if (localRaw) localBanners = JSON.parse(localRaw);
            } catch (e) {}

            let deletedBannerIds: string[] = [];
            try {
              const dRaw = localStorage.getItem('gb_study_deleted_banners');
              if (dRaw) deletedBannerIds = JSON.parse(dRaw);
            } catch (e) {}

            const bannerMap = new Map<string, BannerSlide>();
            localBanners.forEach((b) => {
              if (b && b.id && !deletedBannerIds.includes(b.id)) {
                bannerMap.set(b.id, b);
              }
            });
            banData.forEach((b: BannerSlide) => {
              if (b && b.id && !deletedBannerIds.includes(b.id)) {
                bannerMap.set(b.id, { ...(bannerMap.get(b.id) || {}), ...b });
              }
            });

            const mergedBanners = Array.from(bannerMap.values());
            if (mergedBanners.length > 0 || (localBanners.length === 0 && banData.length === 0)) {
              setBanners(mergedBanners);
              localStorage.setItem('gb_study_banners', JSON.stringify(mergedBanners));
            }

            if (banData.length < mergedBanners.length) {
              const missingOnBackend = mergedBanners.filter(
                (lb) => !banData.some((bb: BannerSlide) => bb.id === lb.id)
              );
              for (const missing of missingOnBackend) {
                fetch('/api/banners', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(missing),
                }).catch(() => {});
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Backend fetch fallback:', err);
    }
  };

  useEffect(() => {
    // 1. Live Real-Time Multi-Device Cloud Synchronization via Firestore
    // When the Admin adds or updates on any device, it instantly appears on all students' devices worldwide!
    const unsubPlatforms = subscribeToPlatforms((cloudPlatforms) => {
      if (Array.isArray(cloudPlatforms)) {
        setPlatforms(cloudPlatforms);
      }
    });

    const unsubBanners = subscribeToBanners((cloudBanners) => {
      if (Array.isArray(cloudBanners)) {
        setBanners(cloudBanners);
      }
    });

    // 2. Local backend fallback sync
    refreshBackendData();
    const syncInterval = setInterval(refreshBackendData, 10000);

    return () => {
      unsubPlatforms();
      unsubBanners();
      clearInterval(syncInterval);
    };
  }, []);

  // Save profile changes to localStorage
  useEffect(() => {
    localStorage.setItem('gb_study_profile', JSON.stringify(profile));
  }, [profile]);

  // Active time incrementer
  useEffect(() => {
    const interval = setInterval(() => {
      setProfile((prev) => ({
        ...prev,
        activeMinutes: prev.activeMinutes + 1,
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle 10-tap secret admin trigger on the GB STUDY icon
  const handleIconTap = () => {
    const nextCount = iconTapCount + 1;
    setIconTapCount(nextCount);

    if (tapResetTimerRef.current) {
      clearTimeout(tapResetTimerRef.current);
    }

    if (nextCount >= 10) {
      setIconTapCount(0);
      setShowAdminLogin(true);
    } else {
      // Reset if no tap within 3.5 seconds
      tapResetTimerRef.current = setTimeout(() => {
        setIconTapCount(0);
      }, 3500);
    }
  };

  // Direct instant save/update platform to local state & Cloud Database
  const handleSavePlatformDirect = (platformData: Platform) => {
    // 1. Save to Cloud Firestore (syncs to ALL users and devices worldwide in real-time)
    savePlatformToCloud(platformData).catch((err) => {
      console.warn('Cloud platform save note:', err);
    });

    // 2. Immediately update local React state and localStorage (zero latency)
    setPlatforms((prev) => {
      const index = prev.findIndex((p) => p.id === platformData.id);
      let updated: Platform[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = { ...updated[index], ...platformData };
      } else {
        updated = [platformData, ...prev];
      }
      localStorage.setItem('gb_study_platforms', JSON.stringify(updated));
      return updated;
    });

    // Remove from deleted list if re-added
    try {
      const deletedRaw = localStorage.getItem('gb_study_deleted_platforms');
      if (deletedRaw) {
        const deletedIds: string[] = JSON.parse(deletedRaw);
        const filtered = deletedIds.filter((id) => id !== platformData.id);
        localStorage.setItem('gb_study_deleted_platforms', JSON.stringify(filtered));
      }
    } catch (e) {}

    // 3. Sync to local backend server
    fetch('/api/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(platformData),
    }).catch(() => {});
  };

  // Direct instant delete platform from Cloud & local state (0ms delay!)
  const handleDeletePlatformDirect = (id: string) => {
    // 1. Delete from Cloud Firestore for all users
    deletePlatformFromCloud(id).catch((err) => {
      console.warn('Cloud platform delete note:', err);
    });

    // 2. Delete from local state and cache
    setPlatforms((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('gb_study_platforms', JSON.stringify(updated));
      return updated;
    });

    // 3. Mark as deleted so auto-sync never brings it back
    try {
      const deletedRaw = localStorage.getItem('gb_study_deleted_platforms');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('gb_study_deleted_platforms', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    // 4. Delete on local backend
    fetch(`/api/platforms/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Direct instant save/update banner to local state & Cloud Database
  const handleSaveBannerDirect = (bannerData: BannerSlide) => {
    // 1. Save to Cloud Firestore
    saveBannerToCloud(bannerData).catch((err) => {
      console.warn('Cloud banner save note:', err);
    });

    // 2. Update local state
    setBanners((prev) => {
      const index = prev.findIndex((b) => b.id === bannerData.id);
      let updated: BannerSlide[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = { ...updated[index], ...bannerData };
      } else {
        updated = [...prev, bannerData];
      }
      localStorage.setItem('gb_study_banners', JSON.stringify(updated));
      return updated;
    });

    try {
      const deletedRaw = localStorage.getItem('gb_study_deleted_banners');
      if (deletedRaw) {
        const deletedIds: string[] = JSON.parse(deletedRaw);
        const filtered = deletedIds.filter((id) => id !== bannerData.id);
        localStorage.setItem('gb_study_deleted_banners', JSON.stringify(filtered));
      }
    } catch (e) {}

    fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bannerData),
    }).catch(() => {});
  };

  // Direct instant delete banner from Cloud & local state (0ms delay!)
  const handleDeleteBannerDirect = (id: string) => {
    deleteBannerFromCloud(id).catch((err) => {
      console.warn('Cloud banner delete note:', err);
    });

    setBanners((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem('gb_study_banners', JSON.stringify(updated));
      return updated;
    });

    try {
      const deletedRaw = localStorage.getItem('gb_study_deleted_banners');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('gb_study_deleted_banners', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    fetch(`/api/banners/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // When initial splash completes
  const handleInitialSplashDone = () => {
    setShowSplash(false);
    if (!profile.hasSeenWelcome) {
      setShowWelcome(true);
    } else if (!profile.hasSeenTelegram) {
      setShowTelegram(true);
    }
  };

  // Welcome modal submit
  const handleSaveStudentName = (name: string) => {
    setProfile((prev) => ({
      ...prev,
      name,
      hasSeenWelcome: true,
    }));
    setShowWelcome(false);
    setShowTelegram(true);
  };

  // Telegram modal dismiss
  const handleCloseTelegram = () => {
    setProfile((prev) => ({
      ...prev,
      hasSeenTelegram: true,
    }));
    setShowTelegram(false);
  };

  // FAST INSTANT PLATFORM OPENING (Zero delay, No iframe bar!)
  const handleSelectPlatform = (platform: Platform) => {
    const targetUrl = platform.url?.trim();
    const mode = platform.openMode || 'new_tab';

    if (targetUrl) {
      // Fast direct open
      if (mode === 'same_tab') {
        window.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }
    } else {
      // Native Batches View (Classroom)
      setSelectedPlatform(platform);
      setActiveScreen('batches');
    }
  };

  // Backing out from BatchesView triggers the glowing aura splash transition
  const handleBackFromBatches = () => {
    setIsTransitionSplash(true);
  };

  const handleTransitionSplashDone = () => {
    setIsTransitionSplash(false);
    setActiveScreen('main');
    setSelectedPlatform(null);
  };

  // Toggle batch enrollment
  const handleToggleEnroll = (batchId: string) => {
    setProfile((prev) => {
      const isEnrolled = prev.enrolledBatches.includes(batchId);
      return {
        ...prev,
        enrolledBatches: isEnrolled
          ? prev.enrolledBatches.filter((id) => id !== batchId)
          : [...prev.enrolledBatches, batchId],
      };
    });
  };

  // Filter platforms by live / upcoming and search query
  const livePlatforms = platforms.filter((p) => p.tabPlacement !== 'upcoming');
  const upcomingPlatforms = platforms.filter((p) => p.tabPlacement === 'upcoming');

  const filteredLivePlatforms = livePlatforms.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#070a12] text-white select-none relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Initial Splash Screens */}
      {showSplash && (
        <SplashScreens onComplete={handleInitialSplashDone} />
      )}

      {/* 2. Transition Splash Screen */}
      {isTransitionSplash && (
        <SplashScreens onComplete={handleTransitionSplashDone} isTransitionOnly={true} />
      )}

      {/* 3. Welcome Student Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onSave={handleSaveStudentName}
      />

      {/* 4. Join Telegram Modal (with https://t.me/GBFreestudy) */}
      <TelegramModal
        isOpen={showTelegram}
        onClose={handleCloseTelegram}
      />

      {/* 5. Student Analytics Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        studentName={profile.name}
        activeMinutes={profile.activeMinutes}
        onClose={() => setShowProfileModal(false)}
        onUpdateName={(newName) => setProfile((p) => ({ ...p, name: newName }))}
      />

      {/* 6. Secret Admin Login Modal (Triggered by 10 taps) */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          setShowAdminDashboard(true);
        }}
      />

      {/* 7. Full Admin Dashboard (with instant deletion and Vercel persistence) */}
      <AdminDashboard
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
        platforms={platforms}
        banners={banners}
        onRefreshData={refreshBackendData}
        onSavePlatformDirect={handleSavePlatformDirect}
        onSaveBannerDirect={handleSaveBannerDirect}
        onDeletePlatformDirect={handleDeletePlatformDirect}
        onDeleteBannerDirect={handleDeleteBannerDirect}
      />

      {/* Screen Routing */}
      {activeScreen === 'batches' && selectedPlatform ? (
        <BatchesView
          platform={selectedPlatform}
          onBack={handleBackFromBatches}
          enrolledBatches={profile.enrolledBatches}
          onToggleEnroll={handleToggleEnroll}
        />
      ) : (
        <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-6">
          {/* Top Header */}
          <header className="sticky top-0 z-30 px-4 py-3 bg-[#070a12]/90 backdrop-blur-md flex items-center justify-between border-b border-slate-900/60">
            {/* Left: App icon with 10-tap secret listener + Title & Author */}
            <div className="flex items-center gap-3">
              <div
                onClick={handleIconTap}
                className="w-10 h-10 rounded-xl p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 shadow-md shadow-cyan-500/20 overflow-hidden cursor-pointer active:scale-95 transition-transform relative group shrink-0"
                title="GB STUDY - Tap 10x for Admin"
              >
                <img
                  src="/app-icon.png"
                  alt="GB STUDY"
                  className="w-full h-full object-cover rounded-[10px]"
                />

                {/* Secret tap feedback indicator (starts showing after 4 taps) */}
                {iconTapCount >= 4 && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center rounded-[10px] text-[10px] font-black text-cyan-300">
                    {iconTapCount}/10
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight flex items-center gap-1 leading-tight">
                  <span className="text-white">GB STUDY</span>
                </h1>
                <span className="text-[11px] font-extrabold tracking-wider text-cyan-400 uppercase block">
                  SARVOTTAM YADAV
                </span>
              </div>
            </div>

            {/* Right: User Profile Icon */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 rounded-xl bg-[#131a29] border border-slate-700/80 hover:border-cyan-500/60 flex items-center justify-center text-slate-300 hover:text-cyan-400 shadow-md active:scale-95 transition-all cursor-pointer"
              aria-label="Open profile"
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </header>

          {/* Main Tab Content */}
          {activeTab === 'platforms' && (
            <main className="flex-1 space-y-4">
              {/* Carousel Banners (only if any banner is added by Admin) */}
              {banners.length > 0 && (
                <BannerCarousel
                  banners={banners}
                  onBannerAction={(banner) => {
                    if (banner.actionType === 'telegram' || banner.actionUrl?.includes('t.me')) {
                      window.open(banner.actionUrl || 'https://t.me/GBFreestudy', '_blank');
                    } else if (banner.actionUrl) {
                      window.open(banner.actionUrl, '_blank');
                    }
                  }}
                />
              )}

              {/* Platform Cards List (Live Platforms) */}
              <PlatformList
                platforms={filteredLivePlatforms}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectPlatform={handleSelectPlatform}
              />
            </main>
          )}

          {activeTab === 'gb_ai' && (
            <main className="flex-1">
              <GBAiView />
            </main>
          )}

          {activeTab === 'upcoming' && (
            <main className="flex-1">
              <UpcomingView
                upcomingPlatforms={upcomingPlatforms}
                onSelectPlatform={handleSelectPlatform}
              />
            </main>
          )}

          {/* Bottom Dock Navigation: Platforms | GB AI | Upcoming */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}
    </div>
  );
}
