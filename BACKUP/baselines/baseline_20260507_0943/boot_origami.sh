#!/bin/bash
# Local Server Bootstrapper for Origami Engine

echo "=================================================="
echo "    BOOTING ORIGAMI ENGINE (LOCAL WEBSERVER)      "
echo "=================================================="
echo "Starting Python HTTP Server on port 8000..."

# Start the server in the background
python3 -m http.server 8000 &
SERVER_PID=$!

sleep 1

echo "Webserver is running! Opening Chrome..."
# Open the master launcher using http:// (not file:///)
open "http://localhost:8000/NewOrigami.5.html"

echo "Engine running on PID: $SERVER_PID"
echo "Close this terminal or press CTRL+C to terminate the server."
wait $SERVER_PID
