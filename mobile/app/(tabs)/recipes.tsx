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
import { recipeService } from "../../services/recipeService";
import { storageService } from "../../services/storage";
import { RecipeSuggestion } from "../../types";

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecipes = useCallback(async () => {
    const response = await recipeService.getRecipes();

    if (response.success && response.data) {
      setRecipes(response.data);
      await storageService.saveRecipes(response.data);
    } else {
      const cached = await storageService.getRecipes();
      setRecipes(cached);
    }
  }, []);

  const refreshRecipes = useCallback(async () => {
    setRefreshing(true);
    const generated = await recipeService.generateRecipes();

    if (generated.success && generated.data) {
      setRecipes(generated.data);
      await storageService.saveRecipes(generated.data);
    } else {
      Alert.alert("Error", generated.error || "Failed to generate recipes.");
    }

    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const handleMarkCooked = async (id: string) => {
    const result = await recipeService.markCooked(id);
    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to update recipe.");
      return;
    }

    setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, user_cooked: true } : recipe)));
  };

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No recipes yet. Add items to your fridge!</Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshRecipes} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.recipe_name}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.meta}>Prep time: {item.prep_time_minutes} mins</Text>
            <Text style={styles.meta}>Difficulty: {item.difficulty}</Text>
            <TouchableOpacity
              style={[styles.button, item.user_cooked && styles.buttonDisabled]}
              onPress={() => handleMarkCooked(item.id)}
              disabled={item.user_cooked}
            >
              <Text style={styles.buttonText}>{item.user_cooked ? "Cooked" : "Mark Cooked"}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={emptyState}
        contentContainerStyle={recipes.length === 0 ? styles.listEmpty : undefined}
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
    marginBottom: 12
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a"
  },
  description: {
    marginTop: 6,
    color: "#334155"
  },
  meta: {
    marginTop: 6,
    color: "#64748b"
  },
  button: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  buttonDisabled: {
    backgroundColor: "#64748b"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700"
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
