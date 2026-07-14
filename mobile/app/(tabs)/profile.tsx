import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authService } from "../../services/authService";
import { apiClient } from "../../services/api";
import { UserStats } from "../../types";

const defaultStats: UserStats = {
  items_consumed_count: 0,
  waste_prevented_kg: 0,
  co2_saved_kg: 0,
  money_saved: 0
};

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    const user = await authService.getCurrentUser();
    setEmail(user?.email || "Unknown user");

    const response = await apiClient.get<UserStats>("/api/users/stats");
    if (response.success && response.data) {
      setStats(response.data);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    const result = await authService.signOut();

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to sign out.");
      return;
    }

    router.replace("/auth/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Items Tracked</Text>
          <Text style={styles.cardValue}>{stats.items_consumed_count}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Waste Prevented (kg)</Text>
          <Text style={styles.cardValue}>{stats.waste_prevented_kg.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CO2 Saved (kg)</Text>
          <Text style={styles.cardValue}>{stats.co2_saved_kg.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Money Saved</Text>
          <Text style={styles.cardValue}>${stats.money_saved.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a"
  },
  email: {
    marginTop: 8,
    marginBottom: 16,
    color: "#334155"
  },
  statsGrid: {
    gap: 10
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14
  },
  cardLabel: {
    color: "#64748b"
  },
  cardValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a"
  },
  signOutButton: {
    marginTop: 24,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center"
  },
  signOutText: {
    color: "#ffffff",
    fontWeight: "700"
  }
});
