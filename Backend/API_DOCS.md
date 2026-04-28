# Nexus Backend API Documentation

Base URL: `http://localhost:5000`

Authentication method: JWT in secure `httpOnly` cookie named `token`.

## Security Stack

- Helmet headers enabled globally.
- CORS enabled with credentials and `CLIENT_URL` allowlist.
- Global rate limiting: 200 requests / 15 minutes per IP.
- Morgan request logging enabled (`dev` format).
- Passwords hashed with bcrypt (`12` salt rounds).

## Roles

Supported role values:

- `entrepreneur` (Entrepreneur)
- `investor` (Investor)

Role access control is enforced via middleware on protected endpoints.

## 1) Register

`POST /api/auth/register`

Create account and issue auth cookie.

### Request Body

```json
{
  "name": "Jane Founder",
  "email": "jane@example.com",
  "password": "StrongPassword123",
  "role": "entrepreneur",
  "bio": "Building climate tech.",
  "profilePictureUrl": "https://example.com/avatar.png",
  "startupHistory": [],
  "investmentHistory": [],
  "preferences": {
    "industries": ["CleanTech"],
    "stages": ["Seed"],
    "locations": ["San Francisco, CA"],
    "communication": ["email"]
  },
  "startupName": "EcoPulse",
  "pitchSummary": "AI powered climate analytics",
  "fundingNeeded": "$1M",
  "industry": "CleanTech",
  "location": "San Francisco, CA",
  "foundedYear": 2024,
  "teamSize": 5
}
```

### Response (201)

```json
{
  "success": true,
  "message": "Registration successful.",
  "user": {
    "id": "...",
    "name": "Jane Founder",
    "email": "jane@example.com",
    "role": "entrepreneur",
    "avatarUrl": "...",
    "bio": "Building climate tech.",
    "createdAt": "2026-04-26T10:00:00.000Z"
  },
  "dashboardData": {
    "dashboardType": "Entrepreneur",
    "summary": {
      "startupsBuilt": 0,
      "investorEngagements": 0,
      "profileStrength": "Strong"
    },
    "highlights": ["..."]
  }
}
```

## 2) Login

`POST /api/auth/login`

Authenticate and issue auth cookie.

### Request Body

```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123",
  "role": "entrepreneur"
}
```

### Response (200)

```json
{
  "success": true,
  "message": "Login successful.",
  "user": { "id": "...", "role": "entrepreneur" },
  "dashboardData": {
    "dashboardType": "Entrepreneur",
    "summary": {},
    "highlights": []
  }
}
```

## 3) Logout

`POST /api/auth/logout`

Clears auth cookie.

### Response (200)

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

## 4) Current Session User

`GET /api/auth/me`

Protected endpoint. Returns authenticated user and role-specific dashboard payload.

### Headers/Cookies

- Requires valid `token` cookie.

### Response (200)

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Jane Founder",
    "email": "jane@example.com",
    "role": "entrepreneur"
  },
  "dashboardData": {
    "dashboardType": "Entrepreneur",
    "summary": {
      "startupsBuilt": 1,
      "investorEngagements": 3,
      "profileStrength": "Strong"
    },
    "highlights": ["..."]
  }
}
```

## 5) Get Profile By Id

`GET /api/profile/:id`

Protected endpoint.

### URL Params

- `id` (MongoDB ObjectId)

### Response (200)

```json
{
  "success": true,
  "profile": {
    "id": "...",
    "name": "Jane Founder",
    "email": "jane@example.com",
    "role": "entrepreneur",
    "bio": "...",
    "profilePictureUrl": "...",
    "startupHistory": [],
    "investmentHistory": [],
    "preferences": {
      "industries": [],
      "stages": [],
      "locations": [],
      "communication": []
    },
    "startupName": "EcoPulse",
    "pitchSummary": "...",
    "fundingNeeded": "$1M",
    "industry": "CleanTech",
    "location": "San Francisco, CA",
    "foundedYear": 2024,
    "teamSize": 5,
    "avatarUrl": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## 6) Update Current User Profile

`PUT /api/profile/update`

Protected endpoint. Updates the currently authenticated user's profile.

### Request Body (all fields optional)

```json
{
  "name": "Jane Founder",
  "bio": "Updated bio",
  "profilePictureUrl": "https://example.com/new-avatar.png",
  "startupHistory": [],
  "investmentHistory": [],
  "preferences": {
    "industries": ["CleanTech"],
    "stages": ["Series A"],
    "locations": ["San Francisco, CA"],
    "communication": ["email", "in-app"]
  },
  "startupName": "EcoPulse",
  "pitchSummary": "Updated pitch",
  "fundingNeeded": "$2M",
  "industry": "CleanTech",
  "location": "San Francisco, CA",
  "foundedYear": 2024,
  "teamSize": 7,
  "investmentInterests": ["FinTech"],
  "investmentStage": ["Seed"],
  "portfolioCompanies": ["Acme"],
  "totalInvestments": 3,
  "minimumInvestment": "$50K",
  "maximumInvestment": "$500K"
}
```

### Response (200)

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "profile": {
    "id": "...",
    "name": "Jane Founder",
    "role": "entrepreneur"
  },
  "dashboardData": {
    "dashboardType": "Entrepreneur",
    "summary": {
      "startupsBuilt": 1,
      "investorEngagements": 3,
      "profileStrength": "Strong"
    },
    "highlights": ["..."]
  }
}
```

## Health Endpoint

`GET /api/health`

Quick status check.

### Response (200)

```json
{
  "success": true,
  "message": "Nexus backend is healthy."
}
```
