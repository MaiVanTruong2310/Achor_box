# SmartBox - Hệ Thống Quản Lý Tủ Đồ Thông Minh (Đồ Án Nhóm 6)

Dự án Đồ án Tốt nghiệp - Hệ thống quản lý và vận hành tủ đồ thông minh (Smart Locker System) tích hợp IoT, API backend và giao diện quản trị Web Admin.

---

## 📁 Cấu Trúc Dự Án (Monorepo)

```text
DoAnNhom6/
├── backend/            # Spring Boot REST API (Java 17, Gradle, PostgreSQL/Supabase)
├── web-admin/          # Giao diện Quản trị viên (React, TypeScript, Vite, Tailwind CSS)
├── .gitignore          # File cấu hình bỏ qua file rác / dependencies / bảo mật .env
└── README.md           # Tài liệu hướng dẫn dự án
```

---

## 🌿 Cấu Trúc Phân Nhánh (Branch Strategy)

Dự án được phân chia thành các nhánh làm việc rõ ràng:

- **`main`**: Nhánh chính (Production / Stable), chứa đầy đủ cả `backend/` và `web-admin/`.
- **`backend`**: Nhánh phát triển các tính năng dành cho Backend REST API.
- **`web-admin`**: Nhánh phát triển các tính năng giao diện người dùng Quản trị viên (Web Admin).

> 💡 **Quy trình làm việc nhóm:**
> - Thành viên phụ trách Backend làm việc trên nhánh `backend`.
> - Thành viên phụ trách Web Admin làm việc trên nhánh `web-admin`.
> - Khi hoàn thành tính năng ổn định, tạo Pull Request để merge vào nhánh `main`.

---

## ⚙️ Hướng Dẫn Khởi Chạy Backend (`backend/`)

### 1. Yêu cầu môi trường
- **Java JDK**: Phiên bản 17 trở lên
- **Gradle**: 7.x hoặc 8.x (hoặc sử dụng sẵn Gradle Wrapper đi kèm)
- **Database**: PostgreSQL (kết nối trực tiếp tới Supabase hoặc PostgreSQL local)

### 2. Khởi chạy
Di chuyển vào thư mục backend:
```bash
cd backend
```

Chạy ứng dụng với Gradle Wrapper:
- Trên Windows (PowerShell / CMD):
  ```powershell
  .\gradlew.bat bootRun
  ```
- Trên Linux / macOS:
  ```bash
  ./gradlew bootRun
  ```

Sau khi chạy thành công:
- **Server URL**: `http://localhost:8080`
- **Swagger UI (Tài liệu API)**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`

---

## 💻 Hướng Dẫn Khởi Chạy Web Admin (`web-admin/`)

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 18 trở lên
- **NPM** hoặc **Yarn** / **PNPM**

### 2. Cài đặt biến môi trường
Di chuyển vào thư mục web-admin:
```bash
cd web-admin
```

Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell: `Copy-Item .env.example .env`)*

Cập nhật thông tin Supabase URL, Anon Key và Backend API URL trong file `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BACKEND_API_URL=http://localhost:8080/api
```

### 3. Cài đặt thư viện và khởi chạy
```bash
npm install
npm run dev
```

Truy cập hệ thống quản trị tại: `http://localhost:5173`

---

## 👥 Nhóm Tác Giả
- **Đồ án Nhóm 6** - Học Viện Ngân Hàng
- Repository GitHub: [https://github.com/QDat18/DoAnNhom6](https://github.com/QDat18/DoAnNhom6)
