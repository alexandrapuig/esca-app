import dotenv from 'dotenv';
dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import barcodeRoutes from './routes/barcode';
import fridgeRoutes from './routes/fridge';
import predictionsRoutes from './routes/predictions';
import recipesRoutes from './routes/recipes';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('⚠ ALLOWED_ORIGINS not set — allowing all origins.');
}

app.use(
  cors({
    origin(origin, callback) {
      if (allowedOrigins.length === 0) return callback(null, true);
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
  })
);

// Barcode identify accepts base64 images; the 100kb default rejects them.
app.use(express.json({ limit: '10mb' }));

app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/fridge', fridgeRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/recipes', recipesRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
