import React, { useState } from 'react';
import { 
  X, Plus, Upload, Download, Image as ImageIcon, ExternalLink, LogOut, 
  Trash2, Edit, Check, AlertCircle, Compass, AppWindow, Globe,
  Sparkles, Layers, RefreshCw, Eye, ArrowUpToLine
} from 'lucide-react';
import { Platform, AppConfig, ImportSummary, OpenMode, Banner } from '../types';
import { 
  addPlatform, updatePlatform, movePlatformToTop, deletePlatform, updateConfig, 
  bulkImportPlatforms, parseCSVPlatforms,
  addBanner, updateBanner, deleteBanner 
} from '../services/dbService';
import { compressImage } from '../lib/imageCompressor';
import { PlatformIcon } from './PlatformIcon';

// Popular icon presets for 1-click selection
const PRESET_ICONS = [
  { name: 'KGS / Khan Sir', icon: 'https://api.iconify.design/lucide:graduation-cap.svg?color=%2338bdf8' },
  { name: 'PW / Physics', icon: 'https://api.iconify.design/lucide:atom.svg?color=%2338bdf8' },
  { name: 'Target Board', icon: 'https://api.iconify.design/lucide:target.svg?color=%2338bdf8' },
  { name: 'Vidyagram', icon: 'https://api.iconify.design/lucide:award.svg?color=%2338bdf8' },
  { name: 'RWA', icon: 'https://api.iconify.design/lucide:check-circle.svg?color=%2338bdf8' },
  { name: 'Sachin Academy', icon: 'https://api.iconify.design/lucide:book-open.svg?color=%2338bdf8' },
  { name: 'Yes Officer', icon: 'https://api.iconify.design/lucide:shield.svg?color=%2338bdf8' },
  { name: 'Unacademy', icon: 'https://api.iconify.design/lucide:layers.svg?color=%2338bdf8' },
  { name: 'Next Topper', icon: 'https://api.iconify.design/lucide:zap.svg?color=%2338bdf8' },
  { name: 'GB STUDY Logo', icon: 'https://i.ibb.co/Q3g9fGSt/1791541921524.png' },
];

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: Platform[];
  banners: Banner[];
  config: AppConfig;
  onSignOut: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  platforms,
  banners,
  config,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

  // Platform form state
  const [platformForm, setPlatformForm] = useState({
    name: '',
    description: '',
    url: '',
    icon: '',
    status: 'active' as 'active' | 'upcoming',
    openMode: 'internal' as OpenMode,
    isUpcoming: false,
    order: 1,
  });

  const [iconCompressing, setIconCompressing] = useState(false);
  const [iconInfo, setIconInfo] = useState('');
  const [platformSaving, setPlatformSaving] = useState(false);

  // Multiple Banners state inside modal
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerCompressing, setBannerCompressing] = useState(false);
  const [bannerInfo, setBannerInfo] = useState('');

  const [bannerForm, setBannerForm] = useState<{
    id?: string;
    title: string;
    imageUrl: string;
    actionUrl: string;
    openMode: OpenMode;
    active: boolean;
    order: number;
  }>({
    title: '',
    imageUrl: '',
    actionUrl: '',
    openMode: 'new_tab',
    active: true,
    order: 1,
  });

  // Telegram form state
  const [telegramInputUrl, setTelegramInputUrl] = useState(config.telegramUrl || '');

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [topActionLoadingId, setTopActionLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCount = platforms.filter((p) => p.status === 'active').length;
  const upcomingCount = platforms.filter((p) => p.status === 'upcoming').length;

  const filteredPlatforms = platforms.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
  });

  // 1-click move any platform to the very top (sabse upar)
  const handleMoveToTop = async (id: string, name: string) => {
    setTopActionLoadingId(id);
    try {
      await movePlatformToTop(id);
    } catch (err: any) {
      alert(`Failed to move to top: ${err.message}`);
    } finally {
      setTopActionLoadingId(null);
    }
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setPlatformForm({
      name: '',
      description: '',
      url: '',
      icon: '',
      status: 'active',
      openMode: 'internal',
      isUpcoming: false,
      order: 0,
    });
    setIconInfo('');
    setEditingPlatform(null);
    setAddModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (p: Platform) => {
    setEditingPlatform(p);
    setPlatformForm({
      name: p.name,
      description: p.description || '',
      url: p.url,
      icon: p.icon || '',
      status: p.status,
      openMode: p.openMode || 'internal',
      isUpcoming: p.status === 'upcoming',
      order: 0,
    });
    setIconInfo(p.icon ? (p.icon.startsWith('data:') ? 'Custom uploaded icon' : 'Image URL') : '');
    setAddModalOpen(true);
  };

  // Handle Icon File Upload with automatic safe compression
  const handleIconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconCompressing(true);
    setIconInfo('Compressing icon...');

    try {
      const compressed = await compressImage(file, 128, 128, 0.75);
      setPlatformForm((prev) => ({ ...prev, icon: compressed }));
      const kb = Math.round(compressed.length / 1024);
      setIconInfo(`✓ Compressed: ${kb} KB (Cloud Safe)`);
    } catch (err: any) {
      console.error('Error compressing icon:', err);
      setIconInfo('Failed to compress, please try another image');
    } finally {
      setIconCompressing(false);
    }
  };

  // Handle Save Platform - Automatically places platform at the VERY TOP for both user and admin
  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformForm.name.trim() || !platformForm.url.trim()) {
      alert('Platform name and URL are required.');
      return;
    }

    setPlatformSaving(true);
    try {
      let icon = platformForm.icon.trim();

      // Convert ibb.co share links to direct images if pasted
      if (icon.includes('ibb.co/0R7qc34v')) {
        icon = 'https://i.ibb.co/Q3g9fGSt/1791541921524.png';
      }

      // If user pasted raw base64 data URL, ensure compressed
      if (icon.startsWith('data:image/') && icon.length > 50000) {
        icon = await compressImage(icon, 128, 128, 0.7);
      }

      const now = new Date().toISOString();
      const payload: Omit<Platform, 'id'> = {
        name: platformForm.name.trim(),
        description: platformForm.description.trim() || 'Open platform to explore content.',
        url: platformForm.url.trim(),
        icon,
        status: platformForm.isUpcoming ? 'upcoming' : 'active',
        openMode: platformForm.openMode || 'internal',
        order: 0, // Highest priority: goes directly to the very top (sabse upar)
        updatedAt: now,
      };

      if (editingPlatform) {
        await updatePlatform(editingPlatform.id, payload);
      } else {
        await addPlatform(payload);
      }

      setAddModalOpen(false);
      setEditingPlatform(null);
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Error occurred'}`);
    } finally {
      setPlatformSaving(false);
    }
  };

  // Handle Delete Platform
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deletePlatform(id);
      } catch (err: any) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  // Handle Banner Image File Upload with automatic compression
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerCompressing(true);
    setBannerInfo('Optimizing banner for cloud...');

    try {
      const compressed = await compressImage(file, 800, 450, 0.7);
      setBannerForm((prev) => ({ ...prev, imageUrl: compressed }));
      const kb = Math.round(compressed.length / 1024);
      setBannerInfo(`✓ Optimized (16:9): ${kb} KB (Cloud Safe)`);
    } catch (err) {
      console.error('Error compressing banner:', err);
      setBannerInfo('Could not optimize banner image');
    } finally {
      setBannerCompressing(false);
    }
  };

  // Handle Save Banner (Add or Edit)
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl.trim()) {
      alert('Banner image is required (upload image or enter URL).');
      return;
    }

    setBannerSaving(true);
    try {
      let imageUrl = bannerForm.imageUrl.trim();
      if (imageUrl.startsWith('data:image/') && imageUrl.length > 80000) {
        imageUrl = await compressImage(imageUrl, 800, 360, 0.7);
      }

      if (bannerForm.id) {
        await updateBanner(bannerForm.id, {
          title: bannerForm.title.trim(),
          imageUrl,
          actionUrl: bannerForm.actionUrl.trim(),
          openMode: bannerForm.openMode,
          active: bannerForm.active,
          order: Number(bannerForm.order) || 1,
        });
      } else {
        await addBanner({
          title: bannerForm.title.trim(),
          imageUrl,
          actionUrl: bannerForm.actionUrl.trim(),
          openMode: bannerForm.openMode,
          order: banners.length + 1,
          active: bannerForm.active,
        });
      }

      setIsAddingBanner(false);
      setBannerForm({
        title: '',
        imageUrl: '',
        actionUrl: '',
        openMode: 'new_tab',
        active: true,
        order: 1,
      });
      setBannerInfo('');
    } catch (err: any) {
      alert(`Failed to save banner: ${err.message}`);
    } finally {
      setBannerSaving(false);
    }
  };

  // Handle Delete Banner
  const handleDeleteBanner = async (id: string) => {
    if (confirm('Delete this banner?')) {
      try {
        await deleteBanner(id);
      } catch (err: any) {
        alert(`Delete banner failed: ${err.message}`);
      }
    }
  };

  // Handle Export Backup
  const handleExportBackup = () => {
    const data = {
      platforms,
      banners,
      config,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gb-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Bulk Import
  const handleRunBulkImport = async () => {
    if (!bulkText.trim()) return;
    setImportLoading(true);
    setImportSummary(null);

    try {
      let parsed: Array<Partial<Platform>> = [];
      const trimmed = bulkText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed);
        parsed = Array.isArray(json) ? json : json.platforms || [json];
      } else {
        parsed = parseCSVPlatforms(trimmed);
      }

      const summary = await bulkImportPlatforms(parsed, platforms);
      setImportSummary(summary);
      if (summary.added > 0) {
        setBulkText('');
      }
    } catch (err: any) {
      alert(`Bulk Import Error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Handle Save Telegram
  const handleSaveTelegram = async () => {
    try {
      await updateConfig({ telegramUrl: telegramInputUrl.trim() });
      setTelegramModalOpen(false);
      alert('Telegram link updated successfully!');
    } catch (err: any) {
      alert(`Failed to save Telegram link: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[92vh] rounded-3xl bg-[#090e17] border border-[#162333] shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Top Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#141f2d] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>GB STUDY Admin</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0c2438] text-[#38bdf8] border border-[#164e63] font-mono">
                Cloud Sync
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Add platforms and banners anytime. Real-time update for all users.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#0f1925] hover:bg-[#152332] border border-[#1e2f42] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Action Button Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* + Add Platform */}
            <button
              onClick={handleOpenAdd}
              className="py-3 px-3 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Platform</span>
            </button>

            {/* 🖼 Manage Banners (Requested: JITNE CHAHOON UTNE BANNER) */}
            <button
              onClick={() => {
                setIsAddingBanner(false);
                setBannerModalOpen(true);
              }}
              className="py-3 px-3 rounded-xl bg-[#0c1f2b] hover:bg-[#102d3e] text-[#38bdf8] border border-[#164e63] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Banners ({banners.length})</span>
            </button>

            {/* ↑ Bulk Add */}
            <button
              onClick={() => {
                setBulkModalOpen(true);
                setImportSummary(null);
              }}
              className="py-3 px-3 rounded-xl bg-[#0c1f2b] hover:bg-[#102d3e] text-slate-300 border border-[#162738] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk CSV/JSON</span>
            </button>

            {/* Telegram Link ↗ */}
            <button
              onClick={() => {
                setTelegramInputUrl(config.telegramUrl || '');
                setTelegramModalOpen(true);
              }}
              className="py-3 px-3 rounded-xl bg-[#0c1f2b] hover:bg-[#102d3e] text-[#38bdf8] border border-[#164e63] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <span>Telegram Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* ↓ Export Backup */}
            <button
              onClick={handleExportBackup}
              className="py-2.5 px-3 rounded-xl bg-[#0a121c] hover:bg-[#0e1a29] text-slate-400 border border-[#142333] font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </button>

            {/* Sign out */}
            <button
              onClick={onSignOut}
              className="py-2.5 px-3 rounded-xl bg-[#1f1013] hover:bg-[#2b1419] text-rose-400 border border-rose-950/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0a1420] border border-[#142436] text-xs">
            <span className="text-[#38bdf8] font-bold">
              {platforms.length} Platforms Saved
            </span>
            <span className="text-slate-400 text-[11px]">
              {activeCount} Active • {upcomingCount} Upcoming
            </span>
          </div>

          {/* Search Box */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platforms by name or URL"
              className="w-full px-4 py-2.5 rounded-xl bg-[#0d1622] border border-[#1a293b] text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#38bdf8] transition"
            />
          </div>

          {/* Auto-Top Priority Setting Status */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#081e18] border border-[#14532d]/60 text-[11px] text-[#34d399] shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shrink-0" />
              <span className="font-bold">Auto-Top Active:</span>
              <span className="text-slate-300">Joda / Edit kiya gaya platform sabse upar (#1) chala jayega</span>
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-[#10b981]/20 text-[#34d399] px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>

          {/* Platform List in Admin */}
          <div className="space-y-3">
            {filteredPlatforms.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-[#0c1520] border border-[#172435] flex items-center justify-between gap-3 text-xs shadow-sm hover:border-[#1e344d] transition"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <PlatformIcon
                    icon={p.icon}
                    name={p.name}
                    className="w-10 h-10 rounded-xl shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-white text-sm tracking-wide uppercase truncate">
                        {p.name}
                      </h4>

                      {p.status === 'upcoming' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/40">
                          Upcoming
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {p.url}
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveToTop(p.id, p.name)}
                    disabled={topActionLoadingId === p.id}
                    className="px-2.5 py-1.5 rounded-xl bg-[#092b1e] hover:bg-[#0e3d2b] text-[#34d399] font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-[#14532d]/40"
                    title="Is platform ko sabse upar le jayein (Move to Top)"
                  >
                    <ArrowUpToLine className={`w-3 h-3 ${topActionLoadingId === p.id ? 'animate-bounce' : ''}`} />
                    <span>Top</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0e3b43] hover:bg-[#134d58] text-[#22d3ee] font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                    title="Edit platform details"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#4c0519] hover:bg-[#700924] text-[#fb7185] font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                    title="Delete platform"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 leading-relaxed text-center">
            You can add unlimited platforms and banners. Changes sync instantly across all devices.
          </div>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD / EDIT PLATFORM */}
      {addModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-[#090e17] border border-[#1e2f42] p-6 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#141f2d] mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingPlatform ? 'Edit Platform' : 'Add New Platform'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visible to all students in real-time
                </p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0f1925] flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3 p-2.5 rounded-xl bg-[#081e18] border border-[#14532d] text-[#34d399] text-[11px] flex items-center gap-2">
              <span className="text-sm">🔝</span>
              <span>Yeh platform save hote hi student aur admin dono ke liye <strong>sabse upar (#1 Position)</strong> par chala jayega.</span>
            </div>

            <form onSubmit={handleSavePlatform} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Platform name *</label>
                <input
                  type="text"
                  required
                  value={platformForm.name}
                  onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                  placeholder="e.g. Khan Global Studies"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Platform URL *</label>
                <input
                  type="text"
                  required
                  value={platformForm.url}
                  onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  value={platformForm.description}
                  onChange={(e) => setPlatformForm({ ...platformForm, description: e.target.value })}
                  placeholder="e.g. Open platform to explore content."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* URL Open Target Mode */}
              <div className="p-3.5 rounded-2xl bg-[#0c1520] border border-[#1a293b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold text-xs">
                    How should this URL open? (Admin Decision)
                  </label>
                  <span className="text-[10px] text-[#38bdf8] font-bold">
                    {platformForm.openMode === 'internal' && '📱 In-App Webview'}
                    {platformForm.openMode === 'external' && '🌐 External Browser'}
                    {platformForm.openMode === 'new_tab' && '📑 New Tab'}
                    {platformForm.openMode === 'same_tab' && '🔄 Same Tab'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 1. In-App */}
                  <button
                    type="button"
                    onClick={() => setPlatformForm({ ...platformForm, openMode: 'internal' })}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      platformForm.openMode === 'internal'
                        ? 'bg-purple-950/90 border-purple-500 text-purple-200 font-bold shadow-md shadow-purple-950/40'
                        : 'bg-[#09111a] border-[#142333] text-slate-400 hover:text-white hover:bg-[#131d2b]'
                    }`}
                  >
                    <AppWindow className="w-4 h-4 text-purple-400" />
                    <span className="text-[11px] font-bold">In-App</span>
                    <span className="text-[9px] text-slate-400 leading-tight">100% Full Screen</span>
                  </button>

                  {/* 2. External Browser */}
                  <button
                    type="button"
                    onClick={() => setPlatformForm({ ...platformForm, openMode: 'external' })}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      platformForm.openMode === 'external'
                        ? 'bg-sky-950/90 border-sky-400 text-sky-200 font-bold shadow-md shadow-sky-950/40'
                        : 'bg-[#09111a] border-[#142333] text-slate-400 hover:text-white hover:bg-[#131d2b]'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-[11px] font-bold">External</span>
                    <span className="text-[9px] text-slate-400 leading-tight">Direct Browser</span>
                  </button>

                  {/* 3. New Tab */}
                  <button
                    type="button"
                    onClick={() => setPlatformForm({ ...platformForm, openMode: 'new_tab' })}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      platformForm.openMode === 'new_tab'
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold shadow-md shadow-emerald-950/40'
                        : 'bg-[#09111a] border-[#142333] text-slate-400 hover:text-white hover:bg-[#131d2b]'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold">New Tab</span>
                    <span className="text-[9px] text-slate-400 leading-tight">Naya Tab</span>
                  </button>

                  {/* 4. Same Tab */}
                  <button
                    type="button"
                    onClick={() => setPlatformForm({ ...platformForm, openMode: 'same_tab' })}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      platformForm.openMode === 'same_tab'
                        ? 'bg-amber-950/90 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-950/40'
                        : 'bg-[#09111a] border-[#142333] text-slate-400 hover:text-white hover:bg-[#131d2b]'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-bold">Same Tab</span>
                    <span className="text-[9px] text-slate-400 leading-tight">Isi Tab Me</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 bg-[#080d14] p-2 rounded-xl border border-[#14202d]">
                  💡 <strong>Recommendation:</strong> Jo website app ke andar open nahi hoti ya block hoti hain, unhe <strong className="text-sky-300">External</strong> ya <strong className="text-emerald-300">New Tab</strong> par set karein.
                </div>
              </div>

              {/* Icon Section with LIVE PREVIEW */}
              <div className="p-3.5 rounded-2xl bg-[#0c1520] border border-[#1a293b] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold text-xs">
                    Platform Icon (Logo / Image)
                  </label>
                  {/* Live Icon Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Live Preview:</span>
                    <PlatformIcon
                      icon={platformForm.icon}
                      name={platformForm.name}
                      className="w-10 h-10 rounded-xl"
                    />
                  </div>
                </div>

                {iconInfo && (
                  <div className="text-[11px] font-mono text-[#38bdf8]">
                    {iconInfo}
                  </div>
                )}

                {/* Option 1: File Upload with instant auto-compression */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    1. Upload Logo from Device (Auto-compressed):
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={iconCompressing}
                    onChange={handleIconFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#162738] file:text-slate-200 hover:file:bg-[#1e344a] cursor-pointer bg-[#09111a] p-1.5 rounded-xl border border-[#142333]"
                  />
                </div>

                {/* Option 2: Image URL */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    2. Or Paste Image URL / ImgBB Link:
                  </span>
                  <input
                    type="text"
                    value={platformForm.icon}
                    onChange={(e) => {
                      setPlatformForm({ ...platformForm, icon: e.target.value });
                      setIconInfo('');
                    }}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-[#09111a] border border-[#142333] text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>

                {/* Option 3: Quick Preset Icons */}
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                    3. Or Click to Pick an Educational Preset:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ICONS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPlatformForm({ ...platformForm, icon: preset.icon });
                          setIconInfo(`Selected preset: ${preset.name}`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#09111a] hover:bg-[#16293d] border border-[#142333] text-[10px] text-slate-300 hover:text-[#38bdf8] transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <img src={preset.icon} alt={preset.name} className="w-3.5 h-3.5 object-contain" />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Order & Upcoming Toggle */}
              <div className="flex items-center gap-3">
                <div className="w-1/2">
                  <label className="block text-slate-300 mb-1 font-medium">Display Order</label>
                  <input
                    type="number"
                    value={platformForm.order}
                    onChange={(e) => setPlatformForm({ ...platformForm, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div className="w-1/2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={platformForm.isUpcoming}
                      onChange={(e) => setPlatformForm({ ...platformForm, isUpcoming: e.target.checked })}
                      className="w-4 h-4 rounded border-[#1e2f42] text-[#38bdf8] focus:ring-0"
                    />
                    <span>Show in Upcoming</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#141f2d]">
                <button
                  type="submit"
                  disabled={platformSaving || iconCompressing}
                  className="px-5 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {platformSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{platformSaving ? 'Saving...' : 'Save Platform'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#131d2b] hover:bg-[#1c2a3d] text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: MULTIPLE BANNERS MANAGER */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#090e17] border border-[#1e2f42] p-6 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#141f2d] mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Promotional Banners</h3>
                <p className="text-xs text-slate-400">
                  Add as many banners as you want for the home carousel
                </p>
              </div>
              <button
                onClick={() => setBannerModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0f1925] flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If adding a new banner or editing */}
            {isAddingBanner ? (
              <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#38bdf8]">
                    {bannerForm.id ? 'Edit Banner' : 'Add New Banner'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBanner(false);
                      setBannerInfo('');
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Banner Title (Optional)</label>
                  <input
                    type="text"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    placeholder="e.g. Navratri Special Offer / New Batch"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>

                {/* Banner Image with preview & auto-compression */}
                <div className="p-3 rounded-2xl bg-[#0c1520] border border-[#1a293b] space-y-2.5">
                  <label className="block text-slate-200 font-bold text-xs">
                    Banner Image *
                  </label>

                  {bannerInfo && (
                    <div className="text-[11px] font-mono text-[#38bdf8]">
                      {bannerInfo}
                    </div>
                  )}

                  {bannerForm.imageUrl && (
                    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-[#1e2f42] bg-[#09111a] flex items-center justify-center">
                      <img
                        src={bannerForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Upload from Device (Auto-compressed):</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={bannerCompressing}
                      onChange={handleBannerFileUpload}
                      className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#162738] file:text-slate-200 hover:file:bg-[#1e344a] cursor-pointer bg-[#09111a] p-1.5 rounded-xl border border-[#142333]"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Or Paste Image URL:</span>
                    <input
                      type="text"
                      value={bannerForm.imageUrl}
                      onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full px-3 py-2 rounded-xl bg-[#09111a] border border-[#142333] text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                {/* Banner Action URL & Open Mode */}
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Click / Action URL</label>
                  <input
                    type="text"
                    value={bannerForm.actionUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, actionUrl: e.target.value })}
                    placeholder="https://t.me/GBFreestudy"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#0c1520] border border-[#1a293b] space-y-2">
                  <label className="block text-slate-200 font-bold text-xs">
                    Banner Click Target Mode
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBannerForm({ ...bannerForm, openMode: 'internal' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        bannerForm.openMode === 'internal'
                          ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold'
                          : 'bg-[#09111a] border-[#142333] text-slate-400'
                      }`}
                    >
                      <AppWindow className="w-3.5 h-3.5" />
                      <span className="text-[10px]">In-App</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBannerForm({ ...bannerForm, openMode: 'external' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        bannerForm.openMode === 'external'
                          ? 'bg-sky-950 border-sky-400 text-sky-300 font-bold'
                          : 'bg-[#09111a] border-[#142333] text-slate-400'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="text-[10px]">External</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBannerForm({ ...bannerForm, openMode: 'new_tab' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        bannerForm.openMode === 'new_tab'
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold'
                          : 'bg-[#09111a] border-[#142333] text-slate-400'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[10px]">New Tab</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBannerForm({ ...bannerForm, openMode: 'same_tab' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        bannerForm.openMode === 'same_tab'
                          ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#09111a] border-[#142333] text-slate-400'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Same Tab</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={bannerForm.active}
                      onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })}
                      className="w-4 h-4 rounded border-[#1e2f42] text-[#38bdf8]"
                    />
                    <span>Active in Carousel</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141f2d]">
                  <button
                    type="submit"
                    disabled={bannerSaving || bannerCompressing}
                    className="px-5 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    {bannerSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{bannerSaving ? 'Saving...' : 'Save Banner'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingBanner(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#131d2b] hover:bg-[#1c2a3d] text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Banner List */
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setBannerForm({
                      title: '',
                      imageUrl: '',
                      actionUrl: 'https://t.me/GBFreestudy',
                      openMode: 'new_tab',
                      active: true,
                      order: banners.length + 1,
                    });
                    setBannerInfo('');
                    setIsAddingBanner(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Another Banner</span>
                </button>

                <div className="space-y-3">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-[#0c1520] border border-[#172435] flex items-center justify-between gap-3"
                    >
                      <div className="w-20 h-12 rounded-lg bg-black/50 overflow-hidden border border-[#1e2f42] shrink-0">
                        <img
                          src={b.imageUrl}
                          alt={b.title || 'banner'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {b.title || 'Promotional Banner'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className={b.active ? 'text-emerald-400' : 'text-slate-500'}>
                            {b.active ? 'Active' : 'Hidden'}
                          </span>
                          <span>•</span>
                          <span className="font-mono truncate max-w-[120px]">
                            {b.actionUrl || 'No link'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setBannerForm({
                              id: b.id,
                              title: b.title || '',
                              imageUrl: b.imageUrl,
                              actionUrl: b.actionUrl || '',
                              openMode: b.openMode || 'new_tab',
                              active: b.active,
                              order: b.order || 1,
                            });
                            setBannerInfo('');
                            setIsAddingBanner(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#0e3b43] text-[#22d3ee] hover:bg-[#134d58] transition"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(b.id)}
                          className="p-1.5 rounded-lg bg-[#4c0519] text-[#fb7185] hover:bg-[#700924] transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {banners.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-[#1e2f42] rounded-2xl">
                      No banners yet. Click "+ Add Another Banner" to add one!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: BULK IMPORT */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#090e17] border border-[#1e2f42] p-6 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#141f2d] mb-4">
              <h3 className="text-lg font-bold text-white">Bulk Platform Import</h3>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0f1925] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Paste CSV or JSON with columns: <code className="text-[#38bdf8]">name,url,description,icon,openMode</code>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  openMode options: <strong className="text-purple-300">internal</strong> (In-App) | <strong className="text-sky-300">external</strong> (Direct Browser) | <strong className="text-emerald-300">new_tab</strong> | <strong className="text-amber-300">same_tab</strong>
                </span>
              </p>

              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`name,url,description,icon,openMode\nKhan Sir,https://khan.org,Best GS notes,,internal\nTelegram Channel,https://t.me/GBFreestudy,Join Group,,external\nSpecial Batch,https://example.com,New Tab,,new_tab`}
                className="w-full p-3 rounded-xl bg-[#0c1520] border border-[#1a293b] font-mono text-xs text-white outline-none focus:border-[#38bdf8]"
              />

              {importSummary && (
                <div className="p-3 rounded-xl bg-[#0d2a33] border border-[#164e63] text-xs space-y-1">
                  <div className="font-bold text-[#38bdf8]">
                    Import Result: {importSummary.added} added, {importSummary.skipped} skipped
                  </div>
                  {importSummary.errors.length > 0 && (
                    <div className="text-rose-400 text-[11px]">
                      {importSummary.errors.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141f2d]">
                <button
                  type="button"
                  disabled={importLoading}
                  onClick={handleRunBulkImport}
                  className="px-5 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {importLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{importLoading ? 'Importing...' : 'Start Import'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#131d2b] text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: TELEGRAM LINK CONFIG */}
      {telegramModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#090e17] border border-[#1e2f42] p-6 text-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#141f2d] mb-4">
              <h3 className="text-lg font-bold text-white">Telegram Link</h3>
              <button
                onClick={() => setTelegramModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#0f1925] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Channel / Group URL</label>
                <input
                  type="text"
                  value={telegramInputUrl}
                  onChange={(e) => setTelegramInputUrl(e.target.value)}
                  placeholder="https://t.me/GBFreestudy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141f2d]">
                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  className="px-5 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs transition cursor-pointer"
                >
                  Save URL
                </button>
                <button
                  type="button"
                  onClick={() => setTelegramModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#131d2b] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
