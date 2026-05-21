# 🛡️ Enterprise AI-Powered Access Management Portal for backend 
# Access Request Management — Backend

A scalable Node.js + Express backend for an enterprise access request portal. This service powers authentication, request workflows, AI-enhanced validation, audit logs, analytics, notifications, and document export.

## 🚀 What it does
- User authentication with JWT and role-based access (REQUESTER, APPROVER, ADMIN)
- Access request creation, tracking and approval workflows
- AI validation, reason suggestions, and chat assistant endpoints
- Audit log history for approved/rejected actions
- Analytics dashboard data for request trends and risk scoring
- Notifications API for user alerts
- Export request data as CSV or PDF
- MongoDB persistence with Mongoose
- Optional ML microservice integration for risk scoring
- Docker-ready deployment with `docker-compose`

## 🔧 Tech Stack
- Node.js (ES Modules)
- Express.js
- MongoDB + Mongoose
- JSON Web Tokens (JWT)
- bcryptjs for password hashing
- express-validator for request validation
- helmet and rate limiting for security hardening
- CORS and socket.io for realtime notifications
- OpenAI / Google AI SDK support plus custom Flask ML microservice

## 🧠 API Overview
Base URL: `/api`

### Auth
- `POST /api/auth/register` — create a new user
- `POST /api/auth/login` — login and receive JWT
- `GET /api/auth/profile` — get current user profile
- `POST /api/auth/logout` — end session

### Requests
- `POST /api/requests` — requester creates a new access request
- `GET /api/requests/my-requests` — requester fetches own requests
- `GET /api/requests/all` — approver/admin fetch all requests
- `PUT /api/requests/:id/status` — approve or reject a request
- `GET /api/requests/export/csv` — download request CSV report
- `GET /api/requests/export/pdf` — download request PDF report

### AI
- `POST /api/ai/validate-request` — validate a request using AI logic
- `POST /api/ai/suggest-reasons` — generate suggested request reasons
- `POST /api/ai/chat` — AI chat assistant endpoint

### Analytics
- `GET /api/analytics` — approver/admin analytics summary

### Audit
- `GET /api/audit` — approver/admin audit log history

### Notifications
- `GET /api/notifications` — fetch current user notifications
- `PUT /api/notifications/read-all` — mark notifications read
- `DELETE /api/notifications/clear` — clear all notifications

## 📁 Backend Structure
- `server.js` — main Express app and Socket.io setup
- `config/db.js` — MongoDB connection logic
- `controllers/` — route handlers and business logic
- `routes/` — API route definitions
- `middleware/` — auth and authorization middleware
- `models/` — Mongoose schema definitions
- `utils/` — shared helpers and email utilities
- `Dockerfile` — backend container definition

## ⚙️ Setup
### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- `.env` file in `backend/`

### Install
```bash
cd backend
npm install
```

### Environment Variables
Create `backend/.env` with:
```env
MONGODB_URI=mongodb://localhost:27017/access_request_db
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
ML_SERVICE_URL=http://127.0.0.1:5001
NODE_ENV=development
```

> If you use MongoDB Atlas, replace `MONGODB_URI` accordingly.

### Run Locally
```bash
npm run dev
```

The API will listen on `http://localhost:5000` by default.

## 🐳 Docker / Compose
The repo includes a root `docker-compose.yml` that starts:
- `frontend`
- `backend`
- `ml_service`

To start the full stack:
```bash
docker compose up --build
```

## 🔗 ML Service
The backend optionally integrates with `ml_service` for risk scoring. That service is a separate Flask app and should run on `http://127.0.0.1:5001` by default.

## 💡 Notes
- This backend is built for an access request management portal, not a React or Next.js app.
- The frontend is a vanilla JavaScript single-page application located in `frontend/`.
- Ensure the frontend `API_URL` points to the backend endpoint if you run a custom host.

## ✅ Useful commands
```bash
npm run dev
node server.js
npm install
```

---

If you want, I can also add a `backend/.env.example` file with the required variables.

![UI](https://img.shields.io/badge/UI-Liquid_Ether-8B5CF6?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Gemini_Powered-6366F1?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-MERN_&_Python-10B981?style=for-the-badge)

A modern AI-powered Identity and Access Management (IAM) platform developed using the MERN stack with integrated Machine Learning and Generative AI capabilities.

This project streamlines enterprise access request workflows with intelligent approval assistance, risk scoring, analytics, audit tracking, and a premium user experience.

---

# 🌐 Live Deployment

## 🚀 Frontend
https://fsd05-frontend.onrender.com

## ⚙️ Backend API
https://fsd05-backend-3.onrender.com

---

# ✨ Key Features

- 🤖 AI-Powered Access Validation
- 🛡️ Machine Learning Risk Scoring
- 📊 Analytics Dashboard
- 🔔 Real-Time Notifications
- 📝 Audit Logging System
- 💬 AI Assistant & Chatbot
- 🔐 JWT Authentication & Authorization
- 🎨 Premium Liquid Ether UI
- 📈 Role-Based Access Control
- ⚡ Real-Time Request Tracking

---
Key implementation highlights:

- Built scalable backend services using Node.js and Express
- Designed modular APIs with controllers, middleware, and service layers
- Dockerized multi-service architecture using Docker and Docker Compose
- Implemented JWT authentication and secure route protection
- Integrated AI and machine learning services through dedicated modules
- Structured for future scalability and microservice-based expansion
- Version controlled with Git for collaborative development workflows
---
# 🛠️ Tech Stack

## Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js
- Vanilla JS Architecture

## Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Bcrypt

## AI & Machine Learning
- Gemini AI Integration
- Python
- Flask
- Scikit-learn

---

# 📂 Project Structure

```text
FSD05_MERNSTACK/
│
├── backend/              # Node.js Express Backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
│
├── frontend/             # Frontend Client
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── components/
│
├── ml_service/           # Python ML Service
│
├── docker-compose.yml
├── README.md
└── QUICKSTART.md
