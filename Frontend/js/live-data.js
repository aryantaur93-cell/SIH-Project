// Live external-data bridge for the existing Leaflet dashboard.
// Set window.NEXTRA_API_URL before this script if the API is hosted elsewhere.
(() => {
  const base = window.NEXTRA_API_URL || 'http://localhost:4000/api';
  window.NextraLive = {
    async weather(lat, lon) { const r = await fetch(`${base}/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`); if (!r.ok) throw new Error('Weather request failed'); return r.json(); },
    async regionWeather() { const r = await fetch(`${base}/weather/region`); if (!r.ok) throw new Error('Regional weather request failed'); return r.json(); },
    async route(from, to) { const q = new URLSearchParams({ fromLat:from[0], fromLon:from[1], toLat:to[0], toLon:to[1] }); const r = await fetch(`${base}/map/route?${q}`); if (!r.ok) throw new Error('Route request failed'); return r.json(); }
  };
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const regional = await window.NextraLive.regionWeather();
      window.NEXTRA_LIVE_WEATHER = regional.data;
      if (typeof drawMapWeather === 'function') drawMapWeather();
      const label = document.querySelector('.forecast-confidence');
      if (label) label.textContent = `Live weather · ${new Date(regional.fetched_at).toLocaleTimeString()}`;
    } catch (error) { console.warn('Live weather unavailable; retaining cached dashboard data.', error); }
  });
})();