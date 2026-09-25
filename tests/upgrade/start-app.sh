#!/bin/bash
# Starts the given tf2pickup image the same way the end-to-end job does and waits until it serves.
set -euo pipefail

docker run \
  --name=tf2pickup-app \
  --detach \
  --network="$NETWORK" \
  -e CI \
  -e WEBSITE_URL \
  -e MONGODB_URI \
  -e STEAM_API_KEY \
  -e QUEUE_CONFIG \
  -e KEY_STORE_PASSPHRASE \
  -e LOG_RELAY_ADDRESS \
  -e LOG_RELAY_PORT \
  -e GAME_SERVER_SECRET \
  -e THUMBNAIL_SERVICE_URL \
  -e ENABLE_TEST_AUTH \
  -e LOG_LEVEL \
  -p 3000:3000/tcp \
  -p 9871:9871/udp \
  "$1"

until curl -s http://127.0.0.1:3000 > /dev/null; do
  echo "Waiting for server..."
  sleep 5
done
