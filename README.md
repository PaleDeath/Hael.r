
🧠 Hael.r - Mental Health & Wellness Platform
 
A comprehensive mental health assessment and wellness platform built with modern web technologies






🚀 Live Demo • 📖 Documentation • 🐛 Report Bug • ✨ Request Feature

📋 Table of Contents

* 🌟 Features
* 🛠️ Tech Stack
* 🚀 Quick Start
* 📦 Installation
* 🔧 Configuration
* 💻 Usage
* 🎨 Screenshots
* 🔌 API Documentation
* 🙏 Acknowledgments


🌟 Features
🧠 Mental Health Assessment
Interactive quizzes provide comprehensive mental health assessments with research-based questions. Track your mental health journey over time with assessment history, and receive personalized AI-powered insights using OpenAI integration. Access to immediate crisis resources ensures support is available when needed most.
🎯 Wellness Tools
Daily mood tracking with visual analytics powered by Recharts helps you understand emotional patterns. A guided meditation library with audio playback supports your wellness practice. Detailed progress analytics provide insights into your wellness journey, while personalized recommendations offer tailored content based on your assessment results.
🎨 Immersive Experience
Interactive 3D brain visualizations powered by Three.js create an engaging experience. Smooth animations using GSAP and Lenis provide fluid transitions throughout the platform. The responsive design is optimized for both desktop and mobile devices, with high-quality audio integration using Howler.js.
🔐 User Experience
Secure JWT-based authentication with bcrypt password hashing protects user data. Anonymous access allows exploration of features without mandatory registration. Progressive Web App features enable offline capability, while WCAG compliant design ensures inclusive accessibility for all users.

🛠️ Tech Stack
Frontend
TechnologyVersionPurposeReact18.3.1UI FrameworkTypeScript5.2.2Type SafetyVite5.3.1Build Tool & Dev ServerTailwind CSS3.4.4Styling FrameworkThree.js0.166.13D GraphicsReact Three Fiber8.18.0React Renderer for Three.jsGSAP3.12.5Animation LibraryLenis1.0.42Smooth ScrollingHowler.js2.2.4Audio ManagementReact Router6.29.0Client-side RoutingRecharts2.15.2Data VisualizationAxios1.9.0HTTP Client
Backend
TechnologyVersionPurposeNode.js-Runtime EnvironmentExpress.js4.18.2Web FrameworkTypeScript5.3.3Type SafetyMongoDB-DatabaseMongoose8.0.3ODM for MongoDBJWT9.0.2AuthenticationBcrypt5.1.1Password HashingOpenAI4.24.1AI IntegrationCORS2.8.5Cross-Origin Requests
Development & Deployment
ESLint provides code linting and quality assurance, while Nodemon enables development server auto-restart. Git handles version control, with planned hosting on Netlify for the frontend and Render/Railway for the backend.

🚀 Quick Start
Get Hael.r running locally in 5 minutes:
bashDownloadCopy code Wrap# Clone the repository
git clone https://github.com/yourusername/albaash-work.git
cd albaash-work

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

📦 Installation
Prerequisites
Before you begin, ensure you have the following installed: Node.js (v18.0.0 or higher), npm (v8.0.0 or higher), MongoDB (v5.0 or higher) or MongoDB Atlas account, and Git.
Frontend Setup
Clone the repository and navigate to the project directory. Install dependencies with npm install, then create a .env file in the root directory with your configuration:
envDownloadCopy code WrapVITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Hael.r
Start the development server with npm run dev.

🔧 Configuration
Frontend (.env)
envDownloadCopy code WrapVITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Hael.r
VITE_ENVIRONMENT=development
Backend (server/.env)
envDownloadCopy code WrapPORT=3000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-minimum-32-characters
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=your-session-secret
BCRYPT_ROUNDS=12

💻 Usage
Running the Application
Start both servers simultaneously - the frontend with npm run dev (accessible at http://localhost:5173) and the backend with cd server && npm run dev (accessible at http://localhost:3000).
Key Features Guide
The Mental Health Assessment feature allows you to navigate to "Assessment" from the main menu, complete comprehensive questionnaires, receive personalized insights and recommendations, and view your assessment history over time.
For Mood Tracking, access the "Mood Tracker" from navigation, log your daily mood with optional notes, view trends and patterns in your mood data, and gain insights into your emotional well-being.
The Meditation Sessions feature lets you visit the "Meditation" section, choose from guided meditation sessions, track your meditation progress, and build a consistent practice routine.

🎨 Screenshots
🏠 Homepage with 3D Brain Visualization

📊 Mental Health Assessment

📈 Mood Tracking Dashboard

🧘‍♀️ Meditation Interface


🔌 API Documentation
Assessment Endpoints
POST /api/assessments
Submit a new mental health assessment.
Headers:
Authorization: Bearer <jwt-token>

Request Body:
jsonDownloadCopy code Wrap{
  "responses": [
    {
      "questionId": "q1",
      "answer": "Sometimes",
      "score": 2
    }
  ],
  "assessmentType": "depression"
}
GET /api/assessments/user/:userId
Get user's assessment history.
Additional Endpoints
The API includes mood tracking endpoints for logging mood entries and retrieving mood history, as well as meditation endpoints for accessing available sessions and updating progress. For complete API documentation, visit our API documentation link.


🙏 Acknowledgments
Technologies & Libraries
We acknowledge React as the foundation of our frontend, Three.js for amazing 3D graphics capabilities, OpenAI for AI-powered insights, MongoDB for reliable database solutions, and Tailwind CSS for our beautiful styling framework.
Design Inspiration
Our design draws inspiration from mental health advocacy organizations, accessibility guidelines from WCAG, and modern web design principles.
Special Thanks
Special thanks go to mental health professionals who provided insights, beta testers who helped improve the platform, and the open source community for providing amazing tools.

💙 Supporting Mental Health
Hael.r is committed to supporting mental health awareness and providing accessible tools for well-being. If you or someone you know is struggling, please reach out to local mental health services or crisis hotlines.
🚨 Crisis Resources:

* National Suicide Prevention Lifeline: 988
* Crisis Text Line: Text HOME to 741741
* International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/


Made with ❤️ for mental health and wellness
⬆ Back to Top
