import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ChatUser, ChatMessage } from '../types';
import { compressImage } from '../lib/imageCompressor';

// Secret Admin Credentials defined by user
export const ADMIN_USERNAME = 'SARVOTTAM';
export const ADMIN_PASSWORD = 'GBADMIN2026';

export const ADMIN_USER: ChatUser = {
  id: 'admin_sarvottam',
  username: 'SARVOTTAM',
  displayName: 'SARVOTTAM (ADMIN)',
  avatar: 'https://i.ibb.co/Q3g9fGSt/1791541921524.png',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const CHAT_AUTH_STORAGE_KEY = 'gb_chat_active_user_v1';
const CACHE_KEY_USERS = 'gb_cached_chat_users_v1';

// Default Avatars for Quick Pick
export const DEFAULT_AVATARS = [
  { name: 'GB Logo', url: 'https://i.ibb.co/Q3g9fGSt/1791541921524.png' },
  { name: 'Student Boy', url: 'https://api.iconify.design/noto:student.svg' },
  { name: 'Student Girl', url: 'https://api.iconify.design/noto:woman-student.svg' },
  { name: 'Scientist', url: 'https://api.iconify.design/noto:scientist.svg' },
  { name: 'Topper Cap', url: 'https://api.iconify.design/lucide:graduation-cap.svg?color=%2338bdf8' },
  { name: 'Target Star', url: 'https://api.iconify.design/lucide:target.svg?color=%2338bdf8' },
];

/**
 * Get currently logged in Chat User from session/local storage
 */
export function getCurrentChatUser(): ChatUser | null {
  try {
    const raw = localStorage.getItem(CHAT_AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.username) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Save user to localStorage
 */
export function saveCurrentChatUser(user: ChatUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CHAT_AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CHAT_AUTH_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Helper to get local cached users map
 */
function getCachedUsersMap(): Record<string, ChatUser> {
  try {
    const raw = localStorage.getItem(CACHE_KEY_USERS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function saveCachedUsersMap(map: Record<string, ChatUser>): void {
  try {
    localStorage.setItem(CACHE_KEY_USERS, JSON.stringify(map));
  } catch {}
}

/**
 * Fetch all registered users map from /settings/chat_users
 */
async function fetchUsersRegistry(): Promise<Record<string, ChatUser>> {
  try {
    const docRef = doc(db, 'settings', 'chat_users');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const users = (data?.users || {}) as Record<string, ChatUser>;
      saveCachedUsersMap(users);
      return users;
    }
  } catch (e) {
    console.warn('Note: using cached users registry', e);
  }
  return getCachedUsersMap();
}

/**
 * Login function
 * Checks if credentials match Admin (SARVOTTAM / GBADMIN2026) or regular student
 */
export async function loginChatUser(usernameInput: string, passwordInput: string): Promise<ChatUser> {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (!username || !password) {
    throw new Error('Username aur Password dono daalna zaroori hai.');
  }

  // 1. Check if Admin credentials match
  if (username.toUpperCase() === ADMIN_USERNAME.toUpperCase() && password === ADMIN_PASSWORD) {
    saveCurrentChatUser(ADMIN_USER);
    return ADMIN_USER;
  }

  // 2. Regular User check
  const cleanId = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanId) {
    throw new Error('Kripya valid username dalein.');
  }

  const usersMap = await fetchUsersRegistry();
  const foundUser = usersMap[cleanId];

  if (foundUser) {
    if (foundUser.password && foundUser.password !== password) {
      throw new Error('Galat Password hai! Kripya sahi password dalein.');
    }

    const loggedUser: ChatUser = {
      ...foundUser,
      lastActive: new Date().toISOString(),
    };

    saveCurrentChatUser(loggedUser);
    return loggedUser;
  } else {
    throw new Error(`Username "${username}" nahi mila. Kripya naya account banayein (Create Account).`);
  }
}

/**
 * Create Account function
 * Registers a new student in /settings/chat_users with Name, Username, Password, and Profile Photo (DP)
 */
export async function createChatUser(
  displayNameInput: string,
  usernameInput: string,
  passwordInput: string,
  avatarInput?: string
): Promise<ChatUser> {
  const name = displayNameInput.trim();
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (name.length < 2) {
    throw new Error('Kripya apna poora naam dalein (Kam se kam 2 akshar).');
  }

  if (username.length < 3) {
    throw new Error('Username kam se kam 3 aksharo ka hona chahiye.');
  }

  if (password.length < 4) {
    throw new Error('Password kam se kam 4 aksharo ka hona chahiye.');
  }

  const cleanId = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  // Prevent regular users from stealing the ADMIN username
  if (cleanId === ADMIN_USERNAME.toLowerCase()) {
    throw new Error('Yeh username ADMIN ke liye reserved hai. Kripya dusra username chunein.');
  }

  const usersMap = await fetchUsersRegistry();
  if (usersMap[cleanId]) {
    throw new Error(`Username "${username}" pehle se kisi aur ka hai. Kripya koi dusra username chunein.`);
  }

  // Sanitize and compress DP avatar if needed
  let safeAvatar = avatarInput?.trim() || '';
  if (safeAvatar.startsWith('data:image/') && safeAvatar.length > 35000) {
    safeAvatar = await compressImage(safeAvatar, 120, 120, 0.7);
  }
  if (!safeAvatar) {
    safeAvatar = DEFAULT_AVATARS[1].url;
  }

  const now = new Date().toISOString();
  const newUser: ChatUser = {
    id: cleanId,
    username,
    displayName: name,
    password,
    avatar: safeAvatar,
    role: 'user',
    createdAt: now,
    lastActive: now,
  };

  usersMap[cleanId] = newUser;
  saveCachedUsersMap(usersMap);

  try {
    const docRef = doc(db, 'settings', 'chat_users');
    await setDoc(docRef, { users: usersMap, updatedAt: now }, { merge: true });
  } catch (err: any) {
    console.warn('Note on saving user online:', err);
  }

  saveCurrentChatUser(newUser);
  return newUser;
}

export interface StudentConversationSummary {
  userId: string;
  studentName: string;
  studentUsername: string;
  studentAvatar: string;
  latestMessage: string;
  latestTimestamp: string;
  unreadCount: number;
  totalMessages: number;
}

/**
 * Send a chat message
 * Appends message to /settings/chat_thread_{userId} and updates /settings/chat_inbox
 */
export async function sendChatMessage(
  userId: string,
  sender: ChatUser,
  text: string
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  const now = new Date().toISOString();
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newMsg: ChatMessage = {
    id: msgId,
    userId,
    senderId: sender.id,
    senderUsername: sender.username,
    senderName: sender.displayName,
    senderAvatar: sender.avatar || '',
    senderRole: sender.role,
    text: cleanText,
    createdAt: now,
    readByAdmin: sender.role === 'admin',
    readByUser: sender.role === 'user',
  };

  try {
    // 1. Fetch current thread from /settings/chat_thread_{userId}
    const threadRef = doc(db, 'settings', `chat_thread_${userId}`);
    const threadSnap = await getDoc(threadRef);
    let existingMsgs: ChatMessage[] = [];

    if (threadSnap.exists()) {
      existingMsgs = (threadSnap.data()?.messages || []) as ChatMessage[];
    }

    const updatedMsgs = [...existingMsgs, newMsg];

    // Keep latest 250 messages per user thread to stay well under Firestore 1MB doc size
    const trimmedMsgs = updatedMsgs.slice(-250);

    await setDoc(
      threadRef,
      {
        userId,
        studentName: sender.role === 'user' ? sender.displayName : (threadSnap.data()?.studentName || userId),
        studentUsername: sender.role === 'user' ? sender.username : (threadSnap.data()?.studentUsername || userId),
        studentAvatar: sender.role === 'user' ? (sender.avatar || '') : (threadSnap.data()?.studentAvatar || ''),
        messages: trimmedMsgs,
        latestMessage: cleanText,
        latestTimestamp: now,
        updatedAt: now,
      },
      { merge: true }
    );

    // 2. Update Admin Inbox summary (/settings/chat_inbox)
    const inboxRef = doc(db, 'settings', 'chat_inbox');
    const inboxSnap = await getDoc(inboxRef);
    let convs: StudentConversationSummary[] = [];

    if (inboxSnap.exists()) {
      convs = (inboxSnap.data()?.conversations || []) as StudentConversationSummary[];
    }

    const existingIdx = convs.findIndex((c) => c.userId === userId);
    const prevUnread = existingIdx !== -1 ? convs[existingIdx].unreadCount : 0;
    const newUnread = sender.role === 'user' ? prevUnread + 1 : 0;

    const studentName = sender.role === 'user' ? sender.displayName : (convs[existingIdx]?.studentName || userId);
    const studentUsername = sender.role === 'user' ? sender.username : (convs[existingIdx]?.studentUsername || userId);
    const studentAvatar = sender.role === 'user' ? (sender.avatar || '') : (convs[existingIdx]?.studentAvatar || '');

    const updatedSummary: StudentConversationSummary = {
      userId,
      studentName,
      studentUsername,
      studentAvatar,
      latestMessage: cleanText,
      latestTimestamp: now,
      unreadCount: newUnread,
      totalMessages: trimmedMsgs.length,
    };

    if (existingIdx !== -1) {
      convs[existingIdx] = updatedSummary;
    } else {
      convs.push(updatedSummary);
    }

    // Sort by latest message descending
    convs.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());

    await setDoc(inboxRef, { conversations: convs, updatedAt: now }, { merge: true });

    return msgId;
  } catch (err: any) {
    console.error('Error in sendChatMessage:', err);
    throw err;
  }
}

/**
 * Subscribe to messages for a single user's thread (Real-time listener on /settings/chat_thread_{userId})
 */
export function subscribeUserThread(
  userId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
) {
  const threadRef = doc(db, 'settings', `chat_thread_${userId}`);

  return onSnapshot(
    threadRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const msgs = (data?.messages || []) as ChatMessage[];
        callback(msgs);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.warn('Thread snapshot note:', error);
      onError?.(error);
      callback([]);
    }
  );
}

/**
 * Subscribe to Admin Inbox (Real-time listener on /settings/chat_inbox)
 */
export function subscribeAdminConversations(
  callback: (conversations: StudentConversationSummary[], allMessages: ChatMessage[]) => void,
  onError?: (err: Error) => void
) {
  const inboxRef = doc(db, 'settings', 'chat_inbox');

  return onSnapshot(
    inboxRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const convs = (data?.conversations || []) as StudentConversationSummary[];
        convs.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
        callback(convs, []);
      } else {
        callback([], []);
      }
    },
    (error) => {
      console.warn('Inbox snapshot note:', error);
      onError?.(error);
      callback([], []);
    }
  );
}

/**
 * Delete message (Admin privilege)
 */
export async function deleteChatMessage(messageId: string, userId?: string): Promise<void> {
  if (!userId) return;
  try {
    const threadRef = doc(db, 'settings', `chat_thread_${userId}`);
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      const msgs = (threadSnap.data()?.messages || []) as ChatMessage[];
      const filtered = msgs.filter((m) => m.id !== messageId);
      await updateDoc(threadRef, { messages: filtered, updatedAt: new Date().toISOString() });
    }
  } catch (err: any) {
    console.error('Delete message error:', err);
    throw err;
  }
}
