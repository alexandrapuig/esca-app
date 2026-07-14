import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { fridgeService } from "../../services/fridgeService";
import { storageService } from "../../services/storage";
import { FridgeItem } from "../../types";

function getDaysRemaining(expiryDate: string): number {
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

function getRiskColor(days: number): string {
  if (days > 7) {
    return "#16a34a";
  }

  if (days >= 3) {
    return "#ca8a04";
  }

  return "#dc2626";
}

export default function PantryScreen() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    setRefreshing(true);
    const response = await fridgeService.getItems();

    if (response.success && response.data) {
      const pantry = response.data.filter((item) => item.storage_location === "pantry");
      setItems(pantry);
      await storageService.saveFridgeItems(response.data);
      await storageService.setLastSyncTime();
    } else {
      const cached = await storageService.getFridgeItems();
      setItems(cached.filter((item) => item.storage_location === "pantry"));
    }

    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const handleDelete = async (id: string) => {
    const result = await fridgeService.deleteItem(id);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to delete item.");
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Your pantry is empty.</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadItems} />}
        renderItem={({ item }) => {
          const daysRemaining = getDaysRemaining(item.estimated_expiry);
          const riskColor = getRiskColor(daysRemaining);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: riskColor }]}>
                  <Text style={styles.badgeText}>{daysRemaining}d</Text>
                </View>
              </View>
              <Text style={styles.meta}>{item.category}</Text>
              <Text style={styles.meta}>Expiry: {new Date(item.estimated_expiry).toDateString()}</Text>
              <Text style={styles.meta}>Days remaining: {daysRemaining}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={emptyState}
        contentContainerStyle={items.length === 0 ? styles.listEmpty : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  meta: {
    color: "#475569",
    marginTop: 4
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  deleteText: {
    marginTop: 8,
    color: "#dc2626",
    fontWeight: "600"
  },
  emptyState: {
    alignItems: "center"
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    textAlign: "center"
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center"
  }
});
