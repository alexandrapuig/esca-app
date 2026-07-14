import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fridgeService } from "../../services/fridgeService";

export default function AddFridgeItemScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedExpiry, setEstimatedExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("item");
  const router = useRouter();

  const handleAdd = async () => {
    if (!name || !category || !estimatedExpiry) {
      Alert.alert("Validation", "Please complete all required fields.");
      return;
    }

    const result = await fridgeService.addItem({
      name,
      category,
      estimated_expiry: estimatedExpiry,
      quantity: Number(quantity),
      unit,
      status: "active",
      storage_location: "fridge"
    });

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to add item.");
      return;
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Item</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      <TextInput
        style={styles.input}
        placeholder="Estimated expiry (YYYY-MM-DD)"
        value={estimatedExpiry}
        onChangeText={setEstimatedExpiry}
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
      <TextInput style={styles.input} placeholder="Unit" value={unit} onChangeText={setUnit} />
      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Save Item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc"
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 14,
    color: "#0f172a"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  }
});
