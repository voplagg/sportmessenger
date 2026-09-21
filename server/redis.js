import "dotenv/config";
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

let redisErrorCount = 0;
redis.on("error", (err) => {
  redisErrorCount++;

  // Первые 3 ошибки логируем полностью, потом — раз в 50 ошибок кратко
  if (redisErrorCount <= 3) {
    console.error("❌ Redis error FULL:", {
      message: err.message,
      code: err.code,
      stack: err.stack?.split("\n").slice(0, 3).join("\n"),
    });
  } else if (redisErrorCount % 50 === 0) {
    console.error(
      `❌ Redis errors: ${redisErrorCount} total (last: ${err.code || err.message})`
    );
  }
});