import React, { useState, useEffect, useRef } from 'react';
import { 
  testFirestoreConnection 
} from './lib/firebase';
import { Platform, AppConfig, Banner } from './types';
import { VIDEO_PLATFORMS } from './data/videoPlatforms';
import { 
  subscribePlatforms, subscribeConfig, subscribeBanners, 
  DEFAULT_CONFIG, INITIAL_BANNERS,
  getCachedPlatforms, getCachedBanners, getCachedConfig
} from './services/dbService';

import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { PlatformCard } from './components/PlatformCard';
import { BottomNav, VideoTab } from './components/BottomNav';
import { ShieldAlert } from 'lucide-react';
import { TelegramModal } from './components/TelegramModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminPinModal } from './components/AdminPinModal';
import { InAppBrowser } from './components/InAppBrowser';
import { BannerCarousel } from './components/BannerCarousel';
import { launchUrl } from './lib/urlLauncher';
import { 
  initPopupShield, 
  BLOCKED_POPUP_EVENT, 
  BlockedPopupDetail, 
  ALLOWED_OFFICIAL_TELEGRAM 
} from './lib/popupShield';

export default function App() {
  // Splash Screen State (shown only once per session for instant load)
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('gb_splash_seen');
    } catch {
      return false;
    }
  });

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem('gb_splash_seen', 'true');
    } catch {}
    setShowSplash(false);
  };

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<VideoTab>('platforms');

  // Platforms, Banners & App Config state - 0ms instant cached load + live real-time sync
  const [platforms, setPlatforms] = useState<Platform[]>(getCachedPlatforms);
  const [banners, setBanners] = useState<Banner[]>(getCachedBanners);
  const [config, setConfig] = useState<AppConfig>(getCachedConfig);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Telegram modal state
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

  // In-App Browser state
  const [activeBrowserPlatform, setActiveBrowserPlatform] = useState<Platform | null>(null);

  // Admin state & PIN modal - persists within session
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('gb_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Blocked unauthorized Telegram/WhatsApp popup toast state
  const [blockedPopupDetail, setBlockedPopupDetail] = useState<BlockedPopupDetail | null>(null);

  // Secret 10-click tap counter for admin access
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Popup Shield: strictly blocks all unauthorized Telegram & WhatsApp popups
  useEffect(() => {
    initPopupShield(() => config.telegramUrl || ALLOWED_OFFICIAL_TELEGRAM);

    const handleBlockedPopup = (e: Event) => {
      const customEvent = e as CustomEvent<BlockedPopupDetail>;
      if (customEvent.detail) {
        setBlockedPopupDetail(customEvent.detail);
        setTimeout(() => {
          setBlockedPopupDetail((prev) =>
            prev?.timestamp === customEvent.detail.timestamp ? null : prev
          );
        }, 4000);
      }
    };

    window.addEventListener(BLOCKED_POPUP_EVENT, handleBlockedPopup);
    return () => {
      window.removeEventListener(BLOCKED_POPUP_EVENT, handleBlockedPopup);
    };
  }, [config.telegramUrl]);

  // Test Firestore connection on load safely
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
  }, []);

  // Subscribe to real-time platforms, banners, and config
  useEffect(() => {
    const unsubPlatforms = subscribePlatforms((data) => {
      if (data && data.length > 0) {
        setPlatforms(data);
      }
    });

    const unsubBanners = subscribeBanners((data) => {
      if (data && data.length > 0) {
        setBanners(data);
      }
    });

    const unsubConfig = subscribeConfig((data) => {
      if (data) {
        setConfig(data);
      }
    });

    return () => {
      unsubPlatforms();
      unsubBanners();
      unsubConfig();
    };
  }, []);

  // Show Telegram popup once after splash screen
  useEffect(() => {
    if (!showSplash) {
      const dismissed = sessionStorage.getItem('gb_telegram_popup_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setTelegramModalOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [showSplash]);

  const handleDismissTelegram = () => {
    sessionStorage.setItem('gb_telegram_popup_dismissed', 'true');
    setTelegramModalOpen(false);
  };

  // Secret 10-click gesture on GB STUDY logo to trigger admin password prompt
  const handleLogoTap = () => {
    if (adminUnlocked) {
      setAdminPanelOpen(true);
      return;
    }

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current >= 10) {
      tapCountRef.current = 0;
      setAdminPinModalOpen(true);
    } else {
      // Reset if user stops clicking for more than 4 seconds
      tapTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 4000);
    }
  };

  // When PIN (GBADMIN2026) is successfully entered
  const handlePinSuccess = () => {
    try {
      sessionStorage.setItem('gb_admin_unlocked', 'true');
    } catch {}
    setAdminUnlocked(true);
    setShowToast(true);
    setAdminPanelOpen(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Sign out admin
  const handleAdminSignOut = () => {
    try {
      sessionStorage.removeItem('gb_admin_unlocked');
    } catch {}
    setAdminUnlocked(false);
    setAdminPanelOpen(false);
  };

  // Open platform based on admin's configured openMode:
  // 'internal' (In-App full screen), 'external' (System/Default browser), 'new_tab' (New tab), 'same_tab' (Same tab)
  const handleOpenPlatform = (platform: Platform) => {
    if (!platform.url) return;
    const mode = platform.openMode || 'internal';
    launchUrl(platform.url, mode, () => {
      setActiveBrowserPlatform(platform);
    });
  };

  // Open banner URL based on its configured OpenMode
  const handleOpenBanner = (banner: Banner) => {
    const url = banner.actionUrl || config.telegramUrl || 'https://t.me/GBFreestudy';
    const mode = banner.openMode || (url.includes('t.me') ? 'external' : 'internal');
    launchUrl(url, mode, () => {
      setActiveBrowserPlatform({
        id: banner.id,
        name: banner.title || 'GB STUDY Special Batch',
        url,
        description: 'Promotional Banner Content',
        status: 'active',
        order: 0,
        openMode: 'internal',
      });
    });
  };

  // Filtered platforms
  const activePlatforms = platforms.filter((p) => p.status === 'active');
  const upcomingPlatforms = platforms.filter((p) => p.status === 'upcoming');

  const displayedPlatforms = activePlatforms.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#090e17] text-white flex flex-col font-sans select-none antialiased">
      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* Floating Toast notification: "Admin unlocked" */}
      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#162231] text-white text-xs font-semibold px-4 py-2 rounded-full border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top duration-200">
          Admin option unlocked
        </div>
      )}

      {/* Floating Notification: Blocked Unauthorized Telegram / WhatsApp Popup */}
      {blockedPopupDetail && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[92%] bg-[#1a080b] text-white text-xs font-semibold px-4 py-3 rounded-2xl border border-rose-600/70 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-800/80 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-rose-300 text-xs">
                {blockedPopupDetail.type === 'whatsapp' 
                  ? 'WhatsApp Popup Blocked' 
                  : blockedPopupDetail.type === 'telegram'
                  ? 'Other Telegram Blocked'
                  : 'Unauthorized Popup Blocked'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold uppercase tracking-wider border border-rose-800/60">
                Blocked
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              Sirf official GB STUDY Telegram (t.me/GBFreestudy) popup allowed hai.
            </p>
          </div>
        </div>
      )}

      {/* Header: Admin button is hidden until unlocked via 10-clicks on logo */}
      <Header
        onLogoClick={handleLogoTap}
        adminUnlocked={adminUnlocked}
        onOpenAdmin={() => setAdminPanelOpen(true)}
        onOpenTelegram={() => setTelegramModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-24 space-y-4">
        {activeTab === 'platforms' ? (
          <>
            {/* Multiple Banners Carousel */}
            <BannerCarousel
              banners={banners}
              onOpenBanner={handleOpenBanner}
            />

            {/* Pill Badge: GB STUDY PLATFORM HUB */}
            <div className="flex justify-center pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0c1f2b] border border-[#164e63] text-xs font-bold text-[#38bdf8] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
                <span>GB STUDY PLATFORM HUB</span>
              </div>
            </div>

            {/* Title: Choose Your Platform */}
            <h2 className="text-2xl font-extrabold text-center text-white tracking-tight">
              <span>Choose Your </span>
              <span className="text-[#38bdf8]">Platform</span>
            </h2>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search platforms, notes, features.."
                className="w-full px-4 py-3 rounded-xl bg-[#0c1520] border border-[#172535] text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition shadow-inner"
              />
            </div>

            {/* Platforms List with 1cm top & bottom padding and full-height icons */}
            <div className="space-y-3.5">
              {displayedPlatforms.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  onOpen={handleOpenPlatform}
                />
              ))}

              {displayedPlatforms.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching platforms found.
                </div>
              )}
            </div>
          </>
        ) : (
          /* UPCOMING TAB */
          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Upcoming Releases
            </h2>

            {upcomingPlatforms.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#1e2f42] p-8 text-center bg-[#0c1520]/60 my-4">
                <h3 className="text-sm font-bold text-white mb-1">
                  No Upcoming Releases
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upcoming platforms added by Admin will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcomingPlatforms.map((platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    onOpen={handleOpenPlatform}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Stylish Dark Telegram Popup Modal with GB STUDY Icon */}
      <TelegramModal
        isOpen={telegramModalOpen}
        onClose={handleDismissTelegram}
        telegramUrl={config.telegramUrl}
      />

      {/* Admin PIN Verification Modal (Requires GBADMIN2026) */}
      <AdminPinModal
        isOpen={adminPinModalOpen}
        onClose={() => setAdminPinModalOpen(false)}
        onSuccess={handlePinSuccess}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        platforms={platforms}
        banners={banners}
        config={config}
        onSignOut={handleAdminSignOut}
      />

      {/* In-App Browser Modal - Absolutely NO URL and NO external browser button */}
      <InAppBrowser
        platform={activeBrowserPlatform}
        onClose={() => setActiveBrowserPlatform(null)}
      />
    </div>
  );
}
