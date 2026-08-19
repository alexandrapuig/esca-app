import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import barcodeRoutes from './routes/barcode';
import fridgeRoutes from './routes/fridge';
import predictionsRoutes from './routes/predictions';
import recipesRoutes from './routes/recipes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/fridge', fridgeRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/recipes', recipesRoutes);

app.get('/debug/env', (_req, res) => {
  res.json({
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    supabaseVarNames: Object.keys(process.env).filter((k) =>
      k.toUpperCase().includes('SUPA')
    ),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
