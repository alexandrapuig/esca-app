import { Router } from 'express';

import { identifyBarcode } from '../services/barcodeService';
import { requireAuth } from '../utils/auth';

type BarcodeIdentifyBody = {
  barcode?: string;
  barcodeImage?: string;
};

const router = Router();

router.use(requireAuth);

router.post('/identify', async (req, res) => {
  const body = req.body as BarcodeIdentifyBody;

  if (!body.barcode?.trim()) {
    res.status(400).json({
      success: false,
      error: 'Barcode is required',
    });
    return;
  }

  const identifyInput: {
    barcode: string;
    barcodeImage?: string;
  } = {
    barcode: body.barcode,
  };

  if (typeof body.barcodeImage === 'string') {
    identifyInput.barcodeImage = body.barcodeImage;
  }

  const result = await identifyBarcode(identifyInput);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: result.data,
  });
});

export default router;
