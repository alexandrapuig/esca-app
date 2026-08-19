// ============================================================================
// STEP 2B: src/routes/users.ts
// Copy this ENTIRE file and replace your existing routes/users.ts
// Run this AFTER Step 1 (database migration) completes
// ============================================================================

import { Router, Request, Response } from 'express';
import { requireAuth } from '../utils/auth';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const router = Router();

router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request' });
    }

    const supabase = getSupabaseAdminClient();
    
    // FIX #2: cuisine_preferences column now exists in schema
    // This column was previously missing from the users table schema
    // Now that Step 1 (database migration) has run, this column exists and contains
    // the user's preferred cuisine types as a TEXT[] array
    const { data, error } = await supabase
      .from('users')
      .select('id, email, dietary_restrictions, cuisine_preferences, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(400).json({ 
        error: 'Supabase query failed',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      details: errorMessage
    });
  }
});

export default router;
