# Gian's Cafe — Digital Menu Website

Modern, responsive online product directory and admin inventory management web application for **Gian's Cafe**.

## Features

- **Public Digital Menu**: Real-time product directory featuring live search by product name, instant category filters, and price range sliders. Defaults to showing available items only.
- **Brand & Story Landing Page**: Clean, minimal, warm white-based design aesthetic with soft shadows, generous whitespace, roastery highlights, and operating hours.
- **Admin Inventory Dashboard**: Protected management panel allowing cafe administrators to:
  - Add, edit, and delete menu items
  - Instantly toggle live availability (in stock / hidden from customer menu)
  - Configure pricing, categories, descriptions, and image URLs
- **Zero Emojis**: Strictly uses `lucide-react` iconography throughout the entire user interface.
- **Security & Open-Redirect Prevention**: Validated internal navigation paths and server-verified sessions.

---

## Getting Started Locally

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `VITE_API_URL` points to `http://localhost:5000/api`.

### 2. Install & Run
```bash
npm install
npm run dev
```

---

## Deployment to Render

1. Create a new **Static Site** on [Render](https://render.com).
2. Connect the `Gian-s` repository.
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api`
5. Single-Page Application rewrites are automatically handled via `public/_redirects`.
