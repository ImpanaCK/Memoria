# Memoria – A Cloud-Integrated Personal Gallery

Memoria is a full-stack, single-page application (SPA) designed for seamless photo and album management. Developed using **React.js** and **Vite**, the platform leverages **Supabase** as a Backend-as-a-Service (BaaS) to handle relational data, secure user authentication, and high-performance cloud storage.

The application emphasizes dynamic UI state management and data integrity, offering a secure environment utilizing Supabase Row-Level Security (RLS) policies.

---

## 🚀 Key Technical Features

* **Dynamic Album Management:** Full CRUD functionality for personalized photo albums with automated cascading deletes linked to cloud media.
* **Intelligent Cloud Storage:** Direct integration with Supabase Storage buckets for high-resolution image uploads and batch file removal.
* **Row-Level Security (RLS):** Implementation of granular database policies ensuring users can exclusively access and modify their own assets.
* **Batch Operations:** Optimized multi-select logic allowing for efficient bulk deletion of images and albums.
* **Responsive Architecture:** Built with **Tailwind CSS** featuring interactive lightbox modals and a custom cover-image selection engine.

---

## 🛠️ Tech Stack

* **Frontend:** React.js (Vite), Tailwind CSS
* **Backend-as-a-Service:** Supabase (PostgreSQL database, Authentication, Cloud Storage)
* **Deployment & CI/CD:** Vercel

---

## ⚙️ Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ImpanaCK/Memoria.git

2. **Install dependencies:**
   ```bash
   npm install
   
3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```text
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
4. **Run the development server:**
   ```bash
   npm run dev

