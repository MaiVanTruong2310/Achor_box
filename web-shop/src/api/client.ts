/**
 * API Client Configuration
 * Ở Giai đoạn 1: VITE_USE_MOCK=true sẽ sử dụng Adapter gọi mock service.
 * Ở Giai đoạn 2: Chỉ cần đổi implementation trong api layer kết nối trực tiếp Spring Boot REST API.
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  timeoutMs: 8000,
};

// Helper tạo delay giả lập mạng để trải nghiệm UX chân thực (loading state, skeleton)
export const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
