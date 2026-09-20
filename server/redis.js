import "dotenv/config";              // ← ЭТА СТРОКА
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

console.log("🔌 Connecting to Redis:", redisUrl.replace(/:[^:@]+@/, ":***@"));

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,
  retryStrategy: (times) => {
    console.log(`🔄 Retry #${times}...`);
    return Math.min(times * 1000, 5000);
  },
  showFriendlyErrorStack: true,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("✅ Redis ready"));
redis.on("error", (err) => {
  console.error("❌ Redis error FULL:", {
    message: err.message,
    code: err.code,
    stack: err.stack?.split("\n").slice(0, 3).join("\n"),
  });
});