const { createServer } = require("node:http");
const axios = require("axios");

const server = createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://localhost");
  if (req.method === "GET" && pathname === "/weather") {
    const location = searchParams.get("location")?.trim();
    if (!location) {
      res.statusCode = 400;
      res.end("Please provide a location.");
      return;
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
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(weatherData));
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
