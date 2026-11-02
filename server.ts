import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.resolve(__dirname, 'data', 'database.json');

// Helper to read DB safely
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { platforms: [], banners: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { platforms: [], banners: [] };
  }
}

// Helper to write DB safely
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parsing for JSON and file uploads (base64 image URLs)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- API Routes ---

  // Admin login check
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === 'GBADMIN2026') {
      res.json({ success: true, message: 'Authentication successful' });
    } else {
      res.status(401).json({ success: false, message: 'Incorrect Password' });
    }
  });

  // 1. Platforms Endpoints
  app.get('/api/platforms', (req: Request, res: Response) => {
    const db = readDb();
    res.json(db.platforms || []);
  });

  app.post('/api/platforms', (req: Request, res: Response) => {
    const db = readDb();
    const newPlatform = {
      id: req.body.id || 'plat-' + Date.now(),
      name: req.body.name || 'New Platform',
      subtitle: req.body.subtitle || 'Open platform to explore content.',
      logo: req.body.logo || '/app-icon.png',
      url: req.body.url || '',
      bgColor: req.body.bgColor || '#111827',
      category: req.body.category || 'General',
      batchesCount: req.body.batchesCount || 10,
      openMode: req.body.openMode || 'internal',
      tabPlacement: req.body.tabPlacement || 'live',
      createdAt: new Date().toISOString(),
    };

    db.platforms = [newPlatform, ...(db.platforms || [])];
    writeDb(db);
    res.status(201).json(newPlatform);
  });

  app.put('/api/platforms/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const index = db.platforms.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    db.platforms[index] = {
      ...db.platforms[index],
      ...req.body,
      id, // keep immutable id
    };
    writeDb(db);
    res.json(db.platforms[index]);
  });

  app.delete('/api/platforms/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    db.platforms = (db.platforms || []).filter((p: any) => p.id !== id);
    writeDb(db);
    res.json({ success: true, id });
  });

  // 2. Banners Endpoints
  app.get('/api/banners', (req: Request, res: Response) => {
    const db = readDb();
    res.json(db.banners || []);
  });

  app.post('/api/banners', (req: Request, res: Response) => {
    const db = readDb();
    const newBanner = {
      id: req.body.id || 'banner-' + Date.now(),
      title: req.body.title || 'New Banner',
      subtitle: req.body.subtitle || 'GB STUDY Announcement',
      imageUrl: req.body.imageUrl || '/banners/banner_clean_1.jpg',
      actionUrl: req.body.actionUrl || 'https://t.me/GBSTUDY',
      actionType: req.body.actionType || 'platform',
      badgeText: req.body.badgeText || '',
      authorText: req.body.authorText || 'SARVOTTAM YADAV',
      handleText: req.body.handleText || '@GBSTUDY',
    };

    db.banners = [...(db.banners || []), newBanner];
    writeDb(db);
    res.status(201).json(newBanner);
  });

  app.put('/api/banners/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const index = db.banners.findIndex((b: any) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    db.banners[index] = {
      ...db.banners[index],
      ...req.body,
      id,
    };
    writeDb(db);
    res.json(db.banners[index]);
  });

  app.delete('/api/banners/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    db.banners = (db.banners || []).filter((b: any) => b.id !== id);
    writeDb(db);
    res.json({ success: true, id });
  });

  // Static uploads directory if needed
  app.use('/public', express.static(path.resolve(__dirname, 'public')));

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GB STUDY Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
