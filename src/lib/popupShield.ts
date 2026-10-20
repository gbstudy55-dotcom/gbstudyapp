/**
 * GB STUDY Popup & Redirect Shield
 * 
 * Strict protection: ONLY https://t.me/GBFreestudy (official GB STUDY channel) is permitted as a popup.
 * All other popups (ads, unauthorized Telegram channels, WhatsApp groups, external popups) are strictly blocked.
 * Normal in-app platform navigation is preserved.
 */

export const ALLOWED_OFFICIAL_TELEGRAM = 'https://t.me/GBFreestudy';
export const ALLOWED_HANDLE = 'gbfreestudy';

// Event name for UI notifications when a popup is blocked
export const BLOCKED_POPUP_EVENT = 'gbstudy:blocked_popup';

export type BlockedPopupType = 'telegram' | 'whatsapp' | 'other_popup';

export interface BlockedPopupDetail {
  url: string;
  type: BlockedPopupType;
  timestamp: number;
}

// Temporary authorization store for intentional user platform launches
let authorizedUrl: string | null = null;
let authorizedExpiry = 0;

export function authorizeUrlLaunch(url: string) {
  if (!url) return;
  authorizedUrl = url.trim().toLowerCase();
  authorizedExpiry = Date.now() + 3500;
}

export function isAuthorizedUrlLaunch(url: string): boolean {
  if (!authorizedUrl || Date.now() > authorizedExpiry) {
    return false;
  }
  const clean = url.trim().toLowerCase();
  return clean === authorizedUrl || clean.startsWith(authorizedUrl);
}

/**
 * Checks if a given URL is the official GB STUDY Telegram channel.
 */
