# OCR Pro

OCR Pro is a modern, high-performance full-stack web application designed for document scanning, optical character recognition (OCR), manual memo insertion, and document status tracking. It utilizes Gemini AI for intelligent, context-aware text recognition and high-fidelity extraction of structured documents in Russian, Ukrainian, and English.

---

## 🚀 Key Features / Основні функції

### 📂 Document Upload & AI-Powered OCR
- **Supported Formats:** Process `PDF`, `JPG`, `PNG`, and `BMP` files.
- **Batch Processing:** Scan up to 3 documents in parallel.
- **Drag & Drop:** Elegant workspace layout supporting quick drag-and-drop or manual selection.
- **AI-Powered OCR:** Integrates with server-side Gemini AI models for highly accurate optical character recognition, retaining formatting and layout.

### 📝 Smart Text Processing & Formatting
- **Memo Formatting:** Automatically formats paragraphs with traditional 3-space indentation, inserts empty lines between blocks, and cleans common OCR noise.
- **Manual Memo Entry:** Don't have a scanner? Input text directly or use our **Official Document Template** with structured fields: *To (Кому)*, *From (Кто)*, *Subject (Тема)*, and *Body (Текст)*.

### 💾 Robust Persistence & Metadata Tracking
- **Durable Storage:** Connected to **Firebase Firestore** with transparent, automated local fallback tracking via `localStorage` if connection is offline.
- **File Name Persistence:** Saves the original files' names and associates them with the processed records.
- **Accurate Date Tracking:** Displays the original file modified date alongside the scan execution date.

### ⚠️ Duplicate Prevention System
- **Real-Time Duplicate Checking:** Before starting any text recognition, OCR Pro cross-references queued files against saved history records by comparing both the **File Name** and **Last Modification Date**.
- **Intuitive Overlay Alerts:** Displays a customized UI confirmation dialog (avoiding browser alert blocks) if a duplicate file is detected, prompting the user whether to proceed.

### 🔄 Document Status Lifecycle & History
- **Написано (Written):** Detected automatically for manually typed or templated notes.
- **Отсканировано (Scanned):** Set automatically upon completing OCR recognition.
- **Исправлено (Corrected):** Auto-transitions here as soon as a user edits scanned text in the editor.
- **Отослано (Sent) & Выполнено (Completed):** Available for manual selection to track sending and compliance.
- **Status Change History:** Every status modification is recorded chronologically as a history log entry with exact timestamps.
- **Visual Timelines:** View a detailed vertical timeline list of status history for the active document directly in the workspace, plus mini logs inside history cards.
- **Durable Persistence:** The status transition history is stored securely inside the database (Firestore) and localStorage fallback.

### 🔍 Advanced Search & Filtering Engine
- **Text Search Query:** Instantly search through saved documents in real-time by **File Name**, document **Content Text**, or unique document **ID**.
- **Dynamic Sorting:** Sort saved records dynamically by:
  - **Upload Date** (Newest/Oldest first)
  - **Modification/Status Update Date** (Newest/Oldest first)
  - **File Name** (Alphabetical A-Z / Z-A)
- **Advanced Date Filtering:** Narrow down your document history with dedicated calendar pickers matching exact **Upload Date** and/or **Modification Date**.

---

## 🛠 Tech Stack / Технологічний стек

- **Frontend Framework:** React + TypeScript + Vite
- **OCR Engine:** Gemini AI API (Server-side document processing)
- **PDF Renderer:** pdfjs-dist (for PDF to image conversion)
- **Database Engine:** Firebase Firestore (with persistent client fallbacks)
- **Styling:** Tailwind CSS (Modern dark cyberpunk theme, customized sleek custom scrollbars)

---

## 🏁 Quick Start / Як запустити

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```
