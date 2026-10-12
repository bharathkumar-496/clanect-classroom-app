# 🚀 Clanect (Classroom Connect)

> **Real-Time Mobile Progressive Web App (PWA) exclusively designed for college classrooms.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://clanect-classroom-app.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-JavaScript%20%7C%20Firebase%20%7C%20PWA-orange?style=for-the-badge)](https://clanect-classroom-app.vercel.app)

---

## 📱 Overview

**Clanect** is a specialized real-time classroom portal and mobile Progressive Web App (PWA) crafted for college sections. It replaces noisy general-purpose messaging groups (WhatsApp/Telegram) with an organized, standalone application experience tailored strictly to academic and student life.

- **Live Application:** [https://clanect-classroom-app.vercel.app](https://clanect-classroom-app.vercel.app)
- **Target Form Factor:** Standalone Mobile PWA (iOS Safari / Android Chrome "Add to Home Screen")

---

## ✨ Key Features

- **⚡ Real-Time Synchronization:** Sub-second cloud sync across diverse mobile and Wi-Fi networks using Google Firebase Realtime Database.
- **🛡️ Two-Tier RBAC & Approval Gate:**
  - Classmates register with their verified name, register number, and avatar icon.
  - Standard registrations enter a protected `pending` state until verified.
  - Designated **Class Rep (Master Admin)** has an administrative approval panel to approve or remove accounts in real-time.
- **💬 Real-Time Classroom Feed:** Interactive group messaging feed with distinct sender bubbles, reply threads, and custom student avatars.
- **📊 Live Classroom Polls:** Interactive poll creation and voting engine with live percentage recalculations.
- **🚨 Instant Priority Push Broadcasts:** High-priority alert banner engine for urgent classroom notices (e.g. lab venue shifts, exam announcements).
- **📲 Full PWA Capabilities:** Offline service worker caching, Web App Manifest integration, and custom iOS/Android touch icons for a native full-screen feel.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom iOS-inspired design system with CSS Variables & Glassmorphism), Vanilla JavaScript (ES6+)
- **Database & Realtime Engine:** Google Firebase Realtime Database
- **Backend / Deployment:** Vercel Serverless Functions (`/api`), Node.js (`server.js`)
- **PWA Specs:** Service Worker (`sw.js`), Web App Manifest (`manifest.json`)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/bharathkumar-496/clanect-classroom-app.git
cd clanect-classroom-app
```

### 2. Install dependencies (optional for local Node.js server)
```bash
npm install
```

### 3. Run Locally
```bash
node server.js
```
Open [http://localhost:9090](http://localhost:9090) in your browser.

---

## 📄 License
MIT License. Created by [Bharath Kumar](https://github.com/bharathkumar-496).