export function isAllowedTelegram(url: string, dynamicAllowedUrl?: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();

  // 1. Check official GB STUDY handle across all common telegram formats
  if (
    lower.includes('t.me/gbfreestudy') ||
    lower.includes('telegram.me/gbfreestudy') ||
    lower.includes('telegram.dog/gbfreestudy') ||
    lower.includes('domain=gbfreestudy')
  ) {
    return true;
  }

  // 2. Check dynamic configured URL if provided from admin config
  if (dynamicAllowedUrl) {
    const cleanDynamic = dynamicAllowedUrl.trim().toLowerCase();
    if (cleanDynamic && (lower === cleanDynamic || lower.startsWith(cleanDynamic))) {
      return true;
    }
    const match = cleanDynamic.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_+]+)/i);
    if (match && match[1]) {
      const handle = match[1].toLowerCase();
      if (
        lower.includes(`t.me/${handle}`) ||
        lower.includes(`telegram.me/${handle}`) ||
        lower.includes(`domain=${handle}`)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines the category of a blocked popup for helpful notification
 */
export function getBlockedType(url: string): BlockedPopupType {
  const lower = (url || '').trim().toLowerCase();
  if (
    lower.includes('t.me') || 
    lower.includes('telegram.me') || 
    lower.includes('telegram.org') ||
    lower.startsWith('tg:')
  ) {
    return 'telegram';
  }
  if (
    lower.includes('wa.me') || 
    lower.includes('whatsapp.com') || 
    lower.startsWith('whatsapp:')
  ) {
    return 'whatsapp';
  }
  return 'other_popup';
}

/**
 * Checks if a URL should be blocked from opening as a popup.
 * ONLY https://t.me/GBFreestudy and authorized user launches are permitted.
 */
export function inspectUrlForShield(
  url: string,
  dynamicAllowedUrl?: string
): { blocked: boolean; type: BlockedPopupType | null } {
  if (!url) return { blocked: false, type: null };
  const lower = url.trim().toLowerCase();

  // 1. Official GB STUDY Telegram is always allowed
  if (isAllowedTelegram(url, dynamicAllowedUrl)) {
    return { blocked: false, type: null };
  }

  // 2. Explicitly authorized platform launch by the user is allowed
  if (isAuthorizedUrlLaunch(url)) {
    return { blocked: false, type: null };
  }

  // 3. Unauthorized Telegram channels -> blocked
  const isTelegram =
    lower.includes('t.me/') ||
    lower.includes('telegram.me/') ||
    lower.includes('telegram.dog/') ||
    lower.includes('web.telegram.org') ||
    lower.startsWith('tg:') ||
    lower.includes('telegram.org/join');

  if (isTelegram) {
    return { blocked: true, type: 'telegram' };
  }

  // 4. WhatsApp channels/groups -> blocked
  const isWhatsapp =
    lower.includes('wa.me/') ||
    lower.includes('api.whatsapp.com') ||
    lower.includes('chat.whatsapp.com') ||
    lower.includes('web.whatsapp.com') ||
    lower.includes('whatsapp.com/channel') ||
    lower.includes('whatsapp.com/send') ||
    lower.includes('whatsapp.com/join') ||
    lower.startsWith('whatsapp:');

  if (isWhatsapp) {
    return { blocked: true, type: 'whatsapp' };
  }

  return { blocked: false, type: null };
}

/**
 * Dispatches an event so the app UI can display a toast notification
 */
export function notifyBlockedPopup(url: string, type: BlockedPopupType) {
  if (typeof window === 'undefined') return;
  try {
    const event = new CustomEvent<BlockedPopupDetail>(BLOCKED_POPUP_EVENT, {
      detail: { url, type, timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  } catch {
    // ignore
  }
}

let isShieldInstalled = false;

/**
 * Initializes global popup protection:
 * Blocks ALL popups except https://t.me/GBFreestudy and authorized user launches.
 */
export function initPopupShield(getConfiguredTelegramUrl?: () => string | undefined) {
  if (typeof window === 'undefined' || isShieldInstalled) return;
  isShieldInstalled = true;

  const getAllowed = () => {
    return getConfiguredTelegramUrl ? getConfiguredTelegramUrl() : ALLOWED_OFFICIAL_TELEGRAM;
  };

  // 1. Intercept window.open globally - blocks all unauthorized popups
  const originalWindowOpen = window.open;
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    const urlString = url ? url.toString() : '';

    // Allow official GB STUDY Telegram
    if (isAllowedTelegram(urlString, getAllowed())) {
      return originalWindowOpen.call(window, url, target, features);
    }

    // Allow explicit user-authorized platform open
    if (isAuthorizedUrlLaunch(urlString)) {
      return originalWindowOpen.call(window, url, target, features);
    }

    // BLOCK ALL OTHER POPUPS!
    const blockedType = getBlockedType(urlString);
    console.warn(`[GB Shield] Blocked unauthorized popup: ${urlString || 'about:blank'}`);
    notifyBlockedPopup(urlString || 'about:blank', blockedType);
    return null;
  };

  // 2. Intercept document link clicks (capture phase) for target="_blank" popups
  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href) {
        // If it tries to open a popup window
        const isBlank = target.target === '_blank' || target.getAttribute('target') === '_blank';
        if (isBlank) {
          // Allow official Telegram
          if (isAllowedTelegram(target.href, getAllowed())) {
            return;
          }
          // Allow authorized platform launch
          if (isAuthorizedUrlLaunch(target.href)) {
            return;
          }
          // If it's another Telegram, WhatsApp, or random popup ad link
          const inspection = inspectUrlForShield(target.href, getAllowed());
          if (inspection.blocked) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.warn(`[GB Shield] Blocked unauthorized ${inspection.type} popup click: ${target.href}`);
            notifyBlockedPopup(target.href, inspection.type || 'other_popup');
            return false;
          }
        }
      }
    },
    true
  );

  // 3. Listen for postMessage from iframes that might try to trigger popups
  window.addEventListener('message', (event) => {
    try {
      const data = event.data;
      const urlCandidate = typeof data === 'string' ? data : (data && typeof data === 'object' ? data.url : null);
      if (urlCandidate && typeof urlCandidate === 'string') {
        const inspection = inspectUrlForShield(urlCandidate, getAllowed());
        if (inspection.blocked) {
          notifyBlockedPopup(urlCandidate, inspection.type || 'other_popup');
        }
      }
    } catch {
      // ignore
    }
  });

  console.info('[GB Shield] Popup Shield active: Only https://t.me/GBFreestudy is permitted. All other popups blocked.');
}
