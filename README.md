# 🧠 Hael.r - Mental Health & Wellness Platform

<div align="center">

![Hael.r Logo](https://via.placeholder.com/200x100/1e40af/ffffff?text=Hael.r) <!-- Replace with actual logo -->

**A comprehensive mental health assessment and wellness platform built with modern web technologies**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Graphics-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)

[🚀 Live Demo](https://your-demo-link.com) • [📖 Documentation](https://your-docs-link.com) • [🐛 Report Bug](https://github.com/yourusername/hael.r-work/issues) • [✨ Request Feature](https://github.com/yourusername/hael.r-work/issues)

</div>

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Configuration](#-configuration)
- [💻 Usage](#-usage)
- [🎨 Screenshots](#-screenshots)
- [🔌 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [📱 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👥 Team](#-team)
- [🙏 Acknowledgments](#-acknowledgments)

---

## 🌟 Features

### 🧠 Mental Health Assessment
- **Interactive Quizzes**: Comprehensive mental health assessments with research-based questions
- **Assessment History**: Track your mental health journey over time
- **Personalized Results**: AI-powered insights using OpenAI integration
- **Crisis Resources**: Immediate access to mental health support when needed

### 🎯 Wellness Tools
- **Mood Tracker**: Daily mood logging with visual analytics using Recharts
- **Meditation Library**: Guided meditation sessions with audio playback
- **Progress Analytics**: Detailed insights into your wellness journey
- **Personalized Recommendations**: Tailored content based on your assessment results

### 🎨 Immersive Experience
- **3D Brain Visualization**: Interactive 3D models powered by Three.js
- **Smooth Animations**: Fluid transitions using GSAP and Lenis
- **Responsive Design**: Optimized for desktop and mobile devices
- **Audio Integration**: High-quality audio experience with Howler.js

### 🔐 User Experience
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Anonymous Access**: Explore features without mandatory registration
- **Offline Capability**: Progressive Web App features for offline access
- **Accessibility**: WCAG compliant design for inclusive access

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI Framework |
| **TypeScript** | 5.2.2 | Type Safety |
| **Vite** | 5.3.1 | Build Tool & Dev Server |
| **Tailwind CSS** | 3.4.4 | Styling Framework |
| **Three.js** | 0.166.1 | 3D Graphics |
| **React Three Fiber** | 8.18.0 | React Renderer for Three.js |
| **GSAP** | 3.12.5 | Animation Library |
| **Lenis** | 1.0.42 | Smooth Scrolling |
| **Howler.js** | 2.2.4 | Audio Management |
| **React Router** | 6.29.0 | Client-side Routing |
| **Recharts** | 2.15.2 | Data Visualization |
| **Axios** | 1.9.0 | HTTP Client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | - | Runtime Environment |
| **Express.js** | 4.18.2 | Web Framework |
| **TypeScript** | 5.3.3 | Type Safety |
| **MongoDB** | - | Database |
| **Mongoose** | 8.0.3 | ODM for MongoDB |
| **JWT** | 9.0.2 | Authentication |
| **Bcrypt** | 5.1.1 | Password Hashing |
| **OpenAI** | 4.24.1 | AI Integration |
| **CORS** | 2.8.5 | Cross-Origin Requests |

### Development & Deployment
- **ESLint** - Code linting and quality
- **Nodemon** - Development server auto-restart
- **Git** - Version control
- **Netlify** - Frontend hosting (planned)
- **Render/Railway** - Backend hosting (planned)

---

## 🚀 Quick Start

Get Hael.r running locally in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/yourusername/hael.r-work.git
cd hael.r-work

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start the development servers
npm run dev        # Frontend (http://localhost:5173)
cd server && npm run dev  # Backend (http://localhost:3000)
```

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher) or MongoDB Atlas account
- **Git**

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hael.r-work.git
   cd hael.r-work
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   VITE_API_URL=http://localhost:3000/api
   VITE_APP_NAME=Hael.r
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in server directory
   cp .env.example .env
   ```

   Update `.env` with your configuration:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/hael.r
   JWT_SECRET=your-super-secret-jwt-key
   OPENAI_API_KEY=your-openai-api-key
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

---

## 🔧 Configuration

### MongoDB Setup

#### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/hael.r`

#### Option 2: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `.env`

### OpenAI Integration

1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to server `.env` file:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

### Environment Variables Reference

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Hael.r
VITE_ENVIRONMENT=development
```

#### Backend (server/.env)
```env
PORT=3000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-minimum-32-characters
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=your-session-secret
BCRYPT_ROUNDS=12
```

---

## 💻 Usage

### Running the Application

1. **Start both servers**:
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd server && npm run dev
   ```

2. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Key Features Guide

#### Mental Health Assessment
1. Navigate to "Assessment" from the main menu
2. Complete the comprehensive questionnaire
3. Receive personalized insights and recommendations
4. View your assessment history over time

#### Mood Tracking
1. Access "Mood Tracker" from the navigation
2. Log your daily mood with optional notes
3. View trends and patterns in your mood data
4. Get insights into your emotional well-being

#### Meditation Sessions
1. Visit the "Meditation" section
2. Choose from guided meditation sessions
3. Track your meditation progress
4. Build a consistent practice routine

---

## 🎨 Screenshots

<!-- Add your actual screenshots here -->

<div align="center">

### 🏠 Homepage with 3D Brain Visualization
![Homepage](https://via.placeholder.com/800x400/1e40af/ffffff?text=Homepage+Screenshot)

### 📊 Mental Health Assessment
![Assessment](https://via.placeholder.com/800x400/059669/ffffff?text=Assessment+Screenshot)

### 📈 Mood Tracking Dashboard
![Mood Tracker](https://via.placeholder.com/800x400/7c3aed/ffffff?text=Mood+Tracker+Screenshot)

### 🧘‍♀️ Meditation Interface
![Meditation](https://via.placeholder.com/800x400/dc2626/ffffff?text=Meditation+Screenshot)

</div>

---

## 🔌 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST `/api/auth/login`
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Assessment Endpoints

#### POST `/api/assessments`
Submit a new mental health assessment.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "responses": [
    {
      "questionId": "q1",
      "answer": "Sometimes",
      "score": 2
    }
  ],
  "assessmentType": "depression"
}
```

#### GET `/api/assessments/user/:userId`
Get user's assessment history.

### Mood Tracking Endpoints

#### POST `/api/mood`
Log a mood entry.

#### GET `/api/mood/user/:userId`
Get user's mood history.

### Meditation Endpoints

#### GET `/api/meditation/sessions`
Get available meditation sessions.

#### POST `/api/meditation/progress`
Update meditation progress.

For complete API documentation, visit our [API Docs](https://your-api-docs-link.com).

---

## 🧪 Testing

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── frontend/
│   ├── components/
│   ├── pages/
│   └── utils/
└── backend/
    ├── auth/
    ├── assessments/
    └── mood/
```

---

## 📱 Deployment

### Frontend Deployment (Netlify)

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

3. **Environment Variables for Production**:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   ```

### Backend Deployment (Render/Railway)

1. **Prepare for deployment**:
   ```bash
   cd server
   npm run build
   ```

2. **Deploy to Render**:
   - Connect GitHub repository
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`
   - Add environment variables

3. **Environment Variables for Production**:
   ```
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   OPENAI_API_KEY=your-openai-api-key
   CORS_ORIGIN=https://your-frontend-url.com
   ```

### Database Setup

For production, use MongoDB Atlas:
1. Create production cluster
2. Configure IP whitelist
3. Create database user
4. Update connection string in environment variables

---

## 🤝 Contributing

We welcome contributions to Hael.r! Here's how you can help:

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**:
   ```bash
   npm test
   ```
5. **Commit your changes**:
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to your branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow existing TypeScript/ESLint conventions
- **Testing**: Add tests for new features
- **Documentation**: Update README and inline docs
- **Commits**: Use conventional commit format
- **Issues**: Use issue templates for bugs/features

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🔧 Performance optimizations
- 🧪 Test coverage improvements

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Hael.r Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👥 Team

<div align="center">

| Role | Name | GitHub | LinkedIn |
|------|------|--------|----------|
| **Lead Developer** | Your Name | [@yourusername](https://github.com/yourusername) | [LinkedIn](https://linkedin.com/in/yourprofile) |
| **Frontend Developer** | Team Member | [@teammember](https://github.com/teammember) | [LinkedIn](https://linkedin.com/in/teammember) |
| **Backend Developer** | Team Member | [@teammember2](https://github.com/teammember2) | [LinkedIn](https://linkedin.com/in/teammember2) |

</div>

---

## 🙏 Acknowledgments

### Technologies & Libraries
- [React](https://reactjs.org/) - The foundation of our frontend
- [Three.js](https://threejs.org/) - Amazing 3D graphics capabilities
- [OpenAI](https://openai.com/) - AI-powered insights
- [MongoDB](https://www.mongodb.com/) - Reliable database solution
- [Tailwind CSS](https://tailwindcss.com/) - Beautiful styling framework

### Design Inspiration
- Mental health advocacy organizations
- Accessibility guidelines from WCAG
- Modern web design principles

### Special Thanks
- Mental health professionals who provided insights
- Beta testers who helped improve the platform
- Open source community for amazing tools

---

<div align="center">

### 💙 Supporting Mental Health

*Hael.r is committed to supporting mental health awareness and providing accessible tools for well-being. If you or someone you know is struggling, please reach out to local mental health services or crisis hotlines.*

**🚨 Crisis Resources:**
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: [https://www.iasp.info/resources/Crisis_Centres/](https://www.iasp.info/resources/Crisis_Centres/)

---

**Made with ❤️ for mental health and wellness**

</div>
