import redisClient from "../config/redis.js";

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log("Cache HIT:", key);
        return res.json(JSON.parse(cachedData));
      }

      console.log("Cache MISS:", key);
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        redisClient.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache error:", error);
      next();
    }
  };
};

export const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("Cache cleared:", keys.length, "keys");
    }
  } catch (error) {
    console.error("Cache clear error:", error);
  }
};
