import { Router, type Request } from 'express';

import { runRecallCheck } from '../services/recallService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const router = Router();

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

router.get('/matches', requireAuth, async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const { data, error } = await getSupabaseAdminClient()
    .from('recall_matches')
    .select(
      'id, match_type, match_confidence, created_at, fridge_items(id, name, category), recalls(product_description, reason, classification, recall_date, source)',
    )
    .eq('user_id', request.user.id)
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch recall matches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recall matches' });
    return;
  }

  res.status(200).json({ success: true, data: data ?? [] });
});

router.post('/matches/:id/resolve', requireAuth, async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const matchId = req.params.id;
  const deleteItem = Boolean((req.body as { deleteItem?: boolean } | undefined)?.deleteItem);

  const supabase = getSupabaseAdminClient();

  const { data: match, error: fetchError } = await supabase
    .from('recall_matches')
    .select('id, fridge_item_id, user_id')
    .eq('id', matchId)
    .eq('user_id', request.user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to look up recall match:', fetchError);
    res.status(500).json({ success: false, error: 'Failed to resolve recall match' });
    return;
  }

  if (!match) {
    res.status(404).json({ success: false, error: 'Recall match not found' });
    return;
  }

  const { error: updateError } = await supabase
    .from('recall_matches')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('user_id', request.user.id);

  if (updateError) {
    console.error('Failed to resolve recall match:', updateError);
    res.status(500).json({ success: false, error: 'Failed to resolve recall match' });
    return;
  }

  if (deleteItem && match.fridge_item_id) {
    const { error: deleteError } = await supabase
      .from('fridge_items')
      .delete()
      .eq('id', match.fridge_item_id)
      .eq('user_id', request.user.id);

    if (deleteError) {
      console.error('Resolved match but failed to delete item:', deleteError);
      res.status(200).json({
        success: true,
        data: { resolved: true, itemDeleted: false },
        warning: 'Recall dismissed, but the item could not be removed.',
      });
      return;
    }
  }

  res.status(200).json({
    success: true,
    data: { resolved: true, itemDeleted: deleteItem },
  });
});

router.post('/check', async (req, res) => {
  const jobSecret = process.env.RECALL_JOB_SECRET;

  if (!jobSecret) {
    console.error('RECALL_JOB_SECRET is not configured');
    res.status(503).json({ success: false, error: 'Recall job is not configured' });
    return;
  }

  if (req.header('x-recall-job-secret') !== jobSecret) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const result = await runRecallCheck();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Recall check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to run recall check',
    });
  }
});

export default router;