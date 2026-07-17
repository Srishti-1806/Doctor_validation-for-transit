cd /workspaces/access-ride
npm install

# Load .env if present, so MONGODB_URI can be managed locally.
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# If you want to use Atlas instead of local MongoDB, set MONGODB_URI in .env
# MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.v3zv4v0.mongodb.net/transit_disability?retryWrites=true&w=majority"

if [ -z "$MONGODB_URI" ]; then
  docker rm -f access-ride-mongo || true
  docker run -d --name access-ride-mongo -p 27017:27017 mongo:7.0.14
  export MONGODB_URI="mongodb://127.0.0.1:27017"
fi

node scripts/seed-mongo.mjs
npm run dev -- --host 0.0.0.0

# optional
# npm run build
