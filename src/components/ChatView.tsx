import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Lock,
  User,
  UserPlus,
  LogIn,
  LogOut,
  ArrowLeft,
  Trash2,
  Search,
  Image as ImageIcon,
  CheckCircle,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { ChatUser, ChatMessage } from '../types';
import {
  getCurrentChatUser,
  saveCurrentChatUser,
  loginChatUser,
  createChatUser,
  sendChatMessage,
  subscribeUserThread,
  subscribeAdminConversations,
  StudentConversationSummary,
  deleteChatMessage,
  DEFAULT_AVATARS,
  ADMIN_USERNAME
} from '../services/chatService';
import { compressImage } from '../lib/imageCompressor';

export const ChatView: React.FC = () => {
  // Current logged in chat user (persists in localStorage)
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(getCurrentChatUser);

  // Auth Mode: 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Signup Form State
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAvatar, setSignupAvatar] = useState(DEFAULT_AVATARS[0].url);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // User chat thread state (for student or selected student when admin)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Admin specific states
  const [adminConversations, setAdminConversations] = useState<StudentConversationSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentConversationSummary | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const user = await loginChatUser(loginUsername, loginPassword);
      setCurrentUser(user);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Quick Admin Fill
  const handleQuickAdminLogin = () => {
    setLoginUsername('SARVOTTAM');
    setLoginPassword('@GBADMIN2026');
    setAuthMode('login');
    setLoginError('');
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupLoading(true);

    try {
      const user = await createChatUser(
        signupName,
        signupUsername,
        signupPassword,
        signupAvatar
      );
      setCurrentUser(user);
      setSignupName('');
      setSignupUsername('');
      setSignupPassword('');
    } catch (err: any) {
      setSignupError(err.message || 'Account creation failed.');
    } finally {
      setSignupLoading(false);
    }
  };

  // Handle DP / Profile photo upload
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file, 120, 120, 0.7);
      setSignupAvatar(compressed);
    } catch {
      alert('Photo optimize nahi ho payi. Kripya doosri photo chunein.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    saveCurrentChatUser(null);
    setCurrentUser(null);
    setSelectedStudentId(null);
    setSelectedStudentSummary(null);
    setMessages([]);
  };

  // Subscribe to messages for current active thread
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
      // If admin has selected a student thread
      if (selectedStudentId) {
        const unsubscribe = subscribeUserThread(selectedStudentId, (data) => {
          setMessages(data);
        });
        return () => unsubscribe();
      }
    } else {
      // Normal user thread
      const unsubscribe = subscribeUserThread(currentUser.id, (data) => {
        setMessages(data);
      });
      return () => unsubscribe();
    }
  }, [currentUser, selectedStudentId]);

  // Subscribe to all conversations if Admin
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const unsubscribe = subscribeAdminConversations((conversations) => {
      setAdminConversations(conversations);
      // update summary if current student selected
      if (selectedStudentId) {
        const found = conversations.find((c) => c.userId === selectedStudentId);
        if (found) setSelectedStudentSummary(found);
      }
    });

    return () => unsubscribe();
  }, [currentUser, selectedStudentId]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || sending) return;

    const targetUserId =
      currentUser.role === 'admin' ? selectedStudentId : currentUser.id;

    if (!targetUserId) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendChatMessage(targetUserId, currentUser, textToSend);
    } catch (err: any) {
      alert('Message bhejne me error: ' + (err.message || 'Check connection'));
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Admin delete message
  const handleDeleteMsg = async (id: string) => {
    if (confirm('Is message ko delete karna chahte hain?')) {
      try {
        await deleteChatMessage(id, selectedStudentId || undefined);
      } catch (err: any) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  // Format timestamp nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // =========================================================================
  // VIEW 1: NOT LOGGED IN -> SHOW AUTH (LOGIN / SIGNUP)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="space-y-4 pt-1 pb-16">
        {/* Header Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0c2438] border border-[#164e63] text-[11px] font-black text-[#38bdf8] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <span>GB STUDY LIVE CHAT</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            <span>Community </span>
            <span className="text-[#38bdf8]">Chat</span>
          </h2>
          <p className="text-xs text-slate-400">
            Chat with Sarvottam Sir &amp; GB STUDY support.
          </p>
        </div>

        {/* Auth Box Container */}
        <div className="rounded-3xl bg-[#0c1520] border border-[#172535] p-5 shadow-2xl relative overflow-hidden">
          {/* Top Toggle: Login vs Create Account */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#080e16] border border-[#142333] mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-[#38bdf8] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setSignupError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-[#38bdf8] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* TAB 1: LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-[#38bdf8]" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Apna username dalein"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070e17] border border-[#162536] text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#38bdf8]" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Apna password dalein"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070e17] border border-[#162536] text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-cyan-950/50 cursor-pointer mt-2"
              >
                {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 stroke-[2.5]" />}
                <span>{loginLoading ? 'Logging in...' : 'Login & Open Chat'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: CREATE ACCOUNT FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5 text-xs">
              {signupError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{signupError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Aapka Naam (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070e17] border border-[#162536] text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Choose Username *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. rahul_yadav"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#070e17] border border-[#162536] text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Set Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#38bdf8]" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Apna koi bhi strong password banayein"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070e17] border border-[#162536] text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* DP / Profile Photo Upload & Presets */}
              <div className="p-3 rounded-2xl bg-[#080f18] border border-[#142333] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold text-xs">
                    Profile Photo (DP)
                  </label>
                  {/* Live preview */}
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#164e63] bg-[#0c1f2b]">
                    <img
                      src={signupAvatar}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    Apni gallery ya camera se photo lagayein:
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={avatarUploading}
                    onChange={handleAvatarFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#162738] file:text-slate-200 hover:file:bg-[#1e344a] cursor-pointer bg-[#070d14] p-1.5 rounded-xl border border-[#142333]"
                  />
                </div>

                {/* Quick Avatar Presets */}
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">
                    Ya inme se ek DP chunein:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_AVATARS.map((av) => (
                      <button
                        key={av.name}
                        type="button"
                        onClick={() => setSignupAvatar(av.url)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition p-0.5 cursor-pointer ${
                          signupAvatar === av.url
                            ? 'border-[#38bdf8] bg-[#0c2438] scale-110 shadow-sm'
                            : 'border-[#172535] bg-[#070e17] opacity-75 hover:opacity-100'
                        }`}
                        title={av.name}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={signupLoading || avatarUploading}
                className="w-full py-3 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-cyan-950/50 cursor-pointer mt-2"
              >
                {signupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 stroke-[2.5]" />}
                <span>{signupLoading ? 'Creating Account...' : 'Create Account & Enter Chat'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN IS LOGGED IN AND NOT CURRENTLY VIEWING A STUDENT THREAD
  // SHOWS INBOX OF ALL STUDENTS (Requested: "ADMIN KO SABHI KE CHAT DIKHENGE")
  // =========================================================================
  if (currentUser.role === 'admin' && !selectedStudentId) {
    const filteredConvs = adminConversations.filter((c) => {
      if (!adminSearchQuery.trim()) return true;
      const q = adminSearchQuery.toLowerCase().trim();
      return c.studentName.toLowerCase().includes(q) || c.studentUsername.toLowerCase().includes(q);
    });

    return (
      <div className="space-y-4 pt-1 pb-16">
        {/* Top Header Card for Admin */}
        <div className="p-4 rounded-3xl bg-[#0c1520] border border-[#172535] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#164e63] bg-[#0c1f2b] p-0.5 shadow-md">
              <img
                src={currentUser.avatar || DEFAULT_AVATARS[0].url}
                alt="Admin"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white">
                  {currentUser.displayName}
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                All Student Conversations ({adminConversations.length})
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-[#1f1013] hover:bg-[#2b1419] text-rose-400 border border-rose-950/60 transition cursor-pointer"
            title="Sign out of Chat"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar for Admin */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={adminSearchQuery}
            onChange={(e) => setAdminSearchQuery(e.target.value)}
            placeholder="Search students by name or username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c1520] border border-[#172535] text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
          />
        </div>

        {/* Conversations List */}
        <div className="space-y-2.5">
          {filteredConvs.map((conv) => (
            <div
              key={conv.userId}
              onClick={() => {
                setSelectedStudentId(conv.userId);
                setSelectedStudentSummary(conv);
              }}
              className="p-3.5 rounded-2xl bg-[#0c1520] hover:bg-[#0f1a28] active:bg-[#112338] border border-[#172535] hover:border-[#1e344d] transition flex items-center justify-between gap-3 cursor-pointer shadow-sm active:scale-98"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Student DP */}
                <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#172535] bg-[#070e17] shrink-0">
                  <img
                    src={conv.studentAvatar || DEFAULT_AVATARS[1].url}
                    alt={conv.studentName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm truncate">
                      {conv.studentName}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {formatTime(conv.latestTimestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {conv.latestMessage || 'No messages'}
                  </p>
                </div>
              </div>

              {/* Unread badge */}
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#38bdf8] text-black font-black text-[10px] flex items-center justify-center shrink-0 shadow-md animate-pulse">
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))}

          {filteredConvs.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#1e2f42] p-8 text-center bg-[#0c1520]/60 my-4">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white mb-1">
                No Student Chats Yet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jab bhi koi student message karega, unki chat yahan real-time me aa jayegi.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE 1-ON-1 CHAT THREAD
  // (Either a normal student chatting with Admin, OR Admin chatting with a selected student)
  // =========================================================================
  const isUserRole = currentUser.role === 'user';
  const headerTitle = isUserRole
    ? 'SARVOTTAM (GB STUDY Support)'
    : selectedStudentSummary?.studentName || 'Student Chat';
  const headerSubtitle = isUserRole
    ? 'Direct Private Chat with Admin'
    : `@${selectedStudentSummary?.studentUsername || selectedStudentId}`;
  const headerAvatar = isUserRole
    ? 'https://i.ibb.co/Q3g9fGSt/1791541921524.png'
    : selectedStudentSummary?.studentAvatar || DEFAULT_AVATARS[1].url;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-md w-full mx-auto">
      {/* Top Chat Bar */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#0c1520] border border-[#172535] flex items-center justify-between shadow-lg mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back button if admin is viewing a student thread */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setSelectedStudentId(null);
                setSelectedStudentSummary(null);
                setMessages([]);
              }}
              className="w-8 h-8 rounded-xl bg-[#070e17] border border-[#142333] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              title="Back to All Students"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Header Avatar */}
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#164e63] bg-[#0c1f2b] shrink-0">
            <img src={headerAvatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {headerTitle}
              </h3>
              {isUserRole ? (
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shrink-0" />
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-[#0c2438] text-[#38bdf8] border border-[#164e63]">
                  Student
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* User Info / Logout */}
        <div className="flex items-center gap-2">
          {isUserRole && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#070e17] border border-[#142333] text-[10px] text-slate-300">
              <img
                src={currentUser.avatar || DEFAULT_AVATARS[0].url}
                alt="Me"
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="max-w-[60px] truncate font-bold text-[#38bdf8]">
                {currentUser.displayName}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-[#1f1013] hover:bg-[#2b1419] text-rose-400 border border-rose-950/60 transition cursor-pointer"
            title="Sign out of Chat"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3 rounded-2xl bg-[#070e17]/60 border border-[#142333] p-3 shadow-inner">
        {/* Welcome Banner */}
        <div className="p-3 rounded-2xl bg-[#091522] border border-[#152e42] text-center space-y-1 my-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#38bdf8] uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-[#38bdf8]" />
            <span>End-to-End GB STUDY Helpdesk</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isUserRole
              ? 'Namaste! Yahan aap Sarvottam Sir se direct batch access, notes ya study related questions pooch sakte hain.'
              : `Aap student @${selectedStudentSummary?.studentUsername || selectedStudentId} se chat kar rahe hain.`}
          </p>
        </div>

        {/* Messages List */}
        {messages.map((msg) => {
          const isSenderMe = msg.senderId === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 group ${
                isSenderMe ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Other party avatar */}
              {!isSenderMe && (
                <div className="w-7 h-7 rounded-xl overflow-hidden border border-[#172535] bg-[#0c1f2b] shrink-0 mb-1">
                  <img
                    src={msg.senderAvatar || DEFAULT_AVATARS[0].url}
                    alt={msg.senderName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`relative max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm break-words ${
                  isSenderMe
                    ? 'bg-gradient-to-r from-[#0284c7] to-[#0284c7]/90 text-white rounded-br-sm'
                    : msg.senderRole === 'admin'
                    ? 'bg-[#0f2434] text-white border border-[#18465c] rounded-bl-sm'
                    : 'bg-[#0d1724] text-white border border-[#1a2d42] rounded-bl-sm'
                }`}
              >
                {/* Sender badge if admin speaking */}
                {msg.senderRole === 'admin' && !isSenderMe && (
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#38bdf8] mb-1">
                    <ShieldCheck className="w-3 h-3 text-[#38bdf8]" />
                    <span>SARVOTTAM (ADMIN)</span>
                  </div>
                )}

                {/* Message text */}
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Timestamp */}
                <div
                  className={`text-[9px] mt-1 text-right font-mono ${
                    isSenderMe ? 'text-cyan-100/70' : 'text-slate-400'
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>

              {/* Admin delete button */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleDeleteMsg(msg.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            Abhi koi message nahi hai. Niche message likh kar bhejein!
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSendMessage} className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isUserRole
              ? 'Sarvottam Sir ko message likhein...'
              : 'Student ko reply likhein...'
          }
          className="flex-1 px-4 py-3 rounded-xl bg-[#0c1520] border border-[#172535] text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition shadow-inner"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 shadow-md shrink-0 cursor-pointer ${
            inputText.trim() && !sending
              ? 'bg-[#38bdf8] text-black hover:bg-[#0ea5e9]'
              : 'bg-[#0f1925] text-slate-500 border border-[#162333] cursor-not-allowed'
          }`}
          title="Send message"
        >
          {sending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 fill-current -rotate-12 translate-x-0.5" />
          )}
        </button>
      </form>
    </div>
  );
};
