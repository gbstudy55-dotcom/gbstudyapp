/**
 * GB STUDY Popup & Redirect Shield
 * 
 * Strict protection against unauthorized Telegram & WhatsApp popups/redirects.
 * ONLY https://t.me/GBFreestudy (official GB STUDY channel) is permitted.
 * All other Telegram channels/groups and all WhatsApp groups/chats are strictly blocked.
 */

export const ALLOWED_OFFICIAL_TELEGRAM = 'https://t.me/GBFreestudy';
export const ALLOWED_HANDLE = 'gbfreestudy';

// Event name for UI notifications when a popup/link is blocked
export const BLOCKED_POPUP_EVENT = 'gbstudy:blocked_popup';

export interface BlockedPopupDetail {
  url: string;
  type: 'telegram' | 'whatsapp';
  timestamp: number;
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
    // Also extract handle from dynamic config
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
 * Checks if a URL is Telegram or WhatsApp, and whether it should be blocked.
 * Returns { blocked: boolean, type: 'telegram' | 'whatsapp' | null }
 */
export function inspectUrlForShield(
  url: string,
  dynamicAllowedUrl?: string
): { blocked: boolean; type: 'telegram' | 'whatsapp' | null } {
  if (!url) return { blocked: false, type: null };
  const lower = url.trim().toLowerCase();

  // If it's the allowed official Telegram, never block
  if (isAllowedTelegram(url, dynamicAllowedUrl)) {
    return { blocked: false, type: null };
  }

  // 1. Check for Telegram patterns
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

  // 2. Check for WhatsApp patterns
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
export function notifyBlockedPopup(url: string, type: 'telegram' | 'whatsapp') {
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
 * Initializes global protection on window.open, link clicks, and popups.
 */
export function initPopupShield(getConfiguredTelegramUrl?: () => string | undefined) {
  if (typeof window === 'undefined' || isShieldInstalled) return;
  isShieldInstalled = true;

  const getAllowed = () => {
    return getConfiguredTelegramUrl ? getConfiguredTelegramUrl() : ALLOWED_OFFICIAL_TELEGRAM;
  };

  // 1. Intercept window.open globally
  const originalWindowOpen = window.open;
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    const urlString = url ? url.toString() : '';
    if (urlString) {
      const inspection = inspectUrlForShield(urlString, getAllowed());
      if (inspection.blocked && inspection.type) {
        console.warn(`[GB Shield] Blocked unauthorized ${inspection.type} popup: ${urlString}`);
        notifyBlockedPopup(urlString, inspection.type);
        return null;
      }
    }
    return originalWindowOpen.call(window, url, target, features);
  };

  // 2. Intercept document link clicks (capture phase)
  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href) {
        const inspection = inspectUrlForShield(target.href, getAllowed());
        if (inspection.blocked && inspection.type) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn(`[GB Shield] Blocked unauthorized ${inspection.type} link click: ${target.href}`);
          notifyBlockedPopup(target.href, inspection.type);
          return false;
        }
      }
    },
    true
  );

  // 3. Listen for postMessage from iframes that might try to request navigation
  window.addEventListener('message', (event) => {
    try {
      const data = event.data;
      if (typeof data === 'string') {
        const inspection = inspectUrlForShield(data, getAllowed());
        if (inspection.blocked && inspection.type) {
          notifyBlockedPopup(data, inspection.type);
        }
      } else if (data && typeof data === 'object' && data.url) {
        const inspection = inspectUrlForShield(String(data.url), getAllowed());
        if (inspection.blocked && inspection.type) {
          notifyBlockedPopup(String(data.url), inspection.type);
        }
      }
    } catch {
      // ignore
    }
  });

  console.info('[GB Shield] Telegram & WhatsApp popup protection active (Whitelisted: https://t.me/GBFreestudy)');
}
