import { useCallback, useEffect, useState } from "react";

import { recallService } from "../services/recallService";
import { RecallMatch } from "../types";

export function useRecallAlerts(enabled: boolean = true) {
  const [matches, setMatches] = useState<RecallMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    try {
      const result = await recallService.getMatches();

      if (!result.success) {
        console.error("Failed to load recall alerts:", result.error);
        return;
      }

      const recallMatches = result.data ?? [];
      setMatches(recallMatches);
      if (recallMatches.length > 0) {
        setDismissed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAllResolved = useCallback(() => {
    setDismissed(true);
    void refresh();
  }, [refresh]);

  return {
    matches,
    loading,
    showModal: enabled && !dismissed && matches.length > 0,
    refresh,
    handleAllResolved,
  };
}