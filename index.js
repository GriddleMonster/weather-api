const { createServer } = require("node:http");

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && pathname === "/weather") {
    const weatherData = {
      location: "Boston, MA",
      currentTemp: "40",
      conditions: "Rainy",
      precipationProbability: "35%",
      windSpeed: "30mph",
    };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(weatherData));
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(3000);
