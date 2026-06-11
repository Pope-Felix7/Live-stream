# FELIX-LIVE – Setup Guide

## ── Step 1: Install Dependencies ──────────────────────────────

```
pip install -r requirements.txt
```

## ── Step 2: Get Free TURN Server (Metered.ca) ─────────────────

1. Go to https://www.metered.ca/
2. Click "Sign Up" – it's FREE (no credit card)
3. After signing in, click "TURN" in the left sidebar
4. Click "Create Application" – give it any name (e.g. FELIX-LIVE)
5. You will see:
   - App Name → looks like: FELIX-LIVE (from FELIX-LIVE.metered.live)
   - API Key → a long string of letters/numbers

## ── Step 3: Add Your Credentials ──────────────────────────────

Open this file:
zoom_clone/settings.py

Scroll to the bottom and fill in your values:

METERED_API_KEY = 'paste_your_api_key_here'
METERED_APP_NAME = 'paste_your_app_name_here'

Example:
METERED_API_KEY = 'abc123xyz'
METERED_APP_NAME = 'FELIX-LIVE'

## ── Step 4: Run Migrations ─────────────────────────────────────

```
python manage.py makemigrations
python manage.py migrate
```

## ── Step 5: Start the Server ───────────────────────────────────

```
python manage.py runserver
```

## ── Step 6: Open in Browser ────────────────────────────────────

```
http://127.0.0.1:8000/accounts/login/
```

## ── Step 7: Test Video Between Two People ──────────────────────

1. Register two accounts (can use two different browsers)
2. Person A: Create a Room, copy the room code
3. Person B: Join Room, paste the code
4. Both should see each other's video!

## ── Admin Panel ────────────────────────────────────────────────

```
python manage.py createsuperuser
http://127.0.0.1:8000/admin/
```
