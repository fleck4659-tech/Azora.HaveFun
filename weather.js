// Live weather sky + Weather World mini-game (Open-Meteo + geolocation)
var weatherState = {
  active: false,
  condition: "clear",
  label: "",
  temp: null,
  wind: 0,
  clouds: [],
  drops: [],
  bolts: [],
  smoke: [],
  animId: null,
  clickTimes: [],
  gameOpen: false
};

function isUserPresentWeather() {
  var v = localStorage.getItem("loggedIn");
  return v === "true" || v === "guest";
}

function mapWeatherCode(code) {
  code = Number(code) || 0;
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 71 && code <= 77) return "cloudy";
  if (code === 95) return "storm";
  if (code >= 96 && code <= 99) return "severe";
  return "cloudy";
}

function weatherSkyColors(condition) {
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  if (condition === "severe") return dark ? ["#0a0a12", "#1a1030", "#2a1540"] : ["#1a1a2e", "#2d1b4e", "#4a2040"];
  if (condition === "storm") return dark ? ["#0f172a", "#1e293b", "#334155"] : ["#2c3e50", "#34495e", "#5d6d7e"];
  if (condition === "rain") return dark ? ["#0f172a", "#1e293b", "#334155"] : ["#5f6f81", "#7b8a9a", "#9aa8b5"];
  if (condition === "smoke" || condition === "fog") return dark ? ["#1c1917", "#292524", "#44403c"] : ["#9ca3af", "#b0b6bf", "#c5c9d0"];
  if (condition === "cloudy") return dark ? ["#111827", "#1f2937", "#374151"] : ["#6b9ac4", "#8eb4d4", "#b8d4e8"];
  return dark ? ["#0f172a", "#1e3a5f", "#1e40af"] : ["#4aa3ff", "#6ec1ff", "#a8dcff"];
}

function initWeatherClouds(condition) {
  var w = window.innerWidth, h = window.innerHeight;
  var count = condition === "clear" ? 5 : condition === "cloudy" ? 10 : 12;
  weatherState.clouds = [];
  for (var i = 0; i < count; i++) {
    weatherState.clouds.push({
      x: Math.random() * w, y: Math.random() * h * 0.55,
      s: 0.5 + Math.random() * 1.2, speed: 0.15 + Math.random() * 0.45,
      opacity: condition === "clear" ? 0.35 + Math.random() * 0.25 : 0.5 + Math.random() * 0.35
    });
  }
  weatherState.drops = [];
  if (condition === "rain" || condition === "storm" || condition === "severe") {
    var n = condition === "severe" ? 180 : condition === "storm" ? 120 : 70;
    for (var j = 0; j < n; j++) {
      weatherState.drops.push({
        x: Math.random() * w, y: Math.random() * h,
        len: 8 + Math.random() * 14,
        speed: (condition === "severe" ? 10 : condition === "storm" ? 7 : 4) + Math.random() * 4
      });
    }
  }
  weatherState.smoke = [];
  if (condition === "smoke" || condition === "fog") {
    for (var k = 0; k < 14; k++) {
      weatherState.smoke.push({
        x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.5,
        r: 40 + Math.random() * 90, speed: 0.1 + Math.random() * 0.25,
        opacity: 0.08 + Math.random() * 0.12
      });
    }
  }
  weatherState.bolts = [];
}

function drawCloud(ctx, x, y, s, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 28 * s, 0, Math.PI * 2);
  ctx.arc(x + 26 * s, y - 8 * s, 34 * s, 0, Math.PI * 2);
  ctx.arc(x + 55 * s, y + 2 * s, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 22 * s, y + 12 * s, 24 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function randomBoltPath(w, h) {
  var pts = [], x = Math.random() * w, y = 0;
  pts.push({ x: x, y: y });
  while (y < h * 0.7) {
    x += (Math.random() - 0.5) * 60;
    y += 20 + Math.random() * 40;
    pts.push({ x: x, y: y });
  }
  return pts;
}

function weatherFrame() {
  var canvas = document.getElementById("weatherCanvas");
  if (!canvas || !weatherState.active) return;
  var ctx = canvas.getContext("2d");
  var w = canvas.width = window.innerWidth;
  var h = canvas.height = window.innerHeight;
  var cond = weatherState.condition;
  var cols = weatherSkyColors(cond);
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, cols[0]); g.addColorStop(0.55, cols[1]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  weatherState.clouds.forEach(function (c) {
    c.x += c.speed * (1 + weatherState.wind / 20);
    if (c.x > w + 80) c.x = -100;
    drawCloud(ctx, c.x, c.y, c.s, c.opacity);
  });

  weatherState.smoke.forEach(function (s) {
    s.x += s.speed; s.y -= 0.05;
    if (s.x > w + s.r) s.x = -s.r;
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = cond === "smoke" ? "#6b7280" : "#d1d5db";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  if (cond === "rain" || cond === "storm" || cond === "severe") {
    ctx.strokeStyle = cond === "severe" ? "rgba(180,200,255,0.55)" : "rgba(200,220,255,0.45)";
    ctx.lineWidth = cond === "severe" ? 1.6 : 1.2;
    weatherState.drops.forEach(function (d) {
      d.y += d.speed; d.x += weatherState.wind * 0.05;
      if (d.y > h) { d.y = -10; d.x = Math.random() * w; }
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
    });
  }

  if (cond === "storm" || cond === "severe") {
    if (Math.random() < (cond === "severe" ? 0.012 : 0.006)) {
      weatherState.bolts.push({ life: cond === "severe" ? 8 : 5, path: randomBoltPath(w, h) });
      ctx.fillStyle = cond === "severe" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, w, h);
    }
    weatherState.bolts = weatherState.bolts.filter(function (b) {
      b.life--;
      if (b.life <= 0) return false;
      ctx.strokeStyle = "rgba(255,255,200," + (b.life / 8) + ")";
      ctx.lineWidth = cond === "severe" ? 3 : 2;
      ctx.beginPath();
      b.path.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      return true;
    });
  }

  weatherState.animId = requestAnimationFrame(weatherFrame);
}

function setWeatherCondition(condition, label, temp, wind) {
  weatherState.condition = condition || "clear";
  weatherState.label = label || condition;
  weatherState.temp = temp;
  weatherState.wind = wind || 0;
  initWeatherClouds(weatherState.condition);
  var el = document.getElementById("weatherLabel");
  if (el) {
    el.style.display = "block";
    el.innerHTML = "Weather World sky<br>" + weatherState.label +
      (temp != null ? " · " + Math.round(temp) + "°C" : "") +
      "<br><span style='opacity:0.8'>Double-click sky to play</span>";
  }
}

function startWeatherSystem() {
  if (!isUserPresentWeather()) { stopWeatherSystem(); return; }
  weatherState.active = true;
  document.body.classList.add("weather-active");
  var canvas = document.getElementById("weatherCanvas");
  if (canvas && !canvas._weatherBound) {
    canvas._weatherBound = true;
    canvas.addEventListener("click", onWeatherCanvasClick);
  }
  if (!weatherState.animId) weatherFrame();
  requestWeatherForLocation();
}

function stopWeatherSystem() {
  weatherState.active = false;
  document.body.classList.remove("weather-active");
  if (weatherState.animId) { cancelAnimationFrame(weatherState.animId); weatherState.animId = null; }
  var el = document.getElementById("weatherLabel");
  if (el) el.style.display = "none";
}

function onWeatherCanvasClick() {
  if (!weatherState.active || weatherState.gameOpen) return;
  var now = Date.now();
  weatherState.clickTimes = weatherState.clickTimes.filter(function (t) { return now - t < 700; });
  weatherState.clickTimes.push(now);
  if (weatherState.clickTimes.length >= 2) {
    weatherState.clickTimes = [];
    openWeatherGame();
  }
}

function requestWeatherForLocation() {
  setWeatherCondition("cloudy", "Looking up local weather…", null, 2);
  if (!navigator.geolocation) {
    setWeatherCondition("cloudy", "Location unavailable · default sky", 18, 3);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function (pos) { fetchWeather(pos.coords.latitude, pos.coords.longitude); },
    function () { setWeatherCondition("cloudy", "Location permission off · calm cloudy sky", 16, 2); },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

function fetchWeather(lat, lon) {
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) +
    "&longitude=" + encodeURIComponent(lon) +
    "&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto";
  fetch(url).then(function (r) { return r.json(); }).then(function (data) {
    var cur = data && data.current ? data.current : {};
    var code = cur.weather_code;
    var cond = mapWeatherCode(code);
    if (code === 45 || code === 48) cond = "fog";
    var names = {
      clear: "Clear skies", cloudy: "Cloudy", fog: "Foggy", smoke: "Hazy / smoky air",
      rain: "Rain", storm: "Thunderstorm", severe: "Severe thunderstorm"
    };
    setWeatherCondition(cond, names[cond] || "Local weather", cur.temperature_2m, cur.wind_speed_10m || 0);
  }).catch(function () {
    setWeatherCondition("cloudy", "Weather lookup failed · cloudy default", 15, 3);
  });
}

var wg = { raf: null, keys: {}, player: { x: 160, y: 0, vx: 0, vy: 0, onGround: false, w: 28, h: 40, spawned: false }, camX: 0, ground: [], drops: [] };

function buildTerrain() {
  var pts = [], x = 0, y = 320;
  while (x < 3200) {
    y += (Math.random() - 0.48) * 18;
    y = Math.max(240, Math.min(380, y));
    if (Math.random() < 0.04) y = Math.max(180, y - 40);
    pts.push({ x: x, y: y });
    x += 40;
  }
  wg.ground = pts;
}

function groundYAt(x) {
  var pts = wg.ground;
  if (!pts.length) return 320;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (var i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      var t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
    }
  }
  return 320;
}

function openWeatherGame() {
  weatherState.gameOpen = true;
  var ov = document.getElementById("weatherGameOverlay");
  if (!ov) return;
  ov.classList.add("open");
  ov.style.display = "flex";
  var info = document.getElementById("weatherGameInfo");
  if (info) info.textContent = (weatherState.label || weatherState.condition) +
    (weatherState.temp != null ? " · " + Math.round(weatherState.temp) + "°C" : "");
  buildTerrain();
  wg.player = { x: 160, y: 0, vx: 0, vy: 0, onGround: false, w: 28, h: 40, spawned: false };
  wg.camX = 0;
  wg.drops = [];
  var cond = weatherState.condition;
  if (cond === "rain" || cond === "storm" || cond === "severe") {
    for (var i = 0; i < (cond === "severe" ? 100 : 60); i++) {
      wg.drops.push({ x: Math.random() * 800, y: Math.random() * 400, speed: 6 + Math.random() * 5 });
    }
  }
  var canvas = document.getElementById("weatherGameCanvas");
  function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  resize();
  wg._resize = resize;
  window.addEventListener("resize", resize);
  if (!wg._keysBound) {
    wg._keysBound = true;
    window.addEventListener("keydown", function (e) {
      if (!weatherState.gameOpen) return;
      wg.keys[e.key.toLowerCase()] = true;
      if (["arrowleft","arrowright","arrowup"," ","w","a","d"].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
    });
    window.addEventListener("keyup", function (e) { wg.keys[e.key.toLowerCase()] = false; });
  }
  if (wg.raf) cancelAnimationFrame(wg.raf);
  weatherGameLoop();
}

function closeWeatherGame() {
  weatherState.gameOpen = false;
  var ov = document.getElementById("weatherGameOverlay");
  if (ov) { ov.classList.remove("open"); ov.style.display = "none"; }
  if (wg.raf) { cancelAnimationFrame(wg.raf); wg.raf = null; }
  if (wg._resize) window.removeEventListener("resize", wg._resize);
}

function weatherGameLoop() {
  if (!weatherState.gameOpen) return;
  var canvas = document.getElementById("weatherGameCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var cond = weatherState.condition;
  var cols = weatherSkyColors(cond);
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, cols[0]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  var p = wg.player;
  var left = wg.keys["a"] || wg.keys["arrowleft"];
  var right = wg.keys["d"] || wg.keys["arrowright"];
  var jump = wg.keys["w"] || wg.keys["arrowup"] || wg.keys[" "];
  if (left) p.vx = -3.2; else if (right) p.vx = 3.2; else p.vx *= 0.8;
  if (jump && p.onGround) { p.vy = -9.5; p.onGround = false; }
  p.vy += 0.45; p.x += p.vx; p.y += p.vy;
  if (p.x < 40) p.x = 40; if (p.x > 3100) p.x = 3100;

  var groundCanvasY = H * 0.72 + (groundYAt(p.x) - 300) * 0.4;
  if (!p.spawned) { p.y = groundCanvasY - p.h; p.spawned = true; p.onGround = true; }
  if (p.y + p.h > groundCanvasY) { p.y = groundCanvasY - p.h; p.vy = 0; p.onGround = true; }
  else p.onGround = false;

  wg.camX = Math.max(0, p.x - W * 0.35);

  ctx.globalAlpha = 0.35; ctx.fillStyle = "#fff";
  for (var ci = 0; ci < 6; ci++) {
    var cx = ((ci * 220) - wg.camX * 0.3) % (W + 200);
    ctx.beginPath();
    ctx.arc(cx, 50 + ci * 12, 30, 0, Math.PI * 2);
    ctx.arc(cx + 30, 45, 36, 0, Math.PI * 2);
    ctx.arc(cx + 60, 52, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = (cond === "severe" || cond === "storm") ? "#2f4f2f" : "#3d9e4a";
  ctx.beginPath(); ctx.moveTo(-10, H);
  for (var i = 0; i < wg.ground.length; i++) {
    var gx = wg.ground[i].x - wg.camX;
    var gy2 = H * 0.72 + (wg.ground[i].y - 300) * 0.4;
    ctx.lineTo(gx, gy2);
  }
  ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();

  if (cond === "rain" || cond === "storm" || cond === "severe") {
    ctx.strokeStyle = "rgba(200,220,255,0.5)"; ctx.lineWidth = 1.2;
    wg.drops.forEach(function (d) {
      d.y += d.speed;
      if (d.y > H) { d.y = -10; d.x = Math.random() * W; }
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + 12); ctx.stroke();
    });
  }
  if (cond === "storm" || cond === "severe") {
    if (Math.random() < (cond === "severe" ? 0.02 : 0.01)) {
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#ffeebb"; ctx.lineWidth = 2;
      var bx = Math.random() * W;
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 20, H * 0.3); ctx.lineTo(bx - 10, H * 0.5); ctx.stroke();
    }
  }
  if (cond === "smoke" || cond === "fog") {
    ctx.fillStyle = "rgba(120,120,120,0.15)"; ctx.fillRect(0, 0, W, H);
  }

  var px = p.x - wg.camX;
  ctx.fillStyle = "#ffcc00"; ctx.fillRect(px, p.y, p.w, p.h * 0.35);
  ctx.fillStyle = "#1e60ff"; ctx.fillRect(px, p.y + p.h * 0.35, p.w, p.h * 0.4);
  ctx.fillStyle = "#00ebd4"; ctx.fillRect(px, p.y + p.h * 0.75, p.w, p.h * 0.25);

  wg.raf = requestAnimationFrame(weatherGameLoop);
}

window.startWeatherSystem = startWeatherSystem;
window.stopWeatherSystem = stopWeatherSystem;
window.openWeatherGame = openWeatherGame;
window.closeWeatherGame = closeWeatherGame;
