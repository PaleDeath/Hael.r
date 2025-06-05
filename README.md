# 🧠 Hael.r – Mental Health & Wellness Platform

<div align="center">

**A comprehensive mental health assessment and wellness platform built with modern web technologies**

[🚀 Live Demo](#) • [📖 Documentation](#) • [🐛 Report Bug](#) • [✨ Request Feature](#)

</div>

---

## 📋 Table of Contents

* [🌟 Features](#-features)
* [🛠️ Tech Stack](#-tech-stack)
* [🚀 Quick Start](#-quick-start)
* [📦 Installation](#-installation)
* [🔧 Configuration](#-configuration)
* [💻 Usage](#-usage)
* [🔌 API Documentation](#-api-documentation)
* [💙 Supporting Mental Health](#-supporting-mental-health)

---

## 🌟 Features

### 🧠 Mental Health Assessment

* Research-backed quizzes to assess mental wellness
* Personalized, AI-powered insights via OpenAI
* Progress tracking through historical assessments
* Immediate access to crisis resources

### 🎯 Wellness Tools

* Daily mood tracking with analytics (Recharts)
* Guided meditation sessions with audio
* AI-curated wellness recommendations
* Visual progress tracking

### 🎨 Immersive Experience

* Interactive 3D brain (Three.js + React Three Fiber)
* Smooth transitions using GSAP + Lenis
* Fully responsive UI with high-quality audio (Howler.js)

---

## 🛠️ Tech Stack

### 🔹 Frontend

| Technology        | Version | Purpose            |
| ----------------- | ------- | ------------------ |
| React             | 18.3.1  | UI Framework       |
| TypeScript        | 5.2.2   | Type Safety        |
| Vite              | 5.3.1   | Dev Server & Build |
| Tailwind CSS      | 3.4.4   | Styling            |
| Three.js          | 0.166.1 | 3D Graphics        |
| React Three Fiber | 8.18.0  | Three.js Renderer  |
| GSAP              | 3.12.5  | Animations         |
| Howler.js         | 2.2.4   | Audio              |
| React Router      | 6.29.0  | Routing            |
| Recharts          | 2.15.2  | Charts             |
| Axios             | 1.9.0   | HTTP Client        |

### 🔸 Backend

| Technology | Version | Purpose          |
| ---------- | ------- | ---------------- |
| Node.js    | —       | Runtime          |
| Express.js | 4.18.2  | Server Framework |
| TypeScript | 5.3.3   | Type Safety      |
| CORS       | 2.8.5   | Security         |

> 🛠 Dev Tools: ESLint, Nodemon, Git
> 🌐 Hosting: Render/Railway (frontend and backend)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/haelr.git
cd haelr

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Setup environment
cp server/.env.example server/.env
# Edit .env with your config

# Run frontend (localhost:5173)
npm run dev

---

## 📦 Installation

### Prerequisites

* Node.js ≥ 18.x
* npm ≥ 8.x
* Git

### Frontend `.env` Example

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Hael.r
```

---

## 🔧 Configuration

### Frontend: `.env`

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Hael.r
VITE_ENVIRONMENT=development
```

---

## 💻 Usage

### Run the App

Start server and navigate to:

* Frontend: `http://localhost:5173`

### Key Features

* **Assessment:** Take quizzes → Get insights → View progress
* **Mood Tracker:** Log mood → View charts → Track patterns
* **Meditation:** Choose session → Track progress → Improve wellness

---

* 🧠 **Homepage with 3D Brain**
* 📊 **Mental Health Assessment**
* 📈 **Mood Tracking Dashboard**
* 🧘‍♀️ **Meditation Interface**

---

## 🔌 API Documentation

### 🔸 Assessment

* `POST /api/assessments`
  Submit a new assessment

  ```json
  {
    "responses": [
      { "questionId": "q1", "answer": "Sometimes", "score": 2 }
    ],
    "assessmentType": "depression"
  }
  ```

* `GET /api/assessments/user/:userId`
  Retrieve a user’s past assessments

### 🔸 Mood & Meditation

Additional endpoints for mood logging, meditation progress, and session access available in [full API docs](#).

---

## 💙 Supporting Mental Health

Hael.r is committed to promoting mental well-being and making mental health resources accessible. If you or someone you know is struggling, please reach out to a professional or local crisis support service.

### 🚨 Crisis Resources in India:

* **iCall (TISS Mental Health Helpline)**
  Toll-Free: 9152987821
  Website: [https://icallhelpline.org](https://icallhelpline.org)

* **AASRA (Suicide Prevention)**
  Helpline: +91-9820466726
  Website: [http://www.aasra.info](http://www.aasra.info)

* **Vandrevala Foundation Helpline**
  24x7 Helpline: 1860 266 2345 / 1800 233 3330
  Website: [http://www.vandrevalafoundation.com](http://www.vandrevalafoundation.com)

* **Sumaitri (Delhi-based Emotional Support)**
  Helpline: +91-11-23389090
  Website: [http://www.sumaitri.net](http://www.sumaitri.net)

---




