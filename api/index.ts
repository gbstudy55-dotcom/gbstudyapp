import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-memory / file fallback store
const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json');

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    // ignore
  }
  return { platforms: [], banners: [] };
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // on read-only environments
  }
}

// In-memory cache for serverless environments
let memoryDb = readDb();

app.post('/api/admin/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === 'GBADMIN2026') {
    return res.json({ success: true, message: 'Authentication successful' });
  }
  return res.status(401).json({ success: false, message: 'Incorrect Password' });
});

app.get('/api/platforms', (_req: Request, res: Response) => {
  const diskDb = readDb();
  if (Array.isArray(diskDb.platforms) && diskDb.platforms.length > 0) {
    memoryDb.platforms = diskDb.platforms;
  }
  res.json(memoryDb.platforms || []);
});

app.post('/api/platforms', (req: Request, res: Response) => {
  const newPlatform = {
    id: req.body.id || 'plat-' + Date.now(),
    name: req.body.name || 'New Platform',
    subtitle: req.body.subtitle || 'Open platform to explore content.',
    logo: req.body.logo || '/app-icon.png',
    url: req.body.url || '',
    bgColor: req.body.bgColor || '#111827',
    category: req.body.category || 'General',
    batchesCount: req.body.batchesCount || 15,
    openMode: req.body.openMode || 'new_tab',
    tabPlacement: req.body.tabPlacement || 'live',
    createdAt: req.body.createdAt || new Date().toISOString(),
  };

  const existingIndex = (memoryDb.platforms || []).findIndex((p: any) => p.id === newPlatform.id);
  if (existingIndex >= 0) {
    memoryDb.platforms[existingIndex] = { ...memoryDb.platforms[existingIndex], ...newPlatform };
  } else {
    memoryDb.platforms = [newPlatform, ...(memoryDb.platforms || [])];
  }
  writeDb(memoryDb);
  res.status(201).json(newPlatform);
});

app.put('/api/platforms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = (memoryDb.platforms || []).findIndex((p: any) => p.id === id);
  if (index === -1) {
    const created = {
      id,
      name: req.body.name || 'Platform',
      subtitle: req.body.subtitle || '',
      logo: req.body.logo || '/app-icon.png',
      url: req.body.url || '',
      openMode: req.body.openMode || 'new_tab',
      tabPlacement: req.body.tabPlacement || 'live',
      batchesCount: 15,
      ...req.body,
    };
    memoryDb.platforms = [created, ...(memoryDb.platforms || [])];
    writeDb(memoryDb);
    return res.json(created);
  }

  memoryDb.platforms[index] = {
    ...memoryDb.platforms[index],
    ...req.body,
    id,
  };
  writeDb(memoryDb);
  res.json(memoryDb.platforms[index]);
});

app.delete('/api/platforms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  memoryDb.platforms = (memoryDb.platforms || []).filter((p: any) => p.id !== id);
  writeDb(memoryDb);
  res.json({ success: true, id, platforms: memoryDb.platforms });
});

app.get('/api/banners', (_req: Request, res: Response) => {
  const diskDb = readDb();
  if (Array.isArray(diskDb.banners) && diskDb.banners.length > 0) {
    memoryDb.banners = diskDb.banners;
  }
  res.json(memoryDb.banners || []);
});

app.post('/api/banners', (req: Request, res: Response) => {
  const newBanner = {
    id: req.body.id || 'banner-' + Date.now(),
    title: req.body.title || 'New Banner',
    subtitle: req.body.subtitle || '',
    imageUrl: req.body.imageUrl || '/banners/banner_clean_1.jpg',
    actionUrl: req.body.actionUrl || 'https://t.me/GBFreestudy',
    actionType: req.body.actionType || 'platform',
    badgeText: req.body.badgeText || '',
  };

  const existingIndex = (memoryDb.banners || []).findIndex((b: any) => b.id === newBanner.id);
  if (existingIndex >= 0) {
    memoryDb.banners[existingIndex] = { ...memoryDb.banners[existingIndex], ...newBanner };
  } else {
    memoryDb.banners = [...(memoryDb.banners || []), newBanner];
  }
  writeDb(memoryDb);
  res.status(201).json(newBanner);
});

app.put('/api/banners/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = (memoryDb.banners || []).findIndex((b: any) => b.id === id);
  if (index === -1) {
    const created = {
      id,
      title: req.body.title || 'New Banner',
      subtitle: req.body.subtitle || '',
      imageUrl: req.body.imageUrl || '/banners/banner_clean_1.jpg',
      actionUrl: req.body.actionUrl || 'https://t.me/GBFreestudy',
      actionType: req.body.actionType || 'platform',
      badgeText: req.body.badgeText || '',
      ...req.body,
    };
    memoryDb.banners = [...(memoryDb.banners || []), created];
    writeDb(memoryDb);
    return res.json(created);
  }

  memoryDb.banners[index] = {
    ...memoryDb.banners[index],
    ...req.body,
    id,
  };
  writeDb(memoryDb);
  res.json(memoryDb.banners[index]);
});

app.delete('/api/banners/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  memoryDb.banners = (memoryDb.banners || []).filter((b: any) => b.id !== id);
  writeDb(memoryDb);
  res.json({ success: true, id });
});

export default app;
