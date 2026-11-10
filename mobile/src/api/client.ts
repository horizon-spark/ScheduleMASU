import axios from "axios";

// ⚠️ ЗАМЕНИТЕ на реальный адрес вашего API
const BASE_URL = "https://api-schedule.mauniver.ru/";
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  },
});

// Автоматически добавляем токен в заголовок (если он есть)
// api.interceptors.request.use(async (config) => {
//   const token = await SecureStore.getItemAsync("userToken");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });
