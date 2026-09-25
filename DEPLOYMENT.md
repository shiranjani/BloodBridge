# Deployment Guide for the CV Live Link

This project is ready to be deployed as a live demo for your CV.

## Recommended setup

- Frontend: Vercel
- Backend/API: Render
- Database: Render managed MySQL or another MySQL host

## 1) Deploy the backend

### Render
1. Push this repository to GitHub.
2. In Render, create a new Web Service.
3. Connect this repo.
4. Use the following start command:

```bash
node server.js
```

5. Add the required environment variables:

```env
PORT=5000
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=blood_donation_system
ADMIN_NAME=Blood Bridge Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

6. Copy the deployed backend URL, for example:

```text
https://blood-donation-api.onrender.com
```

## 2) Deploy the frontend

### Vercel
1. Import this repo into Vercel.
2. Build command:

```bash
npm run build
```

3. Output directory:

```text
build
```

4. Add this environment variable:

```env
REACT_APP_API_BASE=https://blood-donation-api.onrender.com/api
```

5. Your frontend live URL will look like:

```text
https://blood-donation-system.vercel.app
```

## 3) Add to your CV

Use a line like this:

```text
Blood Donation System | Live Demo: https://blood-donation-system.vercel.app
```

This is the public URL to include in your CV or portfolio.
