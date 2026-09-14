import { getSupabaseAdminClient } from '../utils/supabaseAdmin';
import { sendPushNotification } from './notificationService';

interface NormalizedRecall {
  source: 'openFDA' | 'FSIS';
  externalRecallId: string;
  productDescription: string;
  upcCodes: string[];
  reason: string | null;
  classification: string | null;
  recallDate: string | null;
  rawData: unknown;
}

export interface RecallCheckResult {
  recallsFetched: number;
  matchesFound: number;
  notificationsSent: number;
}

type RecallFeedRow = Record<string, unknown>;

type FridgeItemRow = {
  id: string;
  user_id: string;
  name: string;
  barcode: string | null;
};

type RecallRow = {
  id: string;
  product_description: string;
  upc_codes: string[] | null;
};

type RecallMatchRow = {
  id: string;
  user_id: string;
  fridge_item_id: string;
  recalls: {
    product_description: string;
  } | null;
};

const OPENFDA_ENDPOINT =
  'https://api.fda.gov/food/enforcement.json?search=report_date:[20240101+TO+99991231]&sort=report_date:desc&limit=100';
const FSIS_ENDPOINT = 'https://www.fsis.usda.gov/fsis/api/recall/v/1';

async function fetchOpenFDARecalls(): Promise<NormalizedRecall[]> {
  try {
    const response = await fetch(OPENFDA_ENDPOINT);
    if (!response.ok) {
      console.error(`openFDA fetch failed: ${response.status}`);
      return [];
    }

    const json = (await response.json()) as { results?: RecallFeedRow[] };
    return (json.results ?? []).flatMap((recall): NormalizedRecall[] => {
      const externalRecallId = readString(recall.recall_number);
      if (!externalRecallId) {
        return [];
      }

      const reportDate = readString(recall.report_date);
      return [{
        source: 'openFDA',
        externalRecallId,
        productDescription: readString(recall.product_description) ?? 'Unknown product',
        upcCodes: extractUpcsFromText(readString(recall.code_info) ?? ''),
        reason: readString(recall.reason_for_recall),
        classification: readString(recall.classification),
        recallDate: reportDate ? formatFdaDate(reportDate) : null,
        rawData: recall,
      }];
    });
  } catch (error) {
    console.error('openFDA fetch failed:', error);
    return [];
  }
}

