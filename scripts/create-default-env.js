const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env');

if (!fs.existsSync(envPath)) {
  const data = `# Auto-generated environment for 9router-lite dev
# Default admin credentials (can be changed later)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_ROLE=dev

# Required
JWT_SECRET=change-me-to-a-long-random-secret
INITIAL_PASSWORD=123456
DATA_DIR=/var/lib/9router

# Recommended runtime variables
PORT=20129
NODE_ENV=development

# Remote DB mode (required)
# DB_DRIVER=cockroach
# DATABASE_URL=postgresql://root:***@localhost:26257/9router?sslmode=disable

# Recommended security and ops variables
API_KEY_SECRET=endpoint-proxy-api-key-secret
MACHINE_ID_SALT=endpoint-proxy-salt
ENABLE_REQUEST_LOGS=false
OBSERVABILITY_ENABLED=true
AUTH_COOKIE_SECURE=false
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=http://localhost:20128,https://yourdomain.com
TOKEN_REFRESH_BUFFER_MINUTES=5
CLOUD_SYNC_ENABLED=false
ENCRYPTION_KEY=your_32_byte_hex_string_here
RATE_LIMIT_PER_MINUTE=60

# Cloud sync variables
# Must point to this running instance so internal sync jobs can call /api/sync/cloud.
# Server-side preferred variables:
BASE_URL=http://localhost:20129
CLOUD_URL=https://9router.com
# Backward-compatible/public variables:
NEXT_PUBLIC_BASE_URL=http://localhost:20129
NEXT_PUBLIC_CLOUD_URL=https://9router.com

# Optional outbound proxy variables for upstream provider calls
# Lowercase variants are also supported: http_proxy, https_proxy, all_proxy, no_proxy
# HTTP_PROXY=http://127.0.0.1:7890
# HTTPS_PROXY=http://127.0.0.1:7890
# ALL_PROXY=socks5://127.0.0.1:7890
# NO_PROXY=localhost,127.0.0.1

# Currently unused by application runtime (kept as reference)
# INSTANCE_NAME=9router
`;
  fs.writeFileSync(envPath, data);
  console.log('[Setup] Created default .env file');
} else {
  console.log('[Setup] .env already exists, skipping creation');
}