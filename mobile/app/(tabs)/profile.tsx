import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";
import { apiClient } from "../../services/api";
import { UserStats } from "../../types";

const defaultStats: UserStats = {
  items_consumed_count: 0,
  waste_prevented_kg: 0,
  co2_saved_kg: 0,
  money_saved: 0
};

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "nut-free", label: "Nut-free" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "keto", label: "Keto" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" }
];

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const [profileResponse, statsResponse] = await Promise.all([
      userService.getProfile(),
      apiClient.get<UserStats>("/api/users/stats")
    ]);

    if (profileResponse.success && profileResponse.data) {
      setEmail(profileResponse.data.email);
      setName(profileResponse.data.name || "");
      setDietaryRestrictions(profileResponse.data.dietary_restrictions || []);
    } else {
      const user = await authService.getCurrentUser();
      setEmail(user?.email || "Unknown user");
    }

    if (statsResponse.success && statsResponse.data) {
      setStats(statsResponse.data);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const toggleDietary = (id: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await userService.updateProfile({ name, dietary_restrictions: dietaryRestrictions });
    setSaving(false);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to update profile.");
      return;
    }

    Alert.alert("Success", "Profile updated.");
  };

  const handleSignOut = async () => {
    const result = await authService.signOut();

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to sign out.");
      return;
    }

    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{email}</Text>

      <Text style={styles.sectionLabel}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        style={styles.input}
      />

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Dietary Preferences</Text>
      <View style={styles.chipRow}>
        {DIETARY_OPTIONS.map((option) => {
          const active = dietaryRestrictions.includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => toggleDietary(option.id)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={active ? styles.chipTextActive : styles.chipText}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.statsGrid, { marginTop: 20 }]}>
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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.signOutText}>{saving ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    color: "#0f172a"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff"
  },
  chipActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff"
  },
  chipText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500"
  },
  chipTextActive: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "600"
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
  saveButton: {
    marginTop: 20,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center"
  },
  signOutButton: {
    marginTop: 12,
    marginBottom: 24,
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
