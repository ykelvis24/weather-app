import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [recentSearches, setRecentSearches] = useState(() => {
    const savedSearches = localStorage.getItem("recentSearches");

    return savedSearches ? JSON.parse(savedSearches) : [];
  });

  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  const getWeatherInfo = (code) => {
    if (code === 0) {
      return { icon: "☀️", description: "Clear Sky" };
    }

    if (code >= 1 && code <= 3) {
      return { icon: "🌤️", description: "Partly Cloudy" };
    }

    if (code >= 45 && code <= 48) {
      return { icon: "🌫️", description: "Foggy" };
    }

    if (code >= 51 && code <= 57) {
      return { icon: "🌦️", description: "Drizzle" };
    }

    if (code >= 61 && code <= 67) {
      return { icon: "🌧️", description: "Rainy" };
    }

    if (code >= 71 && code <= 77) {
      return { icon: "❄️", description: "Snowy" };
    }

    if (code >= 80 && code <= 82) {
      return { icon: "🌧️", description: "Rain Showers" };
    }

    if (code >= 95 && code <= 99) {
      return { icon: "⛈️", description: "Thunderstorm" };
    }

    return { icon: "🌤️", description: "Unknown" };
  };

  const convertTemperature = (temperature) => {
    if (unit === "C") {
      return Math.round(temperature);
    }

    return Math.round((temperature * 9) / 5 + 32);
  };

  const searchWeather = async (searchCity = city) => {
    if (!searchCity.trim()) {
      setError("Please enter a city.");
      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);
    setForecast([]);

    try {
      const locationResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchCity,
        )}&count=1&language=en&format=json`,
      );

      const locationData = await locationResponse.json();

      if (!locationData.results) {
        setError("City not found.");
        setLoading(false);
        return;
      }

      const { latitude, longitude, name, country } = locationData.results[0];

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      );

      const weatherData = await weatherResponse.json();

      setWeather({
        city: name,
        country: country,
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        wind: weatherData.current.wind_speed_10m,
        weatherCode: weatherData.current.weather_code,
        time: weatherData.current.time,
      });

      setRecentSearches((previous) => {
        const updated = [
          name,
          ...previous.filter(
            (previousCity) => previousCity.toLowerCase() !== name.toLowerCase(),
          ),
        ];

        return updated.slice(0, 5);
      });

      const daily = weatherData.daily;

      const forecastData = daily.time.slice(1, 6).map((date, index) => ({
        date: date,
        max: daily.temperature_2m_max[index + 1],
        min: daily.temperature_2m_min[index + 1],
        weatherCode: daily.weather_code[index + 1],
      }));

      setForecast(forecastData);
    } catch (error) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);
    setForecast([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const locationResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
          );

          const locationData = await locationResponse.json();

          const location = locationData.results?.[0];

          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
          );

          const weatherData = await weatherResponse.json();

          setWeather({
            city: location?.name || "Your Location",
            country: location?.country || "",
            temperature: weatherData.current.temperature_2m,
            feelsLike: weatherData.current.apparent_temperature,
            humidity: weatherData.current.relative_humidity_2m,
            wind: weatherData.current.wind_speed_10m,
            weatherCode: weatherData.current.weather_code,
            time: weatherData.current.time,
          });

          const daily = weatherData.daily;

          const forecastData = daily.time.slice(1, 6).map((date, index) => ({
            date,
            max: daily.temperature_2m_max[index + 1],
            min: daily.temperature_2m_min[index + 1],
            weatherCode: daily.weather_code[index + 1],
          }));

          setForecast(forecastData);
        } catch {
          setError("Unable to get weather for your location.");
        }

        setLoading(false);
      },
      () => {
        setLoading(false);
        setError("Location permission was denied.");
      },
    );
  };

  const searchRecentCity = (recentCity) => {
    setCity(recentCity);
    searchWeather(recentCity);
  };

  return (
    <div className="app">
      <h1>Weather App</h1>

      <div className="search">
        <input
          type="text"
          placeholder="Enter a city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchWeather();
            }
          }}
        />

        <button onClick={searchWeather}>Search</button>
      </div>

      <button className="location-button" onClick={getMyLocation}>
        📍 Use My Location
      </button>

      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <p>Recent searches</p>

          <div className="recent-list">
            {recentSearches.map((recentCity) => (
              <button
                key={recentCity}
                onClick={() => searchRecentCity(recentCity)}
              >
                📍 {recentCity}
              </button>
            ))}
          </div>
        </div>
      )}

      {weather && (
        <div className="unit-toggle">
          <button
            className={unit === "C" ? "active" : ""}
            onClick={() => setUnit("C")}
          >
            °C
          </button>

          <button
            className={unit === "F" ? "active" : ""}
            onClick={() => setUnit("F")}
          >
            °F
          </button>
        </div>
      )}

      {loading && <p className="message">Loading...</p>}

      {error && <p className="error">{error}</p>}

      {weather && (
        <>
          <div className="weather-card">
            <div className="location">
              📍 {weather.city}, {weather.country}
            </div>

            <div className="weather-icon">
              {getWeatherInfo(weather.weatherCode).icon}
            </div>

            <div className="temperature">
              {convertTemperature(weather.temperature)}°{unit}
            </div>

            <p className="description">
              {getWeatherInfo(weather.weatherCode).description}
            </p>

            <p className="updated-time">
              Updated:{" "}
              {new Date(weather.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <div className="weather-details">
              <div className="weather-detail">
                <span>💧</span>
                <p>Humidity</p>
                <strong>{weather.humidity}%</strong>
              </div>

              <div className="weather-detail">
                <span>💨</span>
                <p>Wind</p>
                <strong>{weather.wind} km/h</strong>
              </div>

              <div className="weather-detail">
                <span>🥵</span>
                <p>Feels Like</p>
                <strong>
                  {convertTemperature(weather.feelsLike)}°{unit}
                </strong>
              </div>
            </div>
          </div>

          {forecast.length > 0 && (
            <div className="forecast">
              <h2>5-Day Forecast</h2>

              <div className="forecast-list">
                {forecast.map((day) => {
                  const weatherInfo = getWeatherInfo(day.weatherCode);

                  return (
                    <div className="forecast-day" key={day.date}>
                      <p>
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </p>

                      <span>{weatherInfo.icon}</span>

                      <strong>{convertTemperature(day.max)}°</strong>

                      <small>{convertTemperature(day.min)}°</small>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
