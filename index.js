const { createServer } = require("node:http");
const axios = require("axios");

const server = createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, "http://localhost");
  const location = searchParams.get("location");
  const visualCrossingURL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}`;

  if (req.method === "GET" && pathname === "/weather") {
    const axiosResponse = await axios.get(visualCrossingURL, {
      params: {
        key: process.env.VISUAL_CROSSING_API_KEY,
        include: "current",
        unitGroup: "us",
      },
    });
    const currentConditions = axiosResponse.data.currentConditions;
    console.log("currentConditions: ", currentConditions);
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
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(3000);
