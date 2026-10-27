import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSessionApiClient } from "./api-session";

const raw = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const baseUrl = raw && !raw.startsWith("http") ? `https://${raw}` : raw;
const STORAGE_KEY = "blousley.api.session.v1";
const native = Platform.OS !== "web";

const client = createSessionApiClient({
  baseUrl,
  native,
  store: {
    read: () => native ? SecureStore.getItemAsync(STORAGE_KEY) : Promise.resolve(null),
    write: (value) => native
      ? SecureStore.setItemAsync(STORAGE_KEY, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      : Promise.resolve(),
    clear: () => native ? SecureStore.deleteItemAsync(STORAGE_KEY) : Promise.resolve(),
  },
});

export const apiFetch = client.request;
export const getApiSessionCookie = client.cookieHeader;
export const logoutApiSession = client.logout;
export const clearApiSession = client.clear;
