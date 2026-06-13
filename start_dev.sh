#!/bin/bash

# Exit on error
set -e

# Start Docker containers in the background
echo "=== Starting Backing Services (PostgreSQL & Redpanda) via Docker ==="
docker-compose up -d postgres redpanda

# Wait briefly for services to initialize
echo "Waiting for services to initialize..."
sleep 3

# Get the absolute path of the repository root
REPO_ROOT="$(pwd)"

echo "=== Opening Terminal tabs for local development ==="

# AppleScript to open a new Terminal window with tabs for each service
osascript <<EOF
tell application "Terminal"
    activate

    # Tab 1: Django API Server
    set newWindow to do script "cd '$REPO_ROOT/backend' && source .venv/bin/activate && python manage.py runserver"

    # Tab 2: Telemetry Worker
    tell application "System Events"
        tell process "Terminal"
            click menu item "New Tab" of menu 1 of menu bar item "Shell" of menu bar 1
        end tell
    end tell
    delay 0.5
    do script "cd '$REPO_ROOT/backend' && source .venv/bin/activate && python manage.py telemetry_worker" in window 1

    # Tab 3: ML Worker
    tell application "System Events"
        tell process "Terminal"
            click menu item "New Tab" of menu 1 of menu bar item "Shell" of menu bar 1
        end tell
    end tell
    delay 0.5
    do script "cd '$REPO_ROOT/backend' && source .venv/bin/activate && python manage.py ml_worker" in window 1

    # Tab 4: Frontend Server
    tell application "System Events"
        tell process "Terminal"
            click menu item "New Tab" of menu 1 of menu bar item "Shell" of menu bar 1
        end tell
    end tell
    delay 0.5
    do script "cd '$REPO_ROOT/frontend' && npx dotenvx run -- npm start" in window 1

    # Tab 5: Sanity Studio
    tell application "System Events"
        tell process "Terminal"
            click menu item "New Tab" of menu 1 of menu bar item "Shell" of menu bar 1
        end tell
    end tell
    delay 0.5
    do script "cd '$REPO_ROOT/studio' && npm run dev" in window 1
end tell
EOF

echo "All services initiated in separate Terminal tabs! Happy coding."
