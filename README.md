# 💎 Ledgr — Premium AI Finance Tracker

![Ledgr Header](https://raw.githubusercontent.com/SKCoder18/ledgr/main/artist-zone/src/assets/hero.png)

> **Ledgr** is a high-performance, AI-powered financial intelligence platform designed to help you "make sense of every dollar." It combines professional-grade data visualization with seamless transaction parsing via SMS, text, and images.

---

## ✨ Key Features

### 🧠 AI-Powered Intelligence
- **Natural Language Parsing**: Just type "Spent 500 on dinner at Swiggy" and watch it categorize instantly.
- **SMS & Image Processing**: Upload receipt photos or paste bank SMS logs for automated data extraction.
- **AI Insights**: Get monthly spending observations and budgeting tips generated specifically for your habits.

### 📊 Professional Data Visualization
- **6-Month Trend Tracking**: Side-by-side comparison of Income vs. Expenses.
- **Category Distribution**: Interactive pie charts showing exactly where your money goes.
- **Daily Net View**: Transactions grouped by date with daily profit/loss summaries.

### 🎨 Premium UI/UX
- **Glassmorphism Design**: A sleek, modern aesthetic with fluid animations.
- **Dynamic Themes**: Seamless switching between high-contrast Dark Mode and soft Light Mode.
- **Responsive Layout**: Optimized for desktop monitoring and quick mobile entries.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS + Framer Motion (Animations)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Theming**: Next Themes

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SKCoder18/ledgr.git
   cd ledgr
   ```

2. **Install Dependencies**
   ```bash
   cd artist-zone
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the `artist-zone` directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
├── artist-zone/          # Primary React Application
│   ├── src/
│   │   ├── components/   # UI & Feature Components
│   │   ├── pages/        # Dashboard, Auth, Settings
│   │   └── integrations/ # Supabase Client & Types
│   └── vercel.json       # Deployment Configuration
└── supabase/             # Database Migrations & Edge Functions
```

---

## 🛡️ Database Schema

The system uses a robust PostgreSQL schema with:
- **Profiles**: User settings, currency preferences, and monthly budgets.
- **Expenses**: Comprehensive transaction logging with `transaction_type` (expense/income/transfer).
- **Triggers**: Automatic `updated_at` management and profile creation.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

Developed with ❤️ by [Saikumar](https://github.com/SKCoder18)
