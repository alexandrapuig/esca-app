import { Router, type Request } from 'express';

import {
  createFridgeItem,
  deleteFridgeItem,
  listFridgeItems,
  updateFridgeItemStatus,
} from '../services/fridgeService';
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
};

type UpdateFridgeItemBody = {
  status?: string;
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

  const result = await createFridgeItem(createInput);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
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

  if (body.status !== 'consumed' && body.status !== 'expired' && body.status !== 'fresh') {
    res.status(400).json({
      success: false,
      error: 'Status must be one of: fresh, consumed, expired',
    });
    return;
  }

  const result = await updateFridgeItemStatus({
    householdId: request.user.householdId,
    itemId,
    status: body.status,
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