async function fetchFsisRecalls(): Promise<NormalizedRecall[]> {
  try {
    const response = await fetch(FSIS_ENDPOINT, {
      headers: {
        'User-Agent': 'Esca/1.0 (food recall monitoring)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      console.error(`FSIS fetch failed: ${response.status}`);
      return [];
    }

    const json = (await response.json()) as unknown;
    const recalls = Array.isArray(json)
      ? json
      : isRecord(json) && Array.isArray(json.items)
        ? json.items
        : [];

    return recalls.flatMap((entry): NormalizedRecall[] => {
      if (!isRecord(entry)) {
        return [];
      }

      const externalRecallId = readString(entry.field_recall_number) ?? readString(entry.id);
      if (!externalRecallId) {
        return [];
      }

      return [{
        source: 'FSIS',
        externalRecallId,
        productDescription: readString(entry.field_title) ?? readString(entry.field_summary) ?? 'Unknown product',
        upcCodes: [],
        reason: readString(entry.field_recall_reason),
        classification: readString(entry.field_risk_level),
        recallDate: readString(entry.field_recall_date),
        rawData: entry,
      }];
    });
  } catch (error) {
    console.error('FSIS fetch failed:', error);
    return [];
  }
}

function isRecord(value: unknown): value is RecallFeedRow {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function extractUpcsFromText(text: string): string[] {
  const matches = text.match(/\b\d{8}(?:\d{4,5})?\b/g);
  return matches ? [...new Set(matches)] : [];
}

function formatFdaDate(yyyymmdd: string): string | null {
  if (!/^\d{8}$/.test(yyyymmdd)) {
    return null;
  }

  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

async function storeRecalls(recalls: NormalizedRecall[]): Promise<void> {
  if (recalls.length === 0) {
    return;
  }

  const uniqueRecalls = [...new Map(
    recalls.map((recall) => [`${recall.source}:${recall.externalRecallId}`, recall]),
  ).values()];

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('recalls').upsert(
    uniqueRecalls.map((recall) => ({
      source: recall.source,
      external_recall_id: recall.externalRecallId,
      product_description: recall.productDescription,
      upc_codes: recall.upcCodes,
      reason: recall.reason,
      classification: recall.classification,
      recall_date: recall.recallDate,
      raw_data: recall.rawData,
    })),
    { onConflict: 'source,external_recall_id' },
  );

  if (error) {
    throw new Error(`Failed to upsert recalls: ${error.message}`);
  }
}

async function matchRecallsToInventory(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data: items, error: itemsError } = await supabase
    .from('fridge_items')
    .select('id, user_id, name, barcode')
    .eq('status', 'fresh')
    .returns<FridgeItemRow[]>();

  if (itemsError || !items) {
    console.error('Failed to load fridge items for recall matching:', itemsError);
    return 0;
  }

  const { data: recalls, error: recallsError } = await supabase
    .from('recalls')
    .select('id, product_description, upc_codes')
    .gte('recall_date', ninetyDaysAgo())
    .returns<RecallRow[]>();

  if (recallsError || !recalls) {
    console.error('Failed to load recalls for matching:', recallsError);
    return 0;
  }

  const newMatches: Array<{
    recall_id: string;
    user_id: string;
    fridge_item_id: string;
    match_type: 'barcode' | 'name_fuzzy';
    match_confidence: number | null;
  }> = [];

  for (const item of items) {
    const itemName = item.name.trim().toLowerCase();
    for (const recall of recalls) {
      if (item.barcode && recall.upc_codes?.includes(item.barcode)) {
        newMatches.push({
          recall_id: recall.id,
          user_id: item.user_id,
          fridge_item_id: item.id,
          match_type: 'barcode',
          match_confidence: null,
        });
      } else if (itemName.length > 4 && recall.product_description.toLowerCase().includes(itemName)) {
        newMatches.push({
          recall_id: recall.id,
          user_id: item.user_id,
          fridge_item_id: item.id,
          match_type: 'name_fuzzy',
          match_confidence: 0.6,
        });
      }
    }
  }

  if (newMatches.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('recall_matches')
    .upsert(newMatches, { onConflict: 'recall_id,fridge_item_id', ignoreDuplicates: true });

  if (error) {
    console.error('Failed to insert recall matches:', error);
    return 0;
  }

  return newMatches.length;
}

function ninetyDaysAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString().slice(0, 10);
}

async function notifyNewMatches(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data: matches, error } = await supabase
    .from('recall_matches')
    .select('id, user_id, fridge_item_id, recalls(product_description)')
    .eq('notified', false)
    .eq('resolved', false)
    .returns<RecallMatchRow[]>();

  if (error || !matches) {
    console.error('Failed to load unnotified recall matches:', error);
    return 0;
  }

  let notificationsSent = 0;
  for (const match of matches) {
    const description = match.recalls?.product_description ?? 'a product';
    await sendPushNotification(match.user_id, {
      title: 'Recall alert',
      body: `An item in your fridge was recalled: ${description}`,
      data: { type: 'recall', fridgeItemId: match.fridge_item_id },
    });

    const { error: updateError } = await supabase
      .from('recall_matches')
      .update({ notified: true, notified_at: new Date().toISOString() })
      .eq('id', match.id);

    if (updateError) {
      console.error('Failed to mark recall match notified:', updateError);
      continue;
    }

    notificationsSent += 1;
  }

  return notificationsSent;
}

export async function runRecallCheck(): Promise<RecallCheckResult> {
  const [fdaRecalls, fsisRecalls] = await Promise.all([fetchOpenFDARecalls(), fetchFsisRecalls()]);
  const recalls = [...fdaRecalls, ...fsisRecalls];

  await storeRecalls(recalls);
  const matchesFound = await matchRecallsToInventory();
  const notificationsSent = await notifyNewMatches();

  return { recallsFetched: recalls.length, matchesFound, notificationsSent };
}