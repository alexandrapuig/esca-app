import { Router, type Request } from 'express';

import {
  createFridgeItem,
  deleteFridgeItem,
  listFridgeItems,
  updateFridgeItem,
} from '../services/fridgeService';
import { learnBarcode } from '../services/barcodeService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';

type CreateFridgeItemBody = {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  typical_shelf_life_days?: number;
  brand?: string;
  purchase_location?: string;
  purchase_price?: number;
  notes?: string;
  purchase_date?: string;
  barcode?: string;
};

type UpdateFridgeItemBody = {
  name?: string;
  category?: string;
  quantity?: number | null;
  unit?: string | null;
  typical_shelf_life_days?: number | null;
  estimated_expiry?: string | null;
  purchase_date?: string;
  status?: string;
  brand?: string | null;
  purchase_location?: string | null;
  purchase_price?: number | null;
  notes?: string | null;
};

const router = Router();

router.use(requireAuth);

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

router.post('/items', async (req, res) => {
  const body = req.body as CreateFridgeItemBody;
  const request = getAuthenticatedRequest(req);

  if (!body.name?.trim()) {
    res.status(400).json({
      success: false,
      error: 'Item name is required',
    });
    return;
  }

  const createInput: {
    userId: string;
    householdId: string;
    name: string;
    category?: string;
    quantity?: number;
    unit?: string;
    typicalShelfLifeDays?: number;
    brand?: string;
    purchaseLocation?: string;
    purchasePrice?: number;
    notes?: string;
    purchaseDate?: string;
    barcode?: string;
  } = {
    userId: request.user.id,
    householdId: request.user.householdId,
    name: body.name,
  };

  if (typeof body.category === 'string') {
    createInput.category = body.category;
  }

  if (typeof body.quantity === 'number') {
    createInput.quantity = body.quantity;
  }

  if (typeof body.unit === 'string') {
    createInput.unit = body.unit;
  }

  if (typeof body.typical_shelf_life_days === 'number') {
    createInput.typicalShelfLifeDays = body.typical_shelf_life_days;
  }

  if (typeof body.brand === 'string') {
    createInput.brand = body.brand;
  }

  if (typeof body.purchase_location === 'string') {
    createInput.purchaseLocation = body.purchase_location;
  }

  if (typeof body.purchase_price === 'number') {
    createInput.purchasePrice = body.purchase_price;
  }

  if (typeof body.notes === 'string') {
    createInput.notes = body.notes;
  }

  if (typeof body.purchase_date === 'string') {
    createInput.purchaseDate = body.purchase_date;
  }

  if (typeof body.barcode === 'string' && body.barcode.trim()) {
    createInput.barcode = body.barcode;
  }

  const result = await createFridgeItem(createInput);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  // Learn the barcode from what the user actually entered, so the next person
  // to scan it gets a real answer. Awaited but never fatal - the item is
  // already created and learnBarcode swallows its own failures.
  if (typeof body.barcode === 'string' && body.barcode.trim()) {
    await learnBarcode({
      barcode: body.barcode,
      name: result.data.name,
      category: result.data.category ?? 'other',
      quantityText: result.data.quantity
        ? `${result.data.quantity}${result.data.unit ? ` ${result.data.unit}` : ''}`
        : null,
      brand: result.data.brand,
      typicalShelfLifeDays: result.data.typicalShelfLifeDays,
    });
  }

  res.status(201).json({
    success: true,
    data: result.data,
  });
});

router.get('/items', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  const listInput: {
    householdId: string;
    status?: string;
  } = {
    householdId: request.user.householdId,
  };

  if (typeof status === 'string') {
    listInput.status = status;
  }

  const result = await listFridgeItems(listInput);

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

router.put('/items/:id', async (req, res) => {
  const body = req.body as UpdateFridgeItemBody;
  const request = getAuthenticatedRequest(req);
  const itemId = req.params.id;

  // status is now one optional field among many rather than required. Only
  // validated when present, so status-only calls behave exactly as before.
  if (
    body.status !== undefined &&
    body.status !== 'consumed' &&
    body.status !== 'expired' &&
    body.status !== 'fresh'
  ) {
    res.status(400).json({
      success: false,
      error: 'Status must be one of: fresh, consumed, expired',
    });
    return;
  }

  const updateInput: Parameters<typeof updateFridgeItem>[0] = {
    householdId: request.user.householdId,
    itemId,
  };

  if (typeof body.name === 'string') {
    updateInput.name = body.name;
  }

  if (typeof body.category === 'string') {
    updateInput.category = body.category;
  }

  if (body.quantity !== undefined) {
    updateInput.quantity = body.quantity;
  }

  if (body.unit !== undefined) {
    updateInput.unit = body.unit;
  }

  if (body.typical_shelf_life_days !== undefined) {
    updateInput.typicalShelfLifeDays = body.typical_shelf_life_days;
  }

  if (body.estimated_expiry !== undefined) {
    updateInput.estimatedExpiry = body.estimated_expiry;
  }

  if (typeof body.purchase_date === 'string') {
    updateInput.purchaseDate = body.purchase_date;
  }

  if (body.status !== undefined) {
    updateInput.status = body.status;
  }

  if (body.brand !== undefined) {
    updateInput.brand = body.brand;
  }

  if (body.purchase_location !== undefined) {
    updateInput.purchaseLocation = body.purchase_location;
  }

  if (body.purchase_price !== undefined) {
    updateInput.purchasePrice = body.purchase_price;
  }

  if (body.notes !== undefined) {
    updateInput.notes = body.notes;
  }

  const result = await updateFridgeItem(updateInput);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  // Correcting an item is the most natural moment to fix a wrong category, so
  // edits teach the cache too - not just creation. Keyed on the barcode stored
  // on the item, so manually added items teach nothing.
  if (result.data.barcode) {
    await learnBarcode({
      barcode: result.data.barcode,
      name: result.data.name,
      category: result.data.category ?? 'other',
      quantityText: result.data.quantity
        ? `${result.data.quantity}${result.data.unit ? ` ${result.data.unit}` : ''}`
        : null,
      brand: result.data.brand,
      typicalShelfLifeDays: result.data.typicalShelfLifeDays,
    });
  }

  res.status(200).json({
    success: true,
    data: result.data,
  });
});

router.delete('/items/:id', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const itemId = req.params.id;

  const result = await deleteFridgeItem({
    householdId: request.user.householdId,
    itemId,
  });

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.status(200).json({
    success: true,
  });
});

export default router;
