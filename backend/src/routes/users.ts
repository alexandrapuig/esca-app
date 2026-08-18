import { Router, Request, Response } from 'express';
import { requireAuth } from '../utils/auth';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const router = Router();

router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdminClient();
    const userId = (req as any).user.id;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, dietary_restrictions, cuisine_preferences, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
