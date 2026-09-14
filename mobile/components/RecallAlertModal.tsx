import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { recallService } from "../services/recallService";
import { RecallMatch } from "../types";

interface Props {
  matches: RecallMatch[];
  visible: boolean;
  onAllResolved: () => void;
  onResolved?: (matchId: string, itemDeleted: boolean) => void;
}

export default function RecallAlertModal({ matches, visible, onAllResolved, onResolved }: Props) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIndex((currentIndex) => Math.min(currentIndex, Math.max(matches.length - 1, 0)));
  }, [matches.length]);

  const current = matches[index];

  if (!current) {
    return null;
  }

  const recall = current.recalls;
  const item = current.fridge_items;
  const isUncertainMatch = current.match_type === "name_fuzzy";

  async function handleResolve(deleteItem: boolean) {
    setBusy(true);
    setError(null);

    try {
      const result = await recallService.resolveMatch(current.id, deleteItem);

      if (!result.success || !result.data) {
        setError(result.error ?? "Could not update this alert. Please try again.");
        return;
      }

      onResolved?.(current.id, result.data.itemDeleted);

      if (index + 1 < matches.length) {
        setIndex(index + 1);
      } else {
        setIndex(0);
        onAllResolved();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <Text style={styles.badge}>FOOD RECALL</Text>

            {matches.length > 1 && (
              <Text style={styles.counter}>
                {index + 1} of {matches.length}
              </Text>
            )}

            <Text style={styles.itemName}>{item?.name ?? "An item in your kitchen"}</Text>

            <Text style={styles.sectionLabel}>Recalled product</Text>
            <Text style={styles.body}>{recall?.product_description ?? "Product details unavailable"}</Text>

            {recall?.reason && (
              <>
                <Text style={styles.sectionLabel}>Reason for recall</Text>
                <Text style={styles.body}>{recall.reason}</Text>
              </>
            )}

            {recall?.classification && (
              <>
                <Text style={styles.sectionLabel}>Severity</Text>
                <Text style={styles.body}>{recall.classification}</Text>
              </>
            )}

            {isUncertainMatch && (
              <View style={styles.uncertainNote}>
                <Text style={styles.uncertainText}>
                  This was matched by product name, so it may not be the exact item you have. Check the
                  packaging against the recall details before deciding.
                </Text>
              </View>
            )}

            <Text style={styles.sourceNote}>
              Source: {recall?.source === "FSIS" ? "USDA FSIS" : "FDA"}
              {recall?.recall_date ? ` - ${recall.recall_date}` : ""}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            {busy ? (
              <ActivityIndicator style={styles.spinner} />
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.destructive]}
                  onPress={() => handleResolve(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.destructiveText}>Throw it out and remove from my kitchen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondary]}
                  onPress={() => handleResolve(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>I've handled this - keep the item</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  cardContent: {
    padding: 24,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#B42318",
    marginBottom: 4,
  },
  counter: {
    fontSize: 12,
    color: "#667085",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#101828",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#667085",
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: "#344054",
  },
  uncertainNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFFAEB",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F79009",
  },
  uncertainText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#93370D",
  },
  sourceNote: {
    fontSize: 12,
    color: "#98A2B3",
    marginTop: 16,
  },
  error: {
    fontSize: 14,
    color: "#B42318",
    marginTop: 12,
  },
  spinner: {
    marginTop: 24,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  destructive: {
    backgroundColor: "#D92D20",
  },
  destructiveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "#F2F4F7",
  },
  secondaryText: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});