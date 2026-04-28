# Business Nexus

Business Nexus is a full-stack MERN platform built to connect entrepreneurs and investors in one place. It includes role-based authentication, profile management, investor and entrepreneur discovery, messaging, document handling, meetings, wallet-style payments, and a live chat experience.

## Overview

The project is split into two applications:

- **Backend**: Node.js, Express, MongoDB, Socket.IO, and Swagger-based API documentation.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, and React Router.

The app supports two user roles:

- **Entrepreneur**
- **Investor**

## Key Features

- Secure authentication with JWT stored in an `httpOnly` cookie
- Role-based login and registration flow
- OTP-based login verification
- Entrepreneur and investor dashboards
- Profile pages for both user types
- Investor and entrepreneur discovery pages
- In-app messages and chat UI
- Meeting scheduling and meeting status actions
- Document upload, viewing, signing, and deletion
- Payment flow with Stripe-ready endpoints
- Notifications, deals, help, and settings screens
- Swagger API documentation for backend endpoints
- Socket.IO signaling for real-time features

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- Socket.IO Client
- React Hot Toast
- React Dropzone
- React PDF
- Lucide React

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- Swagger UI / Swagger JSDoc
- Helmet
- CORS
- Morgan
- Cookie Parser
- Express Rate Limit
- Express Validator
- Bcrypt.js
- JSON Web Token
- Nodemailer
- Multer
- Stripe

## Project Structure

```text
Task 2/
├── Backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── docs/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── sockets/
│   │   └── utils/
│   └── API_DOCS.md
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   └── vercel.json
└── render.yaml
```

## Prerequisites

Make sure you have the following installed:

- Node.js 18 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Environment Variables

### Backend `.env`

Create `Backend/.env` with the following variables:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SERVER_PUBLIC_URL=http://localhost:5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=your_sender_email
```

### Frontend `.env`

Create `Frontend/.env` if needed:

```env
VITE_API_URL=http://localhost:5000
```

## Installation

Install dependencies for each app separately.

### Backend

```bash
cd Backend
npm install
```

### Frontend

```bash
cd Frontend
npm install
```

## Running the Project Locally

Start both apps in separate terminals.

### Start Backend

```bash
cd Backend
npm start
```

Backend runs on `http://localhost:5000` by default.

### Start Frontend

```bash
cd Frontend
npm start
```

Frontend runs on `http://localhost:5173` and is configured with `--strictPort` so it will not silently switch to another port.

## Available Scripts

### Backend

- `npm start` - Start the backend server
- `npm run dev` - Start the backend with nodemon
- `npm test` - Placeholder script

### Frontend

- `npm start` - Start the Vite development server
- `npm run dev` - Start the Vite development server
- `npm run build` - Create a production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build locally

## API Documentation

The backend exposes Swagger docs at:

- `http://localhost:5000/api/docs`
- `http://localhost:5000/api/docs.json`

The backend also includes a separate reference document in `Backend/API_DOCS.md`.

## Main Routes

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Profile

- `GET /api/profile/:id`
- `PUT /api/profile/update`

### Meetings

- `POST /api/meetings/schedule`
- `GET /api/meetings/my`
- `PATCH /api/meetings/:id/accept`
- `PATCH /api/meetings/:id/reject`
- `DELETE /api/meetings/:id/cancel`
- `POST /api/meetings/:id/room`

### Documents

- `POST /api/documents/upload`
- `GET /api/documents/my`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/file`
- `POST /api/documents/:id/sign`

### Payments

- `POST /api/payments/webhook`
- `POST /api/payments/deposit`
- `POST /api/payments/withdraw`
- `POST /api/payments/transfer`
- `GET /api/payments/history`

## Deployment

This repository is prepared for production deployment with:

- **Backend** on Render using `render.yaml`
- **Frontend** on Vercel using `Frontend/vercel.json`

### Render Backend Settings

- Root directory: `Backend`
- Build command: `npm install`
- Start command: `npm start`

### Vercel Frontend Settings

- Rewrites all routes to `/` for client-side routing
- Sets `VITE_API_URL` to the deployed backend URL

## Troubleshooting

- If the frontend shows a blank page in the browser, confirm that port `5173` is not already occupied by another process.
- If the backend fails to start, verify that `MONGODB_URI`, `JWT_SECRET`, and other required environment variables are set correctly.
- If payment endpoints are not configured locally, the backend will still start, but Stripe-dependent routes will return configuration errors until Stripe variables are provided.
- If you change backend ports or deployment URLs, update `CLIENT_URL`, `SERVER_PUBLIC_URL`, and `VITE_API_URL` accordingly.

## License

This project was created as an internship task. Add a license here if you want to publish it publicly.
