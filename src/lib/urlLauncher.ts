import { OpenMode } from '../types';
import { inspectUrlForShield, notifyBlockedPopup, authorizeUrlLaunch } from './popupShield';

/**
 * Robust URL launcher supporting all 4 modes:
 * 1. 'internal': Opens inside the app's full-screen InAppBrowser
 * 2. 'external': Fully working external browser / system app launch
 * 3. 'new_tab': Opens in a fresh browser tab
 * 4. 'same_tab': Navigates current tab to the URL
 */
export function launchUrl(
  url: string,
  mode: OpenMode = 'internal',
  onOpenInternal?: () => void
): void {
  if (!url) return;
  const cleanUrl = url.trim();

  // Shield check: Block unauthorized Telegram and WhatsApp URLs
  const inspection = inspectUrlForShield(cleanUrl);
  if (inspection.blocked && inspection.type) {
    console.warn(`[Shield] Blocked ${inspection.type} navigation attempt: ${cleanUrl}`);
    notifyBlockedPopup(cleanUrl, inspection.type);
    return;
  }

  // Internal mode -> InAppBrowser
  if (mode === 'internal') {
    if (onOpenInternal) {
      onOpenInternal();
      return;
    }
  }

  // Same tab mode -> Direct navigation
  if (mode === 'same_tab') {
    try {
      window.location.assign(cleanUrl);
    } catch {
      window.location.href = cleanUrl;
    }
    return;
  }

  // External mode -> Direct system/external browser
  if (mode === 'external') {
    openExternalUrl(cleanUrl);
    return;
  }

  // New tab mode -> New window/tab
  if (mode === 'new_tab') {
    openNewTabUrl(cleanUrl);
    return;
  }

  // Default fallback if unknown mode
  if (onOpenInternal) {
    onOpenInternal();
  } else {
    openExternalUrl(cleanUrl);
  }
}

/**
 * Reliable External URL launcher designed for mobile web, Android WebView, PWA & desktop
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  const cleanUrl = url.trim();

  // Shield check: Block unauthorized Telegram and WhatsApp URLs
  const inspection = inspectUrlForShield(cleanUrl);
  if (inspection.blocked && inspection.type) {
    console.warn(`[Shield] Blocked ${inspection.type} external launch: ${cleanUrl}`);
    notifyBlockedPopup(cleanUrl, inspection.type);
    return;
  }

  authorizeUrlLaunch(cleanUrl);

  // 1. Try direct window.open during the user click event (fastest & standard)
  try {
    const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch (err) {
    console.warn('window.open failed, trying anchor:', err);
  }

  // 2. Fallback to anchor click if window.open was popup-blocked
  try {
    const link = document.createElement('a');
    link.href = cleanUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer external';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 50);
  } catch {
    window.location.href = cleanUrl;
  }
}

/**
 * Standard new tab launcher
 */
export function openNewTabUrl(url: string): void {
  if (!url) return;
  const cleanUrl = url.trim();

  // Shield check: Block unauthorized Telegram and WhatsApp URLs
  const inspection = inspectUrlForShield(cleanUrl);
  if (inspection.blocked && inspection.type) {
    console.warn(`[Shield] Blocked ${inspection.type} new tab launch: ${cleanUrl}`);
    notifyBlockedPopup(cleanUrl, inspection.type);
    return;
  }

  authorizeUrlLaunch(cleanUrl);

  try {
    const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch {}

  try {
    const link = document.createElement('a');
    link.href = cleanUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 50);
  } catch {
    window.location.href = cleanUrl;
  }
}

export interface OpenModeOption {
  value: OpenMode;
  label: string;
  badgeLabel: string;
  desc: string;
  badgeClass: string;
  activeBtnClass: string;
}

export const OPEN_MODE_OPTIONS: OpenModeOption[] = [
  {
    value: 'internal',
    label: 'In-App Webview',
    badgeLabel: 'In-App',
    desc: 'App ke andar 100% full screen khulega',
    badgeClass: 'bg-purple-950/80 text-purple-300 border border-purple-700/50',
    activeBtnClass: 'bg-[#2a1b3d] border-purple-500 text-purple-300 font-bold shadow-lg shadow-purple-950/50',
  },
  {
    value: 'external',
    label: 'External Browser',
    badgeLabel: 'External',
    desc: 'Direct phone ke default browser me khulega (Sabse best for blocked sites)',
    badgeClass: 'bg-sky-950/80 text-sky-300 border border-sky-700/50',
    activeBtnClass: 'bg-[#102a3d] border-sky-400 text-sky-300 font-bold shadow-lg shadow-sky-950/50',
  },
  {
    value: 'new_tab',
    label: 'New Tab',
    badgeLabel: 'New Tab',
    desc: 'Naye browser tab me khulega',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50',
    activeBtnClass: 'bg-[#0f3323] border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-950/50',
  },
  {
    value: 'same_tab',
    label: 'Same Tab',
    badgeLabel: 'Same Tab',
    desc: 'Isi window/tab me page open hoga',
    badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-700/50',
    activeBtnClass: 'bg-[#38260b] border-amber-400 text-amber-300 font-bold shadow-lg shadow-amber-950/50',
  },
];
