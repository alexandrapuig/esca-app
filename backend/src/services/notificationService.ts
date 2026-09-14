import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Stable notification interface until Expo push registration is wired up.
 * Callers can use it now without depending on the eventual delivery provider.
 */
export async function sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
  const { data: user, error } = await getSupabaseAdminClient()
    .from('users')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.log(
      `[notificationService STUB] Could not read push token for ${userId} ` +
        `(${error.message}). Would have sent: "${payload.title}" - ${payload.body}`,
    );
    return;
  }

  const token = (user as { expo_push_token?: string } | null)?.expo_push_token;

  if (!token) {
    console.log(
      `[notificationService STUB] No push token for user ${userId}. ` +
        `Would have sent: "${payload.title}" - ${payload.body}`,
    );
    return;
  }

  console.log(`[notificationService STUB] Would send push to ${token}: "${payload.title}"`);
}