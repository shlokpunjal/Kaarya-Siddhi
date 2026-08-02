export const API_BASE_URL = 'http://192.168.31.88:8000'

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Check your .env file.");
}
