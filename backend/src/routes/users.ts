import { Router, Request, Response } from 'express';
import { requireAuth } from '../utils/auth';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const router = Router();

router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Fetching user profile for user:', (req as any).user?.id);
    
    const supabase = getSupabaseAdminClient();
    const userId = (req as any).user.id;

    console.log('Making Supabase query for userId:', userId);

    const { data, error } = await supabase
      .from('users')
      .select('id, email, dietary_restrictions, cuisine_preferences, created_at')
      .eq('id', userId)
      .single();

    console.log('Supabase query result:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!data) {
      console.error('No data returned from query');
      return res.status(404).json({ error: 'User profile not found' });
    }

    console.log('Successfully fetched user profile');
    res.json(data);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching user profile:', error);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
