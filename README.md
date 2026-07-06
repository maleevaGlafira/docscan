# OCR Pro

OCR Pro is a modern Single Page Application (SPA) designed to instantly extract text from images and PDF documents. It features a beautiful drag-and-drop interface and leverages the power of client-side machine learning for text recognition, supporting English, Russian, and Ukrainian out of the box.

[Українська версія нижче](#ocr-pro---українська)

## 🚀 Features

- **Multi-format Support:** Upload and process `PDF`, `JPG`, `PNG`, and `BMP` files.
- **Batch Processing:** Recognize text from up to 3 files simultaneously.
- **Drag & Drop:** Fully-featured drag-and-drop file upload with reorder functionality.
- **Client-Side OCR:** All processing happens in your browser using `Tesseract.js` for privacy and speed.
- **Smart Post-Processing:** Automatically formats recognized text by adding indentation (3 spaces) before paragraphs and spacing between them. Also corrects common OCR artifacts and spelling mistakes.
- **Firebase Firestore Integration:** Real-time persistence of processed documents with robust status management.
- **Document Lifecycle & Auto-Transitions:**
  - **Написано (Written):** Automatically detected when writing from scratch or clearing the workspace.
  - **Отсканировано (Scanned):** Default status for newly processed scan text.
  - **Исправлено (Corrected):** Automatically transitions here if the user modifies any scanned content in the editor.
  - **Отослано (Sent) & Выполнено (Completed):** Available for manual selection to track sending and completion status.
- **Interactive History Panel:** View creation date, last modification date, and status directly in the card. Supports instant deletions and manual status overrides.

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Core OCR logic:** Tesseract.js
- **PDF parsing:** pdfjs-dist
- **Drag and Drop:** @hello-pangea/dnd

## 📦 Requirements

- Node.js >= 18.0.0
- npm >= 9.x or yarn >= 1.x

## 🏁 How to Run

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

## 🔮 Future Plans

- Implement advanced Natural Language Processing (NLP) for superior grammar & spell checking.
- Add support for converting the recognized text back to Word (`.docx`) or searchable PDF format.
- Store history of recent recognitions in `localStorage`.
- Add customizable post-processing settings (font, spacing, dictionary tuning).

---

# OCR Pro - Українська

OCR Pro — це сучасний Single Page Application (SPA) для миттєвого розпізнавання тексту з фотографій та PDF-документів. Застосунок має красивий drag-and-drop інтерфейс та використовує потужність machine learning для розпізнавання тексту, підтримуючи англійську, російську та українську мови.

## 🚀 Основний функціонал

- **Підтримка форматів:** Завантаження та обробка `PDF`, `JPG`, `PNG` та `BMP` файлів.
- **Пакетна обробка:** Можливість обробляти до 3 файлів одночасно.
- **Drag & Drop:** Повноцінне завантаження з можливістю зміни порядку файлів перетягуванням.
- **Клієнтський OCR:** Вся обробка відбувається безпосередньо у Вашому браузері за допомогою `Tesseract.js`.
- **Розумна постобробка:** Текст автоматично форматується: перед кожним абзацом додається 3 пробіли, а після абзацу – пустий рядок. Також виправляються типові помилки розпізнавання (артефакти OCR).
- **Експорт:** Можливість скопіювати текст у буфер обміну або завантажити як `.txt` файл.

## 🛠 Використовувані технології

- **Фреймворк:** React 19 + TypeScript
- **Збірка:** Vite
- **Стилізація:** Tailwind CSS + shadcn/ui
- **Логіка OCR:** Tesseract.js
- **Обробка PDF:** pdfjs-dist
- **Drag and Drop:** @hello-pangea/dnd

## 📦 Вимоги до оточення

- Node.js >= 18.0.0
- npm >= 9.x або yarn >= 1.x

## 🏁 Як запустити проект

1. **Встановіть залежності:**
   ```bash
   npm install
   ```

2. **Запустіть сервер для розробки:**
   ```bash
   npm run dev
   ```

3. **Збірка для продакшну:**
   ```bash
   npm run build
   ```

## 🔮 Future Plans (Плани на майбутнє)

- Реалізувати розширену обробку природної мови (NLP) для кращої перевірки граматики та орфографії.
- Додати підтримку експорту розпізнаного тексту назад у `Word (.docx)` або PDF із пошуком.
- Зберігати історію останніх розпізнавань локально (через `localStorage`).
- Додати гнучкі налаштування постобробки тексту (відступи, шрифти, редагування словника замін).
