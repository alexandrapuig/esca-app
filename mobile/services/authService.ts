import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { ApiResponse } from "../types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authService = {
  async signUp(email: string, password: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  },

  async signIn(email: string, password: string): Promise<ApiResponse<null>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session?.access_token) {
      return { success: false, error: error?.message || "Failed to sign in" };
    }

    await AsyncStorage.setItem("auth_token", data.session.access_token);
    return { success: true, data: null };
  },

  async signOut(): Promise<ApiResponse<null>> {
    await AsyncStorage.removeItem("auth_token");
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  },

  async getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }
};
