const { createServer } = require("node:http");
const axios = require("axios");
const { createClient } = require("redis");

const cacheTtlSeconds = 30;
const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  disableOfflineQueue: true,
});
redis.on("error", (error) => console.warn("Redis:", error.code || error.name));
redis.connect().catch(() => console.warn("Redis connection failed."));

const server = createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://localhost");
  if (req.method === "GET" && pathname === "/weather") {
    const location = searchParams.get("location")?.trim();
    if (!location) {
      res.statusCode = 400;
      res.end("Please provide a location.");
      return;
    }

    const cacheKey = `weather:current:us:${location}`;
    if (redis.isReady) {
      try {
        const cachedWeather = await redis.get(cacheKey);
        if (cachedWeather !== null) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("X-Cache", "HIT");
          res.end(cachedWeather);
          return;
        }
      } catch {
        console.warn("Redis read failed. Fetching live weather.");
      }
    }

    const visualCrossingURL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}`;

    try {
      const axiosResponse = await axios.get(visualCrossingURL, {
        params: {
          key: process.env.VISUAL_CROSSING_API_KEY,
          include: "current",
          unitGroup: "us",
        },
      });

      const currentConditions = axiosResponse.data.currentConditions;
      const weatherData = {
        location,
        currentTemp: currentConditions.temp,
        feelsLike: currentConditions.feelslike,
        conditions: currentConditions.conditions,
        precipationProbability: currentConditions.precipprob,
        windSpeed: currentConditions.windspeed,
      };
      const body = JSON.stringify(weatherData);
      if (redis.isReady) {
        try {
          await redis.set(cacheKey, body, {
            expiration: { type: "EX", value: cacheTtlSeconds },
          });
        } catch {
          console.warn("Redis write failed.");
        }
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Cache", "MISS");
      res.end(body);
    } catch (error) {
      if (error.response?.status === 400) {
        res.statusCode = 400;
        res.end("Weather lookup rejected. Check that the location is valid.");
        return;
      }

      res.statusCode = 502;
      res.end("Could not retrieve weather data. Please try again later.");
    }
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(3000);
