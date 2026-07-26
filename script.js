// Configuration - Adjust these to change speed and phrases
const fallSpeed = 2; // Higher number = faster fall
const rotationSpeed = 0.5; // Higher number = faster rotation
const phrases = ["wow!", "this is cool!", "awesome!", "amazing!", "leemoon!"];

let fallingTextActive = true;
let spawnInterval;

// Mock database for search demonstration
const database = {
    users: [
        { username: "603blox", profileLink: "https://www.roblox.com/users/9744531169/profile" },
        { username: "AzoraDeveloper", profileLink: "#" },
        { username: "LeemoonFan", profileLink: "#" },
        { username: "Guest1337", profileLink: "#" }
    ],
    games: [
        { title: "Super Azora Run", author: "603blox", link: "#" },
        { title: "Avatar Customizer Tycoon", author: "AzoraDeveloper", link: "#" },
        { title: "Sword Fighting Arena", author: "System", link: "#" }
    ]
};

let currentSearchTab = "users";

// ============================================================
// GLOBAL USER REGISTRY (shared across all devices)
// GitHub Pages is static — real multi-user tracking needs a free
// Firebase Realtime Database. Guests are NEVER sent to the cloud.
// Setup: see servers.html staff note once unlocked.
// ============================================================
var AZORA_CLOUD = {
    // ★ Paste your Firebase Realtime Database root URL (no trailing slash)
    // Example: "https://azora-havefun-default-rtdb.firebaseio.com"
    firebaseUrl: "",
    isReady: function () {
        var u = (this.firebaseUrl || "").trim();
        return u.indexOf("https://") === 0 && u.indexOf("YOUR") === -1 && u.indexOf("example") === -1;
    },
    registryPath: "/azoraRegistry",
    metaPath: "/azoraMeta"
};

function cloudBase() {
    return (AZORA_CLOUD.firebaseUrl || "").replace(/\/$/, "");
}

/** Public profile only — never send passwords */
function buildPublicRegistryEntry(username, userId) {
    return {
        username: username,
        userId: userId,
        isGuest: false,
        createdAt: Date.now()
    };
}

/**
 * Register a real account in the global cloud list.
 * Guests must not call this.
 * callback(err, entry)
 */
function registerGlobalUser(username, preferredUserId, callback) {
    callback = callback || function () {};
    if (!AZORA_CLOUD.isReady()) {
        callback(new Error("Cloud registry not configured"), null);
        return;
    }
    if (!username) {
        callback(new Error("No username"), null);
        return;
    }

    var safeKey = encodeURIComponent(String(username).toLowerCase().replace(/[.#$\/\[\]]/g, "_"));
    var entryUrl = cloudBase() + AZORA_CLOUD.registryPath + "/" + safeKey + ".json";

    // If username already exists globally, reject
    fetch(entryUrl)
        .then(function (r) { return r.json(); })
        .then(function (existing) {
            if (existing && existing.username) {
                callback(new Error("USERNAME_TAKEN"), null);
                return null;
            }
            // Next global ID from meta, fallback to timestamp-based
            var metaUrl = cloudBase() + AZORA_CLOUD.metaPath + "/nextId.json";
            return fetch(metaUrl)
                .then(function (r) { return r.json(); })
                .then(function (nextId) {
                    var n = (typeof nextId === "number" && nextId >= 0) ? nextId : 0;
                    var userId = preferredUserId || ("Aza: " + n);
                    var entry = buildPublicRegistryEntry(username, userId);
                    // Write user + bump nextId (best-effort; small race possible)
                    return Promise.all([
                        fetch(entryUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(entry)
                        }),
                        fetch(metaUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(n + 1)
                        })
                    ]).then(function () { return entry; });
                });
        })
        .then(function (entry) {
            if (entry) callback(null, entry);
        })
        .catch(function (err) {
            console.warn("[Azora Cloud] register failed", err);
            callback(err, null);
        });
}

/** Load all global users (no guests). callback(err, array) */
function fetchGlobalRegistry(callback) {
    callback = callback || function () {};
    if (!AZORA_CLOUD.isReady()) {
        callback(new Error("Cloud registry not configured"), []);
        return;
    }
    var url = cloudBase() + AZORA_CLOUD.registryPath + ".json";
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var list = [];
            if (data && typeof data === "object") {
                Object.keys(data).forEach(function (k) {
                    var u = data[k];
                    if (u && u.username && !u.isGuest) list.push(u);
                });
            }
            // Sort by createdAt
            list.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
            callback(null, list);
        })
        .catch(function (err) {
            console.warn("[Azora Cloud] fetch failed", err);
            callback(err, []);
        });
}

window.AZORA_CLOUD = AZORA_CLOUD;
window.registerGlobalUser = registerGlobalUser;
window.fetchGlobalRegistry = fetchGlobalRegistry;

// --- Global server flags (from Staff Console / Firebase) ---
function applyServerFlags(flags) {
    if (!flags || typeof flags !== "object") return;
    var banner = document.getElementById("serverMessage");
    if (banner) {
        if (flags.maintenance) {
            banner.style.display = "block";
            banner.innerHTML = "⚠️ Azora is in <strong>maintenance mode</strong>. Some features may be limited.<br>Please check back soon.";
        } else if (flags.broadcast) {
            banner.style.display = "block";
            banner.textContent = String(flags.broadcast);
        } else {
            // only hide if it was our dynamic message
            if (banner.getAttribute("data-dynamic") === "1" || flags.broadcast === "" || flags.maintenance === false) {
                if (!flags.maintenance && !flags.broadcast) banner.style.display = "none";
            }
        }
        if (flags.maintenance || flags.broadcast) banner.setAttribute("data-dynamic", "1");
    }
    if (flags.event) {
        document.documentElement.setAttribute("data-azora-event", String(flags.event));
    } else {
        document.documentElement.removeAttribute("data-azora-event");
    }
    // Coins display sync if present
    try {
        var coins = localStorage.getItem("azoraCoins");
        var el = document.getElementById("bucks");
        if (el && coins !== null) el.textContent = coins;
    } catch (e) {}
}

function loadServerFlags() {
    // Prefer cloud meta; fall back to local staff flags
    function fromLocal() {
        try {
            var flags = JSON.parse(localStorage.getItem("azoraServerFlags") || "{}");
            applyServerFlags(flags);
        } catch (e) {}
        // coins
        try {
            var el = document.getElementById("bucks");
            if (el) el.textContent = localStorage.getItem("azoraCoins") || "0";
        } catch (e) {}
    }

    if (typeof AZORA_CLOUD === "undefined" || !AZORA_CLOUD.isReady()) {
        fromLocal();
        return;
    }
    var base = cloudBase();
    Promise.all([
        fetch(base + "/azoraMeta/broadcast.json").then(function (r) { return r.json(); }).catch(function () { return null; }),
        fetch(base + "/azoraMeta/maintenance.json").then(function (r) { return r.json(); }).catch(function () { return null; }),
        fetch(base + "/azoraMeta/event.json").then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (vals) {
        applyServerFlags({
            broadcast: vals[0],
            maintenance: vals[1],
            event: vals[2]
        });
    }).catch(fromLocal);
}

window.loadServerFlags = loadServerFlags;
window.applyServerFlags = applyServerFlags;



// Create the container automatically
const container = document.createElement('div');
container.id = 'falling-text-container';
document.body.appendChild(container);

// Function to spawn a random word
function spawnWord() {
    if (!fallingTextActive) return;
    const word = document.createElement('div');
    word.className = 'falling-word';
    word.innerText = phrases[Math.floor(Math.random() * phrases.length)];
    
    word.style.left = Math.random() * 90 + 'vw';
    word.style.top = '-50px'; // Start just above the screen
    
    container.appendChild(word);
    
    let currentTop = -50;
    let currentRotation = 0;
    const rotationDirection = Math.random() > 0.5 ? 1 : -1; 

    const interval = setInterval(() => {
        currentTop += fallSpeed;
        currentRotation += rotationSpeed * rotationDirection;
        
        word.style.top = currentTop + 'px';
        word.style.transform = `rotate(${currentRotation}deg)`;
        
        if (currentTop > window.innerHeight) {
            clearInterval(interval);
            word.remove();
        }
    }, 20);
}

// Spawn a new word every 10.0 seconds
function startFallingPhrases() {
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnWord, 10000);
}
startFallingPhrases();

// --- Settings Logic ---
function openSettings() {
    document.getElementById("settingsOverlay").style.display = "flex";
    var me = typeof getMyUsername === "function" ? getMyUsername() : "";
    var sel = document.getElementById("statusSelect");
    if (sel && me && typeof getUserStatus === "function") {
        sel.value = getUserStatus(me) || "online";
    }
    // Sync appearance controls
    if (typeof loadBrowserAppearance === "function") loadBrowserAppearance();
    var themeSel = document.getElementById("themeSelect");
    if (themeSel) themeSel.value = localStorage.getItem("azoraTheme") || "auto";
    if (typeof switchSettingsTab === "function") switchSettingsTab("basic");
    if (typeof refreshSecurityPanel === "function") refreshSecurityPanel();
}
function closeSettings() {
    document.getElementById("settingsOverlay").style.display = "none";
}
function toggleFallingText() {
    fallingTextActive = document.getElementById("fallingTextToggle").checked;
    if (!fallingTextActive) {
        container.innerHTML = ""; // instantly clear screen of phrases
    }
}
function logoutUser() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("azoraAccount");
    alert("Logged out successfully.");
    location.reload();
}

// --- Search Logic ---
function openSearch() {
    document.getElementById("searchOverlay").style.display = "flex";
    document.getElementById("searchInput").focus();
    performSearch();
}
function closeSearch() {
    document.getElementById("searchOverlay").style.display = "none";
}
function setSearchTab(tab) {
    currentSearchTab = tab;
    document.getElementById("searchUsersTab").classList.toggle("active", tab === "users");
    document.getElementById("searchGamesTab").classList.toggle("active", tab === "games");
    document.getElementById("searchInput").placeholder = tab === "users" ? "Search usernames..." : "Search games...";
    performSearch();
}
function performSearch() {
    const query = document.getElementById("searchInput").value.trim().toLowerCase();
    const resultsContainer = document.getElementById("searchResultsContainer");
    resultsContainer.innerHTML = "";

    // Load custom dynamic profiles from local storage to include newly made accounts in user searches!
    let localUsers = [];
    const localAcc = localStorage.getItem("azoraAccount");
    if (localAcc) {
        try {
            const parsed = JSON.parse(localAcc);
            localUsers.push({ username: parsed.username, profileLink: "#" });
        } catch (e) {}
    }

    const allUsers = [...database.users, ...localUsers];
    // Remove duplicates from demo array
    const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.username.toLowerCase(), item])).values());

    let results = [];
    if (currentSearchTab === "users") {
        results = uniqueUsers.filter(u => u.username.toLowerCase().includes(query));
    } else {
        results = database.games.filter(g => g.title.toLowerCase().includes(query) || g.author.toLowerCase().includes(query));
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = "<div class='no-results'>No results found.</div>";
        return;
    }

    results.forEach(item => {
        const row = document.createElement("div");
        row.className = "search-result-item";
        if (currentSearchTab === "users") {
            row.innerHTML = `👤 <strong>${item.username}</strong> <a href="${item.profileLink}" class="search-action-btn">View</a>`;
        } else {
            row.innerHTML = `🎮 <strong>${item.title}</strong> <span class="creator-by">by ${item.author}</span> <a href="${item.link}" class="search-action-btn">Play</a>`;
        }
        resultsContainer.appendChild(row);
    });
}

// --- Dropdown Socials logic ---
let lockedOpen = false;
function toggleDropdown() {
    const menu = document.getElementById("socialDropdown");
    lockedOpen = !lockedOpen;
    menu.style.display = lockedOpen ? "block" : "none";
}

const dropdown = document.querySelector(".dropdown");
if (dropdown) {
    dropdown.addEventListener("mouseenter", function () {
        if (!lockedOpen) {
            document.getElementById("socialDropdown").style.display = "block";
        }
    });

    dropdown.addEventListener("mouseleave", function () {
        if (!lockedOpen) {
            document.getElementById("socialDropdown").style.display = "none";
        }
    });
}

// --- Account Popup Modal Logic ---



function ensureGuestButtonsVisible() {
    var loggedIn = localStorage.getItem("loggedIn");
    var gb = document.getElementById("guestButtons");
    var up = document.getElementById("userPanel");
    var guestBtn = document.getElementById("topbarGuestBtn");
    if (loggedIn === "true" || loggedIn === "guest") {
        if (gb) gb.style.setProperty("display", "none", "important");
        if (up) up.style.setProperty("display", "flex", "important");
    } else {
        // Logged out → ALWAYS show Create Account, Log In, Continue as Guest
        if (gb) gb.style.setProperty("display", "flex", "important");
        if (up) up.style.setProperty("display", "none", "important");
        if (guestBtn) {
            guestBtn.style.setProperty("display", "inline-block", "important");
            guestBtn.style.setProperty("visibility", "visible", "important");
        }
    }
}


function getPublicUserId(username, accountHint) {
    // 1) From account object if provided
    if (accountHint && accountHint.userId) return accountHint.userId;
    // 2) Current logged-in account
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (acc.userId && (
            (username && acc.username === username) ||
            (acc.isGuest && (!username || username === "Guest" || username === ""))
        )) {
            return acc.userId;
        }
    } catch (e) {}
    // 3) Registry lookup by username
    try {
        var registry = JSON.parse(localStorage.getItem("azoraUserRegistry") || "[]");
        if (username) {
            for (var i = 0; i < registry.length; i++) {
                if (registry[i].username === username) return registry[i].userId;
            }
        }
    } catch (e) {}
    return null;
}

function setProfileUserIdDisplay(userId, isGuest) {
    var el = document.getElementById("profileUserId");
    if (!el) return;
    if (!userId) {
        el.textContent = "";
        el.className = "profile-user-id";
        el.style.display = "none";
        return;
    }
    el.style.display = "block";
    el.textContent = userId;
    el.className = "profile-user-id " + (isGuest ? "guest" : "normal");
}

function continueAsGuest() {
    var sessionId = "guest_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

    // Guests also get a public User ID (Aza: N)
    var registry = [];
    try { registry = JSON.parse(localStorage.getItem("azoraUserRegistry") || "[]"); } catch (e) {}
    var nextId = registry.length;
    var userId = "Aza: " + nextId;

    var account = {
        isGuest: true,
        username: "",
        displayName: "Guest",
        guestId: sessionId,
        userId: userId,
        avatar: {
            head: "#ffcc00",
            torso: "#1e60ff",
            leftArm: "#ffcc00",
            rightArm: "#ffcc00",
            leftLeg: "#00ebd4",
            rightLeg: "#00ebd4",
            face: "default"
        }
    };

    registry.push({
        userId: userId,
        username: "",
        displayName: "Guest",
        isGuest: true,
        createdAt: Date.now()
    });
    localStorage.setItem("azoraUserRegistry", JSON.stringify(registry));
    localStorage.setItem("azoraAccount", JSON.stringify(account));
    localStorage.setItem("loggedIn", "guest");

    alert("Welcome, Guest!\n\nYour public User ID is " + userId + "\n\n• No username or password\n• Avatar cannot be saved\n• Progress is not saved\n\nCreate an account anytime to unlock everything.");
    location.reload();
}

function openCreateAccount() {
    if (typeof clearAccountError === "function") clearAccountError();
    document.getElementById("accountOverlay").style.display = "flex";
    document.getElementById("popupTitle").innerHTML = "Join Azora";
    document.getElementById("popupSubtitle").style.display = "block";
    document.getElementById("confirmPassword").style.display = "block";
    document.getElementById("email").style.display = "block";
    document.querySelectorAll("#accountOverlay .checkbox").forEach(el => el.style.display = "block");
    document.getElementById("mainButton").innerHTML = "Create Account";
    document.getElementById("switchMode").innerHTML = "Log In";
    var switchP = document.querySelector("#accountOverlay .popup p:last-of-type");
    if (switchP && switchP.childNodes[0]) switchP.childNodes[0].textContent = "Already have an account? ";
    var gBtn = document.getElementById("guestContinueBtn");
    if (gBtn) gBtn.style.display = "block";
}

function openLogin() {
    if (typeof clearAccountError === "function") clearAccountError();
    document.getElementById("accountOverlay").style.display = "flex";
    document.getElementById("popupTitle").innerHTML = "Welcome Back!";
    document.getElementById("popupSubtitle").style.display = "none";
    document.getElementById("confirmPassword").style.display = "none";
    document.getElementById("email").style.display = "none";
    document.querySelectorAll("#accountOverlay .checkbox").forEach(el => el.style.display = "none");
    document.getElementById("mainButton").innerHTML = "Log In";
    document.getElementById("switchMode").innerHTML = "Create Account";
    var switchP = document.querySelector("#accountOverlay .popup p:last-of-type");
    if (switchP && switchP.childNodes[0]) switchP.childNodes[0].textContent = "Don't have an account? ";
    // Keep Guest visible on login screen too
    var gBtn = document.getElementById("guestContinueBtn");
    if (gBtn) gBtn.style.display = "block";
    var divider = document.querySelector(".guest-divider");
    if (divider) divider.style.display = "block";
    var hint = document.querySelector(".guest-hint");
    if (hint) hint.style.display = "block";
}

function getSavedAccounts() {
    try {
        return JSON.parse(localStorage.getItem("azoraAccounts") || "{}");
    } catch (e) {
        return {};
    }
}

function saveSavedAccounts(map) {
    localStorage.setItem("azoraAccounts", JSON.stringify(map));
}

// Import single legacy account into multi-account store if needed
function migrateLegacyAccount() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (!acc || !acc.username || acc.isGuest) return;
        var map = getSavedAccounts();
        if (!map[acc.username]) {
            map[acc.username] = acc;
            saveSavedAccounts(map);
        }
    } catch (e) {}
}

function setLoggedInAccount(account) {
    // Persist full account + session flag so topbar switches after reload
    localStorage.setItem("azoraAccount", JSON.stringify(account));
    localStorage.setItem("loggedIn", "true");
}

function finishCreateAccount(username, password, userId) {
    migrateLegacyAccount();
    var map = getSavedAccounts();
    var account = {
        username: username,
        password: password,
        userId: userId,
        isGuest: false,
        avatar: {
            head: "#ffcc00",
            torso: "#1e60ff",
            leftArm: "#ffcc00",
            rightArm: "#ffcc00",
            leftLeg: "#00ebd4",
            rightLeg: "#00ebd4",
            face: "default"
        }
    };
    map[username] = account;
    saveSavedAccounts(map);

    var registry = [];
    try { registry = JSON.parse(localStorage.getItem("azoraUserRegistry") || "[]"); } catch (e) {}
    registry.push({
        userId: userId,
        username: username,
        isGuest: false,
        createdAt: Date.now()
    });
    localStorage.setItem("azoraUserRegistry", JSON.stringify(registry));

    setLoggedInAccount(account);
    alert("Welcome to Azora, " + username + "!\nYour User ID is " + userId + "\nYour account has been saved.");
    location.reload();
}

function createAccount() {
    if (typeof clearAccountError === "function") clearAccountError();
    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;
    var confirm = document.getElementById("confirmPassword").value;
    var btn = document.getElementById("mainButton");

    if (!username || !password) {
        alert("Please fill out username and password!");
        return;
    }
    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    migrateLegacyAccount();
    var map = getSavedAccounts();
    if (map[username]) {
        alert("That username is already taken on this device. Try another, or Log In.");
        return;
    }

    // Local fallback ID (used if cloud is offline / not set up yet)
    var registry = [];
    try { registry = JSON.parse(localStorage.getItem("azoraUserRegistry") || "[]"); } catch (e) {}
    var localId = "Aza: " + registry.length;

    if (typeof AZORA_CLOUD !== "undefined" && AZORA_CLOUD.isReady()) {
        if (btn) { btn.disabled = true; btn.textContent = "Creating…"; }
        registerGlobalUser(username, null, function (err, entry) {
            if (btn) { btn.disabled = false; btn.textContent = "Create Account"; }
            if (err && err.message === "USERNAME_TAKEN") {
                showAccountError("That username is already taken on Azora. Try another.");
                return;
            }
            if (err || !entry) {
                // Still allow local account so signup is not blocked
                console.warn("Cloud register failed, saving locally only", err);
                finishCreateAccount(username, password, localId);
                return;
            }
            finishCreateAccount(username, password, entry.userId);
        });
        return;
    }

    // No cloud configured → local only (old behavior)
    finishCreateAccount(username, password, localId);
}

function showAccountError(msg) {
    var el = document.getElementById("accountError");
    if (!el) {
        alert(msg);
        return;
    }
    el.textContent = msg;
    el.style.display = "block";
}

function clearAccountError() {
    var el = document.getElementById("accountError");
    if (el) {
        el.textContent = "";
        el.style.display = "none";
    }
}

function findAccountByUsername(username) {
    var map = getSavedAccounts();
    // Exact key first
    if (map[username]) return map[username];
    // Case-insensitive username match (password still exact)
    var lower = username.toLowerCase();
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === lower) return map[keys[i]];
    }
    return null;
}

function loginAccount() {
    clearAccountError();

    var username = document.getElementById("username").value.trim();
    // Do NOT trim password — must match 100% exactly as stored
    var password = document.getElementById("password").value;

    if (!username) {
        showAccountError("Please enter your username.");
        return;
    }
    if (password.length === 0) {
        showAccountError("Please enter your password.");
        return;
    }

    migrateLegacyAccount();
    var account = findAccountByUsername(username);

    if (!account) {
        showAccountError("No account found with that username. Create an account first.");
        return;
    }

    // 100% exact password match (case-sensitive, character-for-character)
    var saved = account.password;
    if (typeof saved !== "string" || saved !== password) {
        showAccountError("The password is incorrect. Please type the correct password");
        // Clear password field so they re-type
        var pw = document.getElementById("password");
        if (pw) {
            pw.value = "";
            pw.focus();
        }
        return;
    }

    // Password matched — restore full saved progress and log in
    setLoggedInAccount(account);
    clearAccountError();
    alert("Welcome back, " + account.username + "!\nYour progress has been restored.");
    location.reload();
}

// Attach main account modal button action
document.getElementById("mainButton").addEventListener("click", function () {
    if (this.innerHTML === "Create Account") {
        createAccount();
    } else {
        loginAccount();
    }
});

// Switch Mode Toggle link inside the popup
document.getElementById("switchMode").addEventListener("click", function (e) {
    e.preventDefault();
    if (this.innerHTML === "Log In") {
        openLogin();
    } else {
        openCreateAccount();
    }
});

// Close popups when clicking outside the box
document.querySelectorAll(".overlay").forEach(overlay => {
    overlay.addEventListener("click", function (e) {
        if (e.target === this) {
            this.style.display = "none";
        }
    });
});

// --- Creator site handling ---
function handleCreateClick() {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
        window.open("creator.html", "_blank");
    } else if (loggedIn === "guest") {
        alert("Guests can't use Creator Studio. Create a free account first!");
        openCreateAccount();
    } else {
        alert("Please sign up first to access the Creator Studio!");
        openCreateAccount();
    }
}

// --- BasicCharacterService toggle ---
function toggleCharacterService() {
    const isChecked = document.getElementById("charServiceToggle").checked;
    localStorage.setItem("charServiceEnabled", isChecked);
    alert(`BasicCharacterService is now ${isChecked ? "ENABLED" : "DISABLED"}!`);
}

// --- TOS Modal Toggle Logic ---
function openTOS(event) {
    event.preventDefault();
    document.getElementById("tosOverlay").style.display = "flex";
}

function closeTOS() {
    document.getElementById("tosOverlay").style.display = "none";
}

// --- 3D Avatar Global Variables ---
let scene, camera, renderer;
let headMesh, torsoMesh, leftArmMesh, rightArmMesh, leftLegMesh, rightLegMesh;

function init3DAvatar() {
    const container = document.getElementById("avatar3d-canvas");
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.3, 4.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const characterGroup = new THREE.Group();

    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.1;
    characterGroup.add(headMesh);

    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x1e60ff });
    torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 0.3;
    characterGroup.add(torsoMesh);

    const armGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });

    leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.set(-0.6, 0.3, 0);
    characterGroup.add(leftArmMesh);

    rightArmMesh = new THREE.Mesh(armGeo, armMat);
    rightArmMesh.position.set(0.6, 0.3, 0);
    characterGroup.add(rightArmMesh);

    const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x00ebd4 });

    leftLegMesh = new THREE.Mesh(legGeo, legMat);
    leftLegMesh.position.set(-0.2, -0.7, 0);
    characterGroup.add(leftLegMesh);

    rightLegMesh = new THREE.Mesh(legGeo, legMat);
    rightLegMesh.position.set(0.2, -0.7, 0);
    characterGroup.add(rightLegMesh);

    scene.add(characterGroup);

    function animate() {
        requestAnimationFrame(animate);
        characterGroup.rotation.y += 0.008;
        renderer.render(scene, camera);
    }
    animate();
}

// --- Dynamic Color Moderation Rules ---
const RESTRICTED_COLORS = {
    white: ["#ffffff", "#f0f0f0", "#e6e6e6"],
    red: ["#ff0000", "#e60000", "#cc0000"],
    blue: ["#0000ff", "#0000e6", "#0000cc"]
};

function moderateCharacterColors(head, torso, leftArm, rightArm, leftLeg, rightLeg) {
    const cHead = head.toLowerCase();
    const cTorso = torso.toLowerCase();
    const cLeftArm = leftArm.toLowerCase();
    const cRightArm = rightArm.toLowerCase();
    const cLeftLeg = leftLeg.toLowerCase();
    const cRightLeg = rightLeg.toLowerCase();

    let safeTorso = cTorso;
    let moderated = false;

    for (const colorGroup in RESTRICTED_COLORS) {
        const restrictedList = RESTRICTED_COLORS[colorGroup];
        if (
            restrictedList.includes(cHead) && 
            restrictedList.includes(cTorso) && 
            restrictedList.includes(cLeftArm) &&
            restrictedList.includes(cRightArm) &&
            restrictedList.includes(cLeftLeg) &&
            restrictedList.includes(cRightLeg)
        ) {
            safeTorso = "#1e293b"; 
            moderated = true;
            break;
        }
    }

    return {
        head: cHead,
        torso: safeTorso,
        leftArm: cLeftArm,
        rightArm: cRightArm,
        leftLeg: cLeftLeg,
        rightLeg: cRightLeg,
        wasModerated: moderated
    };
}



function applyGuestAvatarLock(locked) {
    // locked = true when user is guest OR not logged in at all
    var box = document.querySelector(".avatar-customizer-container");
    var lockMsg = document.getElementById("guestAvatarLock");
    var saveBtn = document.getElementById("saveAvatarBtn");
    if (box) {
        if (locked) box.classList.add("avatar-locked");
        else box.classList.remove("avatar-locked");
    }
    if (lockMsg) lockMsg.style.display = locked ? "block" : "none";
    if (saveBtn) saveBtn.style.display = locked ? "none" : "block";
    ["colorHead","colorTorso","colorLeftArm","colorRightArm","colorLeftLeg","colorRightLeg"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.disabled = !!locked;
    });
}

function isAvatarUnlocked() {
    return localStorage.getItem("loggedIn") === "true";
}

function refreshAvatarLock() {
    // Only real accounts can customize; guests and logged-out users cannot
    applyGuestAvatarLock(!isAvatarUnlocked());
}

function updateAvatarColors() {
    if (localStorage.getItem("loggedIn") !== "true") return;
    const rawHead = document.getElementById("colorHead").value;
    const rawTorso = document.getElementById("colorTorso").value;
    const rawLeftArm = document.getElementById("colorLeftArm").value;
    const rawRightArm = document.getElementById("colorRightArm").value;
    const rawLeftLeg = document.getElementById("colorLeftLeg").value;
    const rawRightLeg = document.getElementById("colorRightLeg").value;

    const validated = moderateCharacterColors(rawHead, rawTorso, rawLeftArm, rawRightArm, rawLeftLeg, rawRightLeg);

    headMesh.material.color.set(validated.head);
    torsoMesh.material.color.set(validated.torso);
    leftArmMesh.material.color.set(validated.leftArm);
    rightArmMesh.material.color.set(validated.rightArm);
    leftLegMesh.material.color.set(validated.leftLeg);
    rightLegMesh.material.color.set(validated.rightLeg);

    const warning = document.getElementById("modWarning");
    if (validated.wasModerated) {
        warning.style.display = "block";
    } else {
        warning.style.display = "none";
    }
}

function saveAvatar() {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("You need an account to customize or save avatars.\nCreate an account or log in to unlock this!");
        openCreateAccount();
        return;
    }
    const account = JSON.parse(localStorage.getItem("azoraAccount"));
    if (!account) {
        alert("Please log in or create an account to save your custom 3D avatar!");
        return;
    }

    const validated = moderateCharacterColors(
        document.getElementById("colorHead").value,
        document.getElementById("colorTorso").value,
        document.getElementById("colorLeftArm").value,
        document.getElementById("colorRightArm").value,
        document.getElementById("colorLeftLeg").value,
        document.getElementById("colorRightLeg").value
    );

    account.avatar = {
        head: validated.head,
        torso: validated.torso,
        leftArm: validated.leftArm,
        rightArm: validated.rightArm,
        leftLeg: validated.leftLeg,
        rightLeg: validated.rightLeg,
        face: "default"
    };

    localStorage.setItem("azoraAccount", JSON.stringify(account));
    // Keep multi-account store in sync so progress survives log out / log in
    try {
        if (account.username && !account.isGuest) {
            var map = getSavedAccounts();
            map[account.username] = account;
            saveSavedAccounts(map);
        }
    } catch (e) {}
    alert("3D Avatar saved successfully to your Azora account!");
}

// ============================================================
// THEME SYSTEM — MUST stay OUTSIDE DOMContentLoaded
// ============================================================
function getCurrentHour() {
    return new Date().getHours();
}

function isNightTime() {
    const hour = getCurrentHour();
    return hour < 7 || hour >= 20; // 8 PM – 7 AM
}

function applyTheme(theme) {
    let effective = theme;
    if (theme === "auto") {
        effective = isNightTime() ? "dark" : "light";
    }
    document.documentElement.setAttribute(
        "data-theme",
        effective === "dark" ? "dark" : "light"
    );
    localStorage.setItem("azoraTheme", theme);
    // Rebuild full site palette from browser color for light/dark
    if (typeof applyBrowserColor === "function") {
        applyBrowserColor(localStorage.getItem("azoraBrowserColor") || "#1e60ff", true);
    }
}

function changeTheme(value) {
    applyTheme(value);
}

function loadTheme() {
    const saved = localStorage.getItem("azoraTheme") || "auto";
    const sel = document.getElementById("themeSelect");
    if (sel) sel.value = saved;
    applyTheme(saved);
}

window.changeTheme = changeTheme;
window.applyTheme = applyTheme;
window.loadTheme = loadTheme;

setInterval(function () {
    if ((localStorage.getItem("azoraTheme") || "auto") === "auto") {
        applyTheme("auto");
    }
}, 3600000);

// ============================================================
// BROWSER APPEARANCE (color + style)
// ============================================================
function normalizeHexColor(value) {
    if (!value) return "#1e60ff";
    var v = String(value).trim();
    if (v.charAt(0) !== "#") v = "#" + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
        v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) return null;
    return v.toLowerCase();
}

function hexToRgb(hex) {
    var h = normalizeHexColor(hex) || "#1e60ff";
    return {
        r: parseInt(h.slice(1, 3), 16),
        g: parseInt(h.slice(3, 5), 16),
        b: parseInt(h.slice(5, 7), 16)
    };
}

function rgbToHex(r, g, b) {
    function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
    function h(n) { var s = clamp(n).toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + h(r) + h(g) + h(b);
}

/** Mix base color toward white (t>0) or black (t<0). t in -1..1 */
function shadeColor(hex, t) {
    var rgb = hexToRgb(hex);
    var r = rgb.r, g = rgb.g, b = rgb.b;
    if (t >= 0) {
        r = r + (255 - r) * t;
        g = g + (255 - g) * t;
        b = b + (255 - b) * t;
    } else {
        var k = 1 + t; // t=-0.5 → 0.5
        r = r * k;
        g = g * k;
        b = b * k;
    }
    return rgbToHex(r, g, b);
}

/**
 * Paints the whole site from one base color.
 * - Main surfaces use the base
 * - Darker UI (footer, topbar edges, shadows) = darker shades
 * - Lighter UI (cards, highlights, bg end) = lighter shades
 * - Some things stay fixed (status dots, error red, success green)
 * @param hex base color
 * @param skipSave if true, don't write localStorage (used when theme flips)
 */
function applyBrowserColor(hex, skipSave) {
    var color = normalizeHexColor(hex) || "#1e60ff";
    var rgb = hexToRgb(color);
    var root = document.documentElement;
    var isDark = root.getAttribute("data-theme") === "dark";

    // Full shade ladder from the same hue
    var darker3 = shadeColor(color, -0.55); // very dark
    var darker2 = shadeColor(color, -0.40);
    var darker1 = shadeColor(color, -0.22);
    var base = color;
    var lighter1 = shadeColor(color, 0.28);
    var lighter2 = shadeColor(color, 0.50);
    var lighter3 = shadeColor(color, 0.72);

    root.style.setProperty("--browser-color", base);
    root.style.setProperty("--browser-color-rgb", rgb.r + ", " + rgb.g + ", " + rgb.b);
    root.style.setProperty("--browser-darker", darker1);
    root.style.setProperty("--browser-darkest", darker3);
    root.style.setProperty("--browser-lighter", lighter1);
    root.style.setProperty("--browser-lightest", lighter3);
    root.style.setProperty("--browser-tint", "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.20)");
    root.style.setProperty("--browser-glow", "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.45)");

    if (isDark) {
        // Whole page in dark shades of the chosen color
        root.style.setProperty("--bg-1", darker3);
        root.style.setProperty("--bg-2", darker2);
        root.style.setProperty("--bg-3", darker1);
        root.style.setProperty("--topbar", darker2);
        root.style.setProperty("--footer", darker3);
        root.style.setProperty("--accent", lighter1); // readable accents on dark
        root.style.setProperty("--card-bg", "rgba(" + hexToRgb(darker2).r + ", " + hexToRgb(darker2).g + ", " + hexToRgb(darker2).b + ", 0.85)");
        root.style.setProperty("--card-border", darker1);
        root.style.setProperty("--banner", "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.20)");
        root.style.setProperty("--popup-bg", "rgba(" + hexToRgb(darker2).r + ", " + hexToRgb(darker2).g + ", " + hexToRgb(darker2).b + ", 0.98)");
        root.style.setProperty("--text-1", "#f1f5f9");
        root.style.setProperty("--text-2", "#cbd5e1");
    } else {
        // Whole page gradient from base → lighter shades of same color
        root.style.setProperty("--bg-1", base);
        root.style.setProperty("--bg-2", lighter1);
        root.style.setProperty("--bg-3", lighter2);
        root.style.setProperty("--topbar", darker1);
        root.style.setProperty("--footer", darker2);
        root.style.setProperty("--accent", base);
        root.style.setProperty("--card-bg", "rgba(255, 255, 255, 0.22)");
        root.style.setProperty("--card-border", lighter3);
        root.style.setProperty("--banner", "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.22)");
        root.style.setProperty("--popup-bg", "rgba(255, 255, 255, 0.95)");
        root.style.setProperty("--text-1", "#ffffff");
        root.style.setProperty("--text-2", "#f0f7ff");
    }

    if (!skipSave) {
        localStorage.setItem("azoraBrowserColor", color);
    }
    var picker = document.getElementById("browserColorPicker");
    var hexInput = document.getElementById("browserColorHex");
    if (picker) picker.value = color;
    if (hexInput) hexInput.value = color;
}

function changeBrowserColor(value) {
    var color = normalizeHexColor(value);
    if (!color) {
        alert("Please use a valid color like #1e60ff");
        var saved = localStorage.getItem("azoraBrowserColor") || "#1e60ff";
        applyBrowserColor(saved);
        return;
    }
    applyBrowserColor(color);
}

function applyBrowserStyle(style) {
    var allowed = ["normal", "glossy", "metallic", "matte", "neon", "soft"];
    if (allowed.indexOf(style) === -1) style = "normal";
    document.documentElement.setAttribute("data-browser-style", style);
    localStorage.setItem("azoraBrowserStyle", style);
    var sel = document.getElementById("browserStyleSelect");
    if (sel) sel.value = style;
    var preview = document.getElementById("browserStylePreview");
    if (preview) preview.setAttribute("data-preview-style", style);
}

function changeBrowserStyle(value) {
    applyBrowserStyle(value || "normal");
}

function loadBrowserAppearance() {
    applyBrowserColor(localStorage.getItem("azoraBrowserColor") || "#1e60ff");
    applyBrowserStyle(localStorage.getItem("azoraBrowserStyle") || "normal");
}

window.changeBrowserColor = changeBrowserColor;
window.applyBrowserColor = applyBrowserColor;
window.changeBrowserStyle = changeBrowserStyle;
window.applyBrowserStyle = applyBrowserStyle;
window.loadBrowserAppearance = loadBrowserAppearance;

// ============================================================
// APP START
// ============================================================
function dismissIntroSplash(openAccount) {
    var splash = document.getElementById("introSplash");
    if (!splash) return;
    // Force full-screen background to fade (not only the text)
    splash.classList.add("fade-out");
    splash.style.transition = "opacity 0.6s ease";
    splash.style.opacity = "0";
    splash.style.pointerEvents = "none";
    setTimeout(function () {
        splash.style.display = "none";
        splash.style.visibility = "hidden";
        if (openAccount) {
            try {
                if (typeof openCreateAccount === "function") openCreateAccount();
                else {
                    var ov = document.getElementById("accountOverlay");
                    if (ov) ov.style.display = "flex";
                }
            } catch (e) {}
        }
    }, 650);
}

window.addEventListener("DOMContentLoaded", function () {
    var splash = document.getElementById("introSplash");
    var loggedIn = localStorage.getItem("loggedIn");

    // Splash must always clear — never blocked by avatar/Three.js errors
    if (loggedIn === "true" || loggedIn === "guest") {
        if (splash) {
            splash.style.display = "none";
            splash.style.pointerEvents = "none";
        }
    } else if (splash) {
        splash.style.display = "flex";
        splash.style.opacity = "1";
        // Match animation length (~6.2s), then fade out
        setTimeout(function () {
            dismissIntroSplash(true);
        }, 6500);
        // Safety net: force hide even if something went wrong
        setTimeout(function () {
            if (splash && splash.style.display !== "none") {
                splash.style.opacity = "0";
                splash.style.display = "none";
                splash.style.pointerEvents = "none";
                try { if (typeof openCreateAccount === "function") openCreateAccount(); } catch (e) {}
            }
        }, 9000);
    }

    try {
        init3DAvatar();
    } catch (e) {
        console.warn("Avatar init failed:", e);
    }

    try {
        ensureGuestButtonsVisible();
        if (typeof refreshAvatarLock === "function") refreshAvatarLock();
    } catch (e) {}

    if (loggedIn === "true" || loggedIn === "guest") {
        try {
            var account = JSON.parse(localStorage.getItem("azoraAccount"));
            if (account) {
                var gb = document.getElementById("guestButtons");
                var up = document.getElementById("userPanel");
                var pb = document.getElementById("profileButton");
                if (gb) gb.style.display = "none";
                if (up) up.style.display = "flex";
                if (pb) {
                    if (account.isGuest || !account.username) {
                        pb.innerHTML = "👤 Guest";
                    } else {
                        pb.innerHTML = "👤 " + account.username;
                    }
                }
                // Only full accounts can customize avatars
                refreshAvatarLock();


                if (account.avatar) {
                    var map = {
                        colorHead: "head", colorTorso: "torso",
                        colorLeftArm: "leftArm", colorRightArm: "rightArm",
                        colorLeftLeg: "leftLeg", colorRightLeg: "rightLeg"
                    };
                    for (var id in map) {
                        var el = document.getElementById(id);
                        if (el && account.avatar[map[id]]) {
                            el.value = account.avatar[map[id]];
                        }
                    }
                    if (typeof updateAvatarColors === "function") updateAvatarColors();
                }
            }
        } catch (e) {}
    }

    var cse = localStorage.getItem("charServiceEnabled");
    if (cse === "true") {
        var t = document.getElementById("charServiceToggle");
        if (t) t.checked = true;
    }

    loadTheme();
    if (typeof loadBrowserAppearance === "function") loadBrowserAppearance();
    if (typeof loadServerFlags === "function") loadServerFlags();
});


// ============================================================
// AzaFn-1.0 — AI Game Generator + Social Feed
// ============================================================
let azaFnConversation = [];
let azaFnPendingDescription = "";
let azaFnGames = [];

function openAzaFn() {
    if (localStorage.getItem("loggedIn") === "guest") {
        alert("Guests can't use AzaFn. Create a free account to build games!");
        openCreateAccount();
        return;
    }
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Please log in to use AzaFn-1.0!");
        openCreateAccount();
        return;
    }
    document.getElementById("azafnOverlay").style.display = "flex";
    loadAzaFnGames();
    if (azaFnConversation.length === 0) {
        addAzaFnAIMessage(
            "Hi! I'm <strong>AzaFn-1.0</strong> 🤖 — Azora's game-building AI.<br><br>" +
            "Tell me what kind of game you want to create. Be as detailed as you like!<br><br>" +
            "⚠️ <strong>Important:</strong> You must clearly say whether you want a <strong>2D</strong> or <strong>3D</strong> game. " +
            "I cannot assume the dimensions — if you don't specify, I'll ask."
        );
    }
    renderAzaFnMessages();
    switchAzaFnTab("chat");
}

function closeAzaFn() {
    document.getElementById("azafnOverlay").style.display = "none";
}

function switchAzaFnTab(tab) {
    var chat = document.getElementById("azafnChatPanel");
    var feed = document.getElementById("azafnFeedPanel");
    var tChat = document.getElementById("azafnTabChat");
    var tFeed = document.getElementById("azafnTabFeed");
    if (tab === "chat") {
        chat.classList.remove("hidden");
        feed.classList.remove("active");
        tChat.classList.add("active");
        tFeed.classList.remove("active");
    } else {
        chat.classList.add("hidden");
        feed.classList.add("active");
        tChat.classList.remove("active");
        tFeed.classList.add("active");
        renderAzaFnFeed();
    }
}

function detectDimensions(text) {
    var t = text.toLowerCase();
    var has3d = /\b3[\s-]?d\b|\bthree[\s-]?dimensional\b|\bin 3d\b/.test(t);
    var has2d = /\b2[\s-]?d\b|\btwo[\s-]?dimensional\b|\bin 2d\b/.test(t);
    if (has3d && !has2d) return "3D";
    if (has2d && !has3d) return "2D";
    if (has3d && has2d) return "ambiguous";
    return null;
}

function addAzaFnAIMessage(html) { azaFnConversation.push({ role: "ai", text: html }); }
function addAzaFnUserMessage(text) { azaFnConversation.push({ role: "user", text: text }); }

function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderAzaFnMessages() {
    var box = document.getElementById("azafnMessages");
    if (!box) return;
    box.innerHTML = "";
    azaFnConversation.forEach(function (msg, idx) {
        var div = document.createElement("div");
        div.className = "azafn-msg " + (msg.role === "user" ? "user" : "ai");
        if (msg.role === "ai") {
            div.innerHTML =
                '<div class="azafn-msg-label">AzaFn-1.0</div><div>' + msg.text + '</div>' +
                '<button class="azafn-build-btn" onclick="azaFnBuild(' + idx + ')">' +
                '<img src="logo.jpg" alt="Build"> Build</button>';
        } else {
            div.innerHTML = '<div class="azafn-msg-label">You</div><div>' + escapeHtml(msg.text) + '</div>';
        }
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function showAzaFnTyping() {
    var box = document.getElementById("azafnMessages");
    if (!box) return;
    var existing = document.getElementById("azafnTyping");
    if (existing) existing.remove();
    var div = document.createElement("div");
    div.className = "azafn-typing";
    div.id = "azafnTyping";
    div.innerHTML = '<div class="azafn-msg-label">AzaFn-1.0</div><span>•</span><span>•</span><span>•</span> thinking…';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function hideAzaFnTyping() {
    var el = document.getElementById("azafnTyping");
    if (el) el.remove();
}

function sendAzaFnMessage() {
    var input = document.getElementById("azafnInput");
    var text = (input.value || "").trim();
    if (!text) return;
    if (input.disabled) return;
    input.value = "";
    addAzaFnUserMessage(text);
    azaFnPendingDescription = text;
    renderAzaFnMessages();
    showAzaFnTyping();

    // Disable input while AI "thinks"
    input.disabled = true;
    var sendBtn = input.parentElement ? input.parentElement.querySelector("button") : null;
    if (sendBtn) sendBtn.disabled = true;

    var delay = 2200 + Math.floor(Math.random() * 1800); // ~2.2–4s
    setTimeout(function () {
        hideAzaFnTyping();
        var dims = detectDimensions(text);
        if (!dims) {
            addAzaFnAIMessage(
                "I heard your idea! 🎮<br><br>Before I can help you build it, I need to know the <strong>dimensions</strong>.<br><br>" +
                "Do you want this game to be <strong>2D</strong> (side-view, top-down, etc.) or <strong>3D</strong> (full 3D world with depth)?<br><br>" +
                "Please reply with <strong>2D</strong> or <strong>3D</strong> — I cannot assume."
            );
        } else if (dims === "ambiguous") {
            addAzaFnAIMessage("You mentioned both 2D and 3D. Please pick <strong>one</strong> clearly.");
        } else {
            addAzaFnAIMessage(
                "Great! Here's what I understood:<br><br>📐 <strong>Dimensions:</strong> " + dims +
                "<br>📝 <strong>Your idea:</strong> " + escapeHtml(text) +
                "<br><br>When you're ready, press the blue <strong>Build</strong> button below. " +
                "That opens a <strong>private preview</strong> — only you can see it until you publish it to the Feed."
            );
        }
        renderAzaFnMessages();
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }, delay);
}

var currentPreviewGameId = null;

function azaFnBuild(msgIndex) {
    if (window._azaFnBuilding) {
        addAzaFnAIMessage("I'm still constructing your game — about a minute total. Hang tight!");
        renderAzaFnMessages();
        return;
    }

    var description = azaFnPendingDescription;
    for (var i = msgIndex - 1; i >= 0; i--) {
        if (azaFnConversation[i].role === "user") { description = azaFnConversation[i].text; break; }
    }
    if (!description || description.trim().length < 3) {
        addAzaFnAIMessage("Please describe your game idea first, then press Build!");
        renderAzaFnMessages(); return;
    }
    var finalDims = detectDimensions(description);
    if (!finalDims || finalDims === "ambiguous") {
        for (var j = azaFnConversation.length - 1; j >= 0; j--) {
            if (azaFnConversation[j].role === "user") {
                var d = detectDimensions(azaFnConversation[j].text);
                if (d === "2D" || d === "3D") { finalDims = d; break; }
            }
        }
    }
    if (!finalDims || finalDims === "ambiguous") {
        addAzaFnAIMessage("I still don't know if this should be <strong>2D</strong> or <strong>3D</strong>. Please tell me clearly, then press Build again.");
        renderAzaFnMessages(); return;
    }

    var account = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
    if (account.isGuest || localStorage.getItem("loggedIn") !== "true") {
        addAzaFnAIMessage("Only full accounts can build games. Create an account first!");
        renderAzaFnMessages();
        return;
    }
    var username = account.username || "Player";

    window._azaFnBuilding = true;
    showAzaFnTyping();
    // Upgrade typing label to "constructing"
    var typing = document.getElementById("azafnTyping");
    if (typing) {
        typing.innerHTML = '<div class="azafn-msg-label">AzaFn-1.0</div>🛠️ Constructing your ' + finalDims + ' game… (~1 min)';
    }

    var progressSteps = [
        { at: 15000, msg: "Sketching the " + finalDims + " world layout…" },
        { at: 30000, msg: "Placing core systems and player controls…" },
        { at: 45000, msg: "Polishing visuals and play-testing…" }
    ];
    progressSteps.forEach(function (step) {
        setTimeout(function () {
            if (!window._azaFnBuilding) return;
            hideAzaFnTyping();
            addAzaFnAIMessage(step.msg);
            renderAzaFnMessages();
            showAzaFnTyping();
            var t = document.getElementById("azafnTyping");
            if (t) t.innerHTML = '<div class="azafn-msg-label">AzaFn-1.0</div>🛠️ Still constructing…';
        }, step.at);
    });

    // Full build completes after 60 seconds
    setTimeout(function () {
        hideAzaFnTyping();
        window._azaFnBuilding = false;

        var words = description.trim().split(/\s+/).slice(0, 5).join(" ");
        var title = (words.length > 40 ? words.slice(0, 40) + "…" : words) + " (" + finalDims + ")";

        var game = {
            id: "game_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            title: title,
            description: description,
            dimensions: finalDims,
            creator: username,
            createdAt: Date.now(),
            likes: 0,
            likedBy: [],
            savedBy: [],
            comments: [],
            published: false,
            deleted: false
        };
        loadAzaFnGames();
        azaFnGames.unshift(game);
        saveAzaFnGames();

        addAzaFnAIMessage(
            "Ok I have created the game for you! Check it out — explore this <strong>" + finalDims +
            "</strong> game!<br><br>🎮 <strong>" + escapeHtml(game.title) +
            "</strong><br><br>Opening your <strong>private preview</strong> now. Only you can see it under your profile until you press <strong>Publish to Feed</strong>. " +
            "Other people cannot edit your game."
        );
        renderAzaFnMessages();
        openGamePreview(game.id);
    }, 60000);
}


function openGamePreview(gameId) {
    loadAzaFnGames();
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    currentPreviewGameId = gameId;

    document.getElementById("gamePreviewTitle").textContent = game.title;
    document.getElementById("gamePreviewDims").textContent = game.dimensions;
    document.getElementById("gamePreviewDesc").textContent = game.description;

    var badge = document.getElementById("gamePreviewBadge");
    var pubBtn = document.getElementById("publishGameBtn");
    if (game.published) {
        badge.textContent = "PUBLIC · Live on Feed";
        badge.className = "game-preview-badge public";
        if (pubBtn) pubBtn.style.display = "none";
    } else {
        badge.textContent = "PRIVATE · Not on Feed";
        badge.className = "game-preview-badge";
        if (pubBtn) pubBtn.style.display = "inline-block";
    }

    var mock = document.getElementById("previewMock");
    if (mock) {
        mock.className = "preview-mock " + (game.dimensions === "3D" ? "dim-3d" : "dim-2d");
        mock.innerHTML = "";
        if (game.dimensions === "3D") {
            var cube = document.createElement("div");
            cube.className = "preview-cube";
            mock.appendChild(cube);
        } else {
            var plat = document.createElement("div");
            plat.className = "preview-platform";
            var player = document.createElement("div");
            player.className = "preview-player";
            mock.appendChild(plat);
            mock.appendChild(player);
        }
    }

    // Creator-only delete on preview
    var actions = document.querySelector(".game-preview-actions");
    if (actions) {
        var oldDel = document.getElementById("previewDeleteBtn");
        if (oldDel) oldDel.remove();
        var me = "";
        try { me = JSON.parse(localStorage.getItem("azoraAccount") || "{}").username || ""; } catch (e) {}
        if (me && game.creator === me && !game.deleted) {
            var delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.id = "previewDeleteBtn";
            delBtn.textContent = "🗑️ Delete Game";
            delBtn.style.background = "linear-gradient(180deg,#f87171,#ef4444)";
            delBtn.style.color = "#fff";
            delBtn.onclick = function () { azaFnDeleteGame(gameId); };
            actions.appendChild(delBtn);
        }
    }

    document.getElementById("gamePreviewOverlay").style.display = "flex";
}

function closeGamePreview() {
    document.getElementById("gamePreviewOverlay").style.display = "none";
    currentPreviewGameId = null;
}

function publishCurrentPreview() {
    if (!currentPreviewGameId) return;
    loadAzaFnGames();
    var game = azaFnGames.find(function (g) { return g.id === currentPreviewGameId; });
    if (!game) return;
    game.published = true;
    game.createdAt = Date.now(); // bump to top of algorithm
    // Move to front of list
    azaFnGames = azaFnGames.filter(function (g) { return g.id !== game.id; });
    azaFnGames.unshift(game);
    saveAzaFnGames();

    var badge = document.getElementById("gamePreviewBadge");
    if (badge) {
        badge.textContent = "PUBLIC · Live on Feed";
        badge.className = "game-preview-badge public";
    }
    var pubBtn = document.getElementById("publishGameBtn");
    if (pubBtn) pubBtn.style.display = "none";

    alert("🚀 Published! Your game is now on the public Feed and on your profile.");
}

window.openGamePreview = openGamePreview;
window.closeGamePreview = closeGamePreview;
window.publishCurrentPreview = publishCurrentPreview;


function loadAzaFnGames() {
    try { azaFnGames = JSON.parse(localStorage.getItem("azoraAzaFnGames") || "[]"); }
    catch (e) { azaFnGames = []; }
    // Older games without published flag count as already public
    azaFnGames.forEach(function (g) {
        if (typeof g.published === "undefined") g.published = true;
    });
}
function saveAzaFnGames() { localStorage.setItem("azoraAzaFnGames", JSON.stringify(azaFnGames)); }

function isGameRemovedFromFeed(game) {
    if (!game) return true;
    if (!game.deleted && !game.deletedAt) return false;
    var removeAt = game.feedRemoveAt || ((game.deletedAt || 0) + 90000);
    return Date.now() >= removeAt;
}

function canViewerSeeGameOnFeed(game, viewerUsername) {
    if (!game || !game.published) return false;
    // Not deleted → always ok
    if (!game.deleted && !game.deletedAt) return true;
    // Deleted: creator loses it instantly
    if (viewerUsername && game.creator === viewerUsername) return false;
    // Everyone else: algorithm still recommends until feedRemoveAt (1–2 min)
    return !isGameRemovedFromFeed(game);
}


function purgeDeletedGames() {
    loadAzaFnGames();
    var before = azaFnGames.length;
    // Hard-delete only after feed delay has fully passed (+ small buffer)
    azaFnGames = azaFnGames.filter(function (g) {
        if (!g.deleted && !g.deletedAt) return true;
        var removeAt = g.feedRemoveAt || ((g.deletedAt || 0) + 90000);
        return Date.now() < removeAt + 30000; // keep record briefly then wipe
    });
    if (azaFnGames.length !== before) saveAzaFnGames();
}

function azaFnDeleteGame(gameId) {
    loadAzaFnGames();
    var account = {};
    try { account = JSON.parse(localStorage.getItem("azoraAccount") || "{}"); } catch (e) {}
    var myName = account.username || "";
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) {
        alert("Game not found.");
        return;
    }
    if (!myName || game.creator !== myName) {
        alert("Only the creator can delete this game.");
        return;
    }
    if (!confirm("Delete \"" + game.title + "\" permanently?\n\n• Removed for YOU instantly\n• Other players: algorithm stops recommending it in about 1–2 minutes")) {
        return;
    }

    // Soft-delete: gone for creator immediately; Feed phases it out in 60–120s
    var delayMs = 60000 + Math.floor(Math.random() * 60000); // 1–2 minutes
    game.deleted = true;
    game.deletedAt = Date.now();
    game.feedRemoveAt = Date.now() + delayMs;
    // Stay on Feed briefly so the algorithm "catches up" over 1–2 minutes
    saveAzaFnGames();

    if (currentPreviewGameId === gameId) {
        try { closeGamePreview(); } catch (e) {}
    }

    alert("Deleted for you instantly.\n\nYour game is gone from your profile and your Feed right now.\n\nOther players may still see it for about " + Math.round(delayMs / 1000) + " seconds while the algorithm catches up — then it stops being recommended.");

    if (typeof renderAzaFnFeed === "function") renderAzaFnFeed();
    if (typeof renderPublicFeed === "function") renderPublicFeed();
    // Refresh open profile if any
    try {
        if (document.getElementById("profileOverlay") && document.getElementById("profileOverlay").style.display === "flex") {
            openUserProfile(myName);
        }
    } catch (e) {}
}

// Periodically drop deleted games from Feed after their delay
setInterval(function () {
    try {
        purgeDeletedGames();
        var feed = document.getElementById("publicFeedOverlay");
        if (feed && feed.style.display === "flex" && typeof renderPublicFeed === "function") renderPublicFeed();
        var aza = document.getElementById("azafnOverlay");
        if (aza && aza.style.display === "flex" && typeof renderAzaFnFeed === "function") renderAzaFnFeed();
    } catch (e) {}
}, 15000);


function renderAzaFnFeed() {
    var panel = document.getElementById("azafnFeedPanel");
    if (!panel) return;
    loadAzaFnGames();
    if (azaFnGames.length === 0) {
        panel.innerHTML = '<div class="empty-feed">No games yet! Please come back later!</div>';
        return;
    }
    var account = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
    var myName = account.username || "";
    panel.innerHTML = "";
    azaFnGames.filter(function (g) {
        // Same rule: creator loses deleted games instantly; others after algorithm delay
        if (g.deleted || g.deletedAt) {
            if (myName && g.creator === myName) return false;
            if (isGameRemovedFromFeed(g)) return false;
            return g.published === true;
        }
        return true;
    }).forEach(function (game) {
        var isOwner = game.creator === myName;
        var liked = (game.likedBy || []).indexOf(myName) !== -1;
        var saved = (game.savedBy || []).indexOf(myName) !== -1;
        var initial = (game.creator || "?")[0].toUpperCase();
        var timeStr = new Date(game.createdAt).toLocaleString();
        var commentsHtml = "";
        (game.comments || []).forEach(function (c) {
            commentsHtml += '<div class="game-comment"><strong>' + escapeHtml(c.user) + ':</strong> ' + escapeHtml(c.text) + '</div>';
        });
        var card = document.createElement("div");
        card.className = "game-card";
        card.innerHTML =
            '<div class="game-card-header"><div class="game-card-avatar">' + initial + '</div>' +
            '<div class="game-card-meta"><strong>' + escapeHtml(game.creator) + '</strong><span>' + timeStr + '</span></div></div>' +
            '<div class="game-card-title">' + escapeHtml(game.title) + '</div>' +
            '<div class="game-card-dims">' + escapeHtml(game.dimensions) + '</div>' +
            '<div class="game-card-desc">' + escapeHtml(game.description) + '</div>' +
            '<div class="game-card-actions">' +
            '<button class="game-action-btn' + (liked?' liked':'') + '" onclick="azaFnLike(\'' + game.id + '\')">' + (liked?'❤️ ':'🤍 ') + (game.likes||0) + '</button>' +
            '<button class="game-action-btn" onclick="azaFnToggleComments(\'' + game.id + '\')">💬 Comments (' + (game.comments||[]).length + ')</button>' +
            '<button class="game-action-btn' + (saved?' saved':'') + '" onclick="azaFnSave(\'' + game.id + '\')">' + (saved?'🔖 Saved':'📑 Save') + '</button>' +
            '<button class="game-action-btn" onclick="azaFnShare(\'' + game.id + '\')">📤 Share</button>' +
            (isOwner ? '<button class="game-action-btn" onclick="azaFnToggleEdit(\'' + game.id + '\')">✏️ Edit</button>' : '') +
            '</div>' +
            '<div class="game-comments" id="comments_' + game.id + '">' + commentsHtml +
            '<div class="comment-input-row"><input type="text" id="commentInput_' + game.id + '" placeholder="Write a comment...">' +
            '<button onclick="azaFnAddComment(\'' + game.id + '\')">Post</button></div></div>' +
            (isOwner ? '<div class="game-edit-area" id="edit_' + game.id + '"><textarea id="editDesc_' + game.id + '">' + escapeHtml(game.description) +
            '</textarea><button onclick="azaFnRepublish(\'' + game.id + '\')" style="margin-top:8px;background:#1e60ff;color:#fff;">🚀 Publish Changes</button></div>' : '');
        panel.appendChild(card);
    });
}

function azaFnLike(gameId) {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Guests can't like games. Create an account to heart games!");
        openCreateAccount();
        return;
    }
    var myName = (JSON.parse(localStorage.getItem("azoraAccount") || "{}")).username || "";
    if (!myName) return;
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    game.likedBy = game.likedBy || [];
    var idx = game.likedBy.indexOf(myName);
    if (idx === -1) { game.likedBy.push(myName); game.likes = (game.likes || 0) + 1; }
    else { game.likedBy.splice(idx, 1); game.likes = Math.max(0, (game.likes || 0) - 1); }
    saveAzaFnGames(); renderAzaFnFeed();
}

function azaFnSave(gameId) {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Guests can't save games. Create an account to save games!");
        openCreateAccount();
        return;
    }
    var myName = (JSON.parse(localStorage.getItem("azoraAccount") || "{}")).username || "";
    if (!myName) return;
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    game.savedBy = game.savedBy || [];
    var idx = game.savedBy.indexOf(myName);
    if (idx === -1) game.savedBy.push(myName); else game.savedBy.splice(idx, 1);
    saveAzaFnGames(); renderAzaFnFeed();
}

function azaFnShare(gameId) {
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    var text = 'Check out "' + game.title + '" by ' + game.creator + ' on Azora! 🎮';
    if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(text).then(function () { alert("Copied!\n\n" + text); });
    else alert(text);
}

function azaFnToggleComments(gameId) {
    var el = document.getElementById("comments_" + gameId);
    if (el) el.classList.toggle("open");
}

function azaFnAddComment(gameId) {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Guests can't comment. Create an account to join the conversation!");
        openCreateAccount();
        return;
    }
    var input = document.getElementById("commentInput_" + gameId);
    var text = (input && input.value || "").trim();
    if (!text) return;
    var myName = (JSON.parse(localStorage.getItem("azoraAccount") || "{}")).username || "";
    if (!myName) return;
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    game.comments = game.comments || [];
    game.comments.push({ user: myName, text: text, at: Date.now() });
    saveAzaFnGames(); renderAzaFnFeed();
    var el = document.getElementById("comments_" + gameId);
    if (el) el.classList.add("open");
}

function azaFnToggleEdit(gameId) {
    var el = document.getElementById("edit_" + gameId);
    if (el) el.classList.toggle("open");
}

function azaFnRepublish(gameId) {
    var textarea = document.getElementById("editDesc_" + gameId);
    var newDesc = (textarea && textarea.value || "").trim();
    if (!newDesc) { alert("Description cannot be empty!"); return; }
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) return;
    var dims = detectDimensions(newDesc);
    if (!dims || dims === "ambiguous") dims = game.dimensions;
    game.description = newDesc;
    game.dimensions = dims;
    var words = newDesc.trim().split(/\s+/).slice(0, 5).join(" ");
    game.title = (words.length > 40 ? words.slice(0, 40) + "…" : words) + " (" + dims + ")";
    game.createdAt = Date.now();
    game.published = true;
    azaFnGames = azaFnGames.filter(function (g) { return g.id !== gameId; });
    azaFnGames.unshift(game);
    saveAzaFnGames();
    alert("🚀 Changes published! Your game is back at the top of the Feed.");
    renderAzaFnFeed();
    if (typeof renderPublicFeed === "function") renderPublicFeed();
}

window.renderProfileGames = renderProfileGames;
window.openAzaFn = openAzaFn;
window.closeAzaFn = closeAzaFn;
window.switchAzaFnTab = switchAzaFnTab;
window.sendAzaFnMessage = sendAzaFnMessage;
window.azaFnBuild = azaFnBuild;
window.azaFnLike = azaFnLike;
window.azaFnSave = azaFnSave;
window.azaFnShare = azaFnShare;
window.azaFnToggleComments = azaFnToggleComments;
window.azaFnAddComment = azaFnAddComment;
window.azaFnToggleEdit = azaFnToggleEdit;
window.azaFnRepublish = azaFnRepublish;
window.azaFnDeleteGame = azaFnDeleteGame;


// --- Public Game Feed (topbar button for everyone) ---
function openPublicFeed() {
    document.getElementById("publicFeedOverlay").style.display = "flex";
    renderPublicFeed();
}

function closePublicFeed() {
    document.getElementById("publicFeedOverlay").style.display = "none";
}

function renderPublicFeed() {
    var panel = document.getElementById("publicFeedPanel");
    if (!panel) return;
    loadAzaFnGames();

    // Only published games appear on the public Feed
    var account = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
    var myName = account.username || "";
    var loggedIn = localStorage.getItem("loggedIn") === "true";
    var isGuest = localStorage.getItem("loggedIn") === "guest";

    // Instant for the creator; algorithm needs 1–2 min to stop recommending to others
    var publicGames = azaFnGames.filter(function (g) {
        return canViewerSeeGameOnFeed(g, myName);
    });
    if (publicGames.length === 0) {
        panel.innerHTML = '<div class="empty-feed">No games yet! Please come back later!</div>';
        return;
    }

    panel.innerHTML = "";
    publicGames.forEach(function (game) {
        var isOwner = loggedIn && game.creator === myName;
        var liked = loggedIn && (game.likedBy || []).indexOf(myName) !== -1;
        var saved = loggedIn && (game.savedBy || []).indexOf(myName) !== -1;
        var initial = (game.creator || "?")[0].toUpperCase();
        var timeStr = new Date(game.createdAt).toLocaleString();
        var commentsHtml = "";
        (game.comments || []).forEach(function (c) {
            commentsHtml += '<div class="game-comment"><strong>' + escapeHtml(c.user) + ':</strong> ' + escapeHtml(c.text) + '</div>';
        });

        // Guests can view & play, but cannot heart / save / comment
        var likeBtn = loggedIn
            ? ('<button class="game-action-btn' + (liked ? ' liked' : '') + '" onclick="azaFnLike(\'' + game.id + '\'); renderPublicFeed();">' + (liked ? '❤️ ' : '🤍 ') + (game.likes || 0) + '</button>')
            : ('<button class="game-action-btn" onclick="alert(\'Guests can play games, but cannot like, save, or comment. Create an account to join in!\');" style="opacity:0.7;">🤍 ' + (game.likes || 0) + '</button>');
        var saveBtn = loggedIn
            ? ('<button class="game-action-btn' + (saved ? ' saved' : '') + '" onclick="azaFnSave(\'' + game.id + '\'); renderPublicFeed();">' + (saved ? '🔖 Saved' : '📑 Save') + '</button>')
            : '';
        var commentFooter = loggedIn
            ? ('<div class="comment-input-row"><input type="text" id="commentInput_' + game.id + '" placeholder="Write a comment..."><button onclick="azaFnAddComment(\'' + game.id + '\'); renderPublicFeed();">Post</button></div>')
            : (isGuest
                ? '<p style="color:rgba(255,255,255,0.75);font-size:13px;">Guests can play games, but cannot comment, like, or save.</p>'
                : '<p style="color:rgba(255,255,255,0.7);font-size:13px;">Log in to comment.</p>');

        var card = document.createElement("div");
        card.className = "game-card";
        card.innerHTML =
            '<div class="game-card-header">' +
                '<div class="game-card-avatar">' + initial + '</div>' +
                '<div class="game-card-meta"><strong>' + escapeHtml(game.creator || "Player") + '</strong><span>' + timeStr + '</span></div>' +
            '</div>' +
            '<div class="game-card-title">' + escapeHtml(game.title) + '</div>' +
            '<div class="game-card-dims">' + escapeHtml(game.dimensions) + '</div>' +
            '<div class="game-card-desc">' + escapeHtml(game.description) + '</div>' +
            '<div class="game-card-actions">' +
                likeBtn +
                '<button class="game-action-btn" onclick="azaFnToggleComments(\'' + game.id + '\')">💬 Comments (' + (game.comments || []).length + ')</button>' +
                saveBtn +
                '<button class="game-action-btn" onclick="azaFnShare(\'' + game.id + '\')">📤 Share</button>' +
                (isOwner ? '<button class="game-action-btn" onclick="azaFnToggleEdit(\'' + game.id + '\')">✏️ Edit</button>' : '') +
                (isOwner ? '<button class="game-action-btn game-delete-btn" onclick="azaFnDeleteGame(\'' + game.id + '\')">🗑️ Delete</button>' : '') +
            '</div>' +
            '<div class="game-comments" id="comments_' + game.id + '">' + commentsHtml + commentFooter + '</div>' +
            (isOwner
                ? '<div class="game-edit-area" id="edit_' + game.id + '">' +
                    '<textarea id="editDesc_' + game.id + '">' + escapeHtml(game.description) + '</textarea>' +
                    '<button onclick="azaFnRepublish(\'' + game.id + '\'); renderPublicFeed();" style="margin-top:8px;background:#1e60ff;color:#fff;">🚀 Publish Changes</button>' +
                  '</div>'
                : '');
        panel.appendChild(card);
    });
}

window.openPublicFeed = openPublicFeed;
window.closePublicFeed = closePublicFeed;
window.renderPublicFeed = renderPublicFeed;


// ============================================================
// Profiles, Follow, Friends & Chat
// ============================================================

let currentChatFriend = null;

function getMyUsername() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (acc.isGuest) return ""; // guests have no username
        return acc.username || "";
    } catch (e) { return ""; }
}

function getDisplayName() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (acc.isGuest) return "Guest";
        return acc.username || "Guest";
    } catch (e) { return "Guest"; }
}

function isGuestSession() {
    return localStorage.getItem("loggedIn") === "guest";
}

function isLoggedInAny() {
    var v = localStorage.getItem("loggedIn");
    return v === "true" || v === "guest";
}

function getSocialData() {
    try {
        return JSON.parse(localStorage.getItem("azoraSocial") || "{}");
    } catch (e) { return {}; }
}

function saveSocialData(data) {
    localStorage.setItem("azoraSocial", JSON.stringify(data));
}

function ensureUserSocial(data, username) {
    if (!data[username]) {
        data[username] = { followers: [], following: [], friends: [], friendRequests: [] };
    }
    return data[username];
}

function openMyProfile() {
    if (isGuestSession()) {
        openGuestProfile();
        return;
    }
    var me = getMyUsername();
    if (!me) {
        alert("Please log in first!");
        openCreateAccount();
        return;
    }
    openUserProfile(me);
}

function openGuestProfile() {
    // Guests have no username — User ID is shown at username size
    document.getElementById("profileUsername").textContent = "";
    document.getElementById("profileUsername").style.display = "none";

    var acc = {};
    try { acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}"); } catch (e) {}
    var uid = acc.userId || getPublicUserId("", acc) || "Aza: ?";
    setProfileUserIdDisplay(uid, true);

    var statusEl = document.getElementById("profileStatus");
    if (statusEl) statusEl.innerHTML = '<span class="status-dot online"></span> Online';
    var bioEl = document.getElementById("profileBio");
    if (bioEl) {
        bioEl.textContent = "Exploring Azora as a guest — no username.";
        bioEl.style.display = "block";
    }
    var bioEdit = document.getElementById("profileBioEdit");
    if (bioEdit) bioEdit.style.display = "none";
    document.getElementById("profileStats").textContent = "Guest · Public ID only";
    var actions = document.getElementById("profileActions");
    actions.innerHTML =
        '<p style="color:#666;font-size:14px;">Guests don\'t have usernames, followers, or friends. Their public User ID is shown above.</p>' +
        '<button onclick="closeProfile(); openCreateAccount();" style="background:linear-gradient(180deg,#3b82f6,#1e60ff);color:#fff;">Create a real account</button>';
    document.getElementById("profileOverlay").style.display = "flex";
}



function renderProfileGames(username, isOwn) {
    var section = document.getElementById("profileGames");
    if (!section) return;
    loadAzaFnGames();
    var games = azaFnGames.filter(function (g) {
        if (g.creator !== username) return false;
        if (g.deleted || g.deletedAt) return false; // gone from profile immediately
        // Owner sees private + public; others only published
        if (isOwn) return true;
        return g.published === true;
    });
    if (games.length === 0) {
        section.style.display = "none";
        section.innerHTML = "";
        return;
    }
    section.style.display = "block";
    var html = "<h3>Games</h3>";
    games.forEach(function (g) {
        var badge = g.published
            ? '<span class="pg-badge live">Live</span>'
            : '<span class="pg-badge private">Private</span>';
        html += '<div class="profile-game-row">' +
            '<div onclick="openGamePreview(\'' + g.id + '\')">' +
            '<strong>' + escapeHtml(g.title) + badge + '</strong>' +
            '<span>' + escapeHtml(g.dimensions) + (g.published ? '' : ' · only you can see this') + '</span>' +
            '</div>' +
            (isOwn ? '<button type="button" class="profile-game-delete" onclick="azaFnDeleteGame(\'' + g.id + '\')">🗑️ Delete</button>' : '') +
            '</div>';
    });
    section.innerHTML = html;
}

function openUserProfile(username) {
    if (!username) return;
    var data = getSocialData();
    var u = ensureUserSocial(data, username);
    saveSocialData(data);

    document.getElementById("profileUsername").textContent = username;
    document.getElementById("profileUsername").style.display = "block";

    // Public User ID (smaller, below username for normal accounts)
    var pubId = getPublicUserId(username);
    setProfileUserIdDisplay(pubId, false);

    // Status (below username)
    var st = getUserStatus(username);
    var statusEl = document.getElementById("profileStatus");
    if (statusEl) {
        statusEl.innerHTML = '<span class="status-dot ' + st + '"></span> ' + statusLabel(st);
    }

    // Bio (below status)
    var profiles = getProfileData();
    var bio = (profiles[username] && profiles[username].bio) ? profiles[username].bio : "";
    var bioEl = document.getElementById("profileBio");
    if (bioEl) {
        bioEl.textContent = bio || "";
        bioEl.style.display = bio ? "block" : "none";
    }

    document.getElementById("profileStats").textContent =
        (u.followers.length) + " Followers · " +
        (u.following.length) + " Following · " +
        (u.friends.length) + " Friends";

    var actions = document.getElementById("profileActions");
    actions.innerHTML = "";
    var me = getMyUsername();
    var loggedIn = localStorage.getItem("loggedIn") === "true";
    var bioEdit = document.getElementById("profileBioEdit");

    if (bioEdit) {
        if (loggedIn && me === username) {
            bioEdit.style.display = "block";
            var bioInput = document.getElementById("bioInput");
            bioInput.value = bio;
            updateBioCount();
        } else {
            bioEdit.style.display = "none";
        }
    }

    if (!loggedIn) {
        actions.innerHTML = '<p style="color:#666;">Log in to follow or add friends.</p>';
    } else if (me === username) {
        actions.innerHTML = '<p style="color:#1e60ff;font-weight:bold;">This is your profile</p>';
    } else {
        var myData = ensureUserSocial(data, me);
        var isFollowing = myData.following.indexOf(username) !== -1;
        var isFriend = myData.friends.indexOf(username) !== -1;
        var pendingOut = (myData.friendRequests || []).indexOf(username) !== -1;
        var pendingIn = (u.friendRequests || []).indexOf(me) !== -1;

        // Follow button
        var followBtn = document.createElement("button");
        followBtn.textContent = isFollowing ? "Unfollow " + username : "Follow " + username;
        followBtn.style.background = isFollowing ? "#e6e6e6" : "linear-gradient(180deg,#3b82f6,#1e60ff)";
        followBtn.style.color = isFollowing ? "#1e60ff" : "#fff";
        followBtn.onclick = function () { toggleFollow(username); };
        actions.appendChild(followBtn);

        // Add Friend button (right next to Follow conceptually — stacked below)
        var friendBtn = document.createElement("button");
        if (isFriend) {
            friendBtn.textContent = "✓ Friends";
            friendBtn.disabled = true;
            friendBtn.style.opacity = "0.8";
        } else if (pendingOut) {
            friendBtn.textContent = "Request Sent";
            friendBtn.disabled = true;
            friendBtn.style.opacity = "0.8";
        } else if (pendingIn) {
            friendBtn.textContent = "Accept Friend Request";
            friendBtn.style.background = "linear-gradient(180deg,#34d399,#10b981)";
            friendBtn.style.color = "#fff";
            friendBtn.onclick = function () { acceptFriend(username); };
        } else {
            friendBtn.textContent = "Add Friend";
            friendBtn.style.background = "linear-gradient(180deg,#a78bfa,#7c3aed)";
            friendBtn.style.color = "#fff";
            friendBtn.onclick = function () { sendFriendRequest(username); };
        }
        actions.appendChild(friendBtn);

        // Message if friends
        if (isFriend) {
            var msgBtn = document.createElement("button");
            msgBtn.textContent = "💬 Message";
            msgBtn.style.background = "linear-gradient(180deg,#3b82f6,#1e60ff)";
            msgBtn.style.color = "#fff";
            msgBtn.onclick = function () {
                closeProfile();
                openChatPanel();
                selectChatFriend(username);
            };
            actions.appendChild(msgBtn);
        }
    }

    var meName = getMyUsername();
    renderProfileGames(username, meName === username);
    document.getElementById("profileOverlay").style.display = "flex";
}

function closeProfile() {
    document.getElementById("profileOverlay").style.display = "none";
}

function toggleFollow(username) {
    var me = getMyUsername();
    if (!me) return;
    var data = getSocialData();
    var myData = ensureUserSocial(data, me);
    var theirData = ensureUserSocial(data, username);

    var idx = myData.following.indexOf(username);
    if (idx === -1) {
        myData.following.push(username);
        if (theirData.followers.indexOf(me) === -1) theirData.followers.push(me);
    } else {
        myData.following.splice(idx, 1);
        var fIdx = theirData.followers.indexOf(me);
        if (fIdx !== -1) theirData.followers.splice(fIdx, 1);
    }
    saveSocialData(data);
    // Notify the followed user
    if (myData.following.indexOf(username) !== -1) {
        pushNotification(username, me + " followed you.", "follow");
    }
    openUserProfile(username);
}

function sendFriendRequest(username) {
    var me = getMyUsername();
    if (!me) return;
    var data = getSocialData();
    var myData = ensureUserSocial(data, me);
    var theirData = ensureUserSocial(data, username);

    if (myData.friends.indexOf(username) !== -1) return;
    if ((myData.friendRequests || []).indexOf(username) === -1) {
        myData.friendRequests = myData.friendRequests || [];
        myData.friendRequests.push(username);
    }
    if ((theirData.friendRequests || []).indexOf(me) === -1) {
        theirData.friendRequests = theirData.friendRequests || [];
        // Incoming request for them is tracked on their friendRequests as "from me"
        // We use a simple model: friendRequests on A = people A has requested
        // To accept, B checks if A listed B in friendRequests — handled in openUserProfile pendingIn
    }
    // Store incoming: on their profile we check if ME is in THEIR... wait
    // Simpler model: each user has friendRequests = usernames THEY sent requests TO
    // pendingIn for viewing profile of X: check if X.friendRequests includes me? No that's outgoing from X.
    // pendingIn: I am viewing X, and X sent me a request means X.friendRequests includes me.
    // Actually: if X requested me, X.friendRequests contains "me".
    // pendingIn when viewing X: X.friendRequests includes me.
    // pendingOut when viewing X: myData.friendRequests includes X.

    // For accept: when I view X and X.friendRequests includes me, I can accept.
    saveSocialData(data);
    pushNotification(username, me + " sent you a friend request.", "friend");
    alert("Friend request sent to " + username + "!");
    openUserProfile(username);
}

function acceptFriend(username) {
    var me = getMyUsername();
    if (!me) return;
    var data = getSocialData();
    var myData = ensureUserSocial(data, me);
    var theirData = ensureUserSocial(data, username);

    // username sent request to me → username.friendRequests includes me
    var reqIdx = (theirData.friendRequests || []).indexOf(me);
    if (reqIdx !== -1) theirData.friendRequests.splice(reqIdx, 1);

    // Also clear if I had requested them
    var myReq = (myData.friendRequests || []).indexOf(username);
    if (myReq !== -1) myData.friendRequests.splice(myReq, 1);

    if (myData.friends.indexOf(username) === -1) myData.friends.push(username);
    if (theirData.friends.indexOf(me) === -1) theirData.friends.push(me);

    saveSocialData(data);
    alert("You and " + username + " are now friends!");
    openUserProfile(username);
}

// --- Chat + AI Companion ---
var AZORA_AI_ID = "__azora_ai__";
var chatTypingTimer = null;
var chatAiReplyTimer = null;

function getAICompanion() {
    var def = {
        name: "Aza",
        personality: "friendly",
        head: "#ffcc00",
        body: "#a78bfa",
        accent: "#00ebd4"
    };
    try {
        var saved = JSON.parse(localStorage.getItem("azoraAICompanion") || "null");
        if (saved && typeof saved === "object") {
            return {
                name: (saved.name || def.name).toString().slice(0, 24),
                personality: saved.personality || def.personality,
                head: saved.head || def.head,
                body: saved.body || def.body,
                accent: saved.accent || def.accent
            };
        }
    } catch (e) {}
    return def;
}

function saveAICompanion(data) {
    localStorage.setItem("azoraAICompanion", JSON.stringify(data));
}

function isAIChat() {
    return currentChatFriend === AZORA_AI_ID;
}

function openAICompanionSettings() {
    var ai = getAICompanion();
    document.getElementById("aiCompName").value = ai.name;
    document.getElementById("aiCompPersonality").value = ai.personality;
    document.getElementById("aiCompHead").value = ai.head;
    document.getElementById("aiCompBody").value = ai.body;
    document.getElementById("aiCompAccent").value = ai.accent;
    updateAICompanionPreview();
    ["aiCompHead", "aiCompBody", "aiCompAccent"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el._bound) {
            el._bound = true;
            el.addEventListener("input", updateAICompanionPreview);
        }
    });
    document.getElementById("aiCompanionOverlay").style.display = "flex";
}

function updateAICompanionPreview() {
    var box = document.getElementById("aiCompPreview");
    if (!box) return;
    var head = document.getElementById("aiCompHead").value;
    var body = document.getElementById("aiCompBody").value;
    var accent = document.getElementById("aiCompAccent").value;
    box.innerHTML =
        '<div class="ai-head" style="background:' + head + '"></div>' +
        '<div class="ai-body" style="background:' + body + '"></div>' +
        '<div class="ai-legs" style="background:' + accent + '"></div>';
}

function saveAICompanionSettings() {
    var name = (document.getElementById("aiCompName").value || "Aza").trim().slice(0, 24) || "Aza";
    saveAICompanion({
        name: name,
        personality: document.getElementById("aiCompPersonality").value || "friendly",
        head: document.getElementById("aiCompHead").value,
        body: document.getElementById("aiCompBody").value,
        accent: document.getElementById("aiCompAccent").value
    });
    closeAICompanionSettings();
    updateAICompanionListItem();
    if (document.getElementById("chatOverlay").style.display === "flex") {
        renderFriendsList();
        if (isAIChat()) {
            document.getElementById("chatWithLabel").textContent = "Chat with " + name + " (AI)";
        }
    }
    alert("AI saved! Name in Chats: " + name);
}

function closeAICompanionSettings() {
    var el = document.getElementById("aiCompanionOverlay");
    if (el) el.style.display = "none";
}

function openChatPanel() {
    var login = localStorage.getItem("loggedIn");
    if (login !== "true" && login !== "guest") {
        alert("Please log in or continue as Guest to use Chat!");
        openCreateAccount();
        return;
    }
    document.getElementById("chatOverlay").style.display = "flex";
    renderFriendsList();
    // Default: open AI companion (available to accounts and guests)
    selectChatFriend(AZORA_AI_ID);
}

function closeChatPanel() {
    document.getElementById("chatOverlay").style.display = "none";
    clearChatTyping();
    if (chatAiReplyTimer) {
        clearTimeout(chatAiReplyTimer);
        chatAiReplyTimer = null;
    }
}

function updateAICompanionListItem() {
    var ai = getAICompanion();
    var item = document.getElementById("aiCompanionListItem");
    var nameEl = document.getElementById("aiCompanionListName");
    var slot = document.getElementById("aiChatSlot");
    if (nameEl) nameEl.textContent = ai.name || "Aza";
    if (item) {
        item.className = "friend-item ai-companion" + (currentChatFriend === AZORA_AI_ID ? " active" : "");
        item.onclick = function () { selectChatFriend(AZORA_AI_ID); };
        var av = item.querySelector(".friend-avatar");
        if (av) {
            av.className = "friend-avatar ai-face";
            av.style.setProperty("--ai-head", ai.head || "#ffcc00");
            av.style.setProperty("--ai-body", ai.body || "#a78bfa");
            av.style.background = "linear-gradient(135deg, " + (ai.head || "#ffcc00") + ", " + (ai.body || "#a78bfa") + ")";
            av.textContent = "AI";
        }
        // ensure meta text under name
        var meta = item.querySelector(".friend-meta");
        if (meta) {
            var small = meta.querySelector("small");
            if (small) small.textContent = "AI Companion · Tap to chat";
        }
    } else if (slot) {
        // recreate if missing
        slot.innerHTML =
            '<div class="friend-item ai-companion' + (currentChatFriend === AZORA_AI_ID ? " active" : "") + '" id="aiCompanionListItem" onclick="selectChatFriend(\'__azora_ai__\')">' +
            '<div class="friend-avatar ai-face" style="background:linear-gradient(135deg,' + (ai.head || "#ffcc00") + ',' + (ai.body || "#a78bfa") + ')">AI</div>' +
            '<div class="friend-meta"><span id="aiCompanionListName">' + escapeHtml(ai.name || "Aza") + '</span>' +
            '<small>AI Companion · Tap to chat</small></div></div>';
    }
}

function renderFriendsList() {
    var isGuest = localStorage.getItem("loggedIn") === "guest";
    var me = getMyUsername();
    var list = document.getElementById("friendsList");
    var noMsg = document.getElementById("noFriendsMsg");
    if (!list) return;

    updateAICompanionListItem();
    list.innerHTML = "";

    if (isGuest) {
        if (noMsg) {
            noMsg.style.display = "block";
            noMsg.textContent = "Guests can chat with their AI above. Create an account to add friends!";
        }
        return;
    }

    var data = getSocialData();
    var myData = ensureUserSocial(data, me);
    if (!myData.friends || myData.friends.length === 0) {
        if (noMsg) {
            noMsg.style.display = "block";
            noMsg.textContent = "No friends yet. Search users and tap Add Friend!";
        }
        return;
    }
    if (noMsg) noMsg.style.display = "none";
    myData.friends.forEach(function (friend) {
        var item = document.createElement("div");
        item.className = "friend-item" + (currentChatFriend === friend ? " active" : "");
        item.innerHTML =
            '<div class="friend-avatar">' + String(friend)[0].toUpperCase() + '</div>' +
            '<div class="friend-meta"><span>' + escapeHtml(friend) + '</span><small>Friend</small></div>';
        item.onclick = function () { selectChatFriend(friend); };
        list.appendChild(item);
    });
}

function selectChatFriend(friend) {
    clearChatTyping();
    if (chatAiReplyTimer) {
        clearTimeout(chatAiReplyTimer);
        chatAiReplyTimer = null;
    }
    currentChatFriend = friend;
    if (friend === AZORA_AI_ID) {
        var ai = getAICompanion();
        document.getElementById("chatWithLabel").textContent = "Chat with " + ai.name + " (AI)";
    } else {
        document.getElementById("chatWithLabel").textContent = "Chat with " + friend;
    }
    document.getElementById("chatInputRow").style.display = "flex";
    renderFriendsList();
    renderChatMessages();
}

function getChatKey(a, b) {
    if (b === AZORA_AI_ID || a === AZORA_AI_ID) {
        var user = (a === AZORA_AI_ID) ? b : a;
        if (!user || user === "Guest" || user === "Player") {
            user = getChatSenderId();
        }
        return "azoraChat_AI_" + String(user);
    }
    return "azoraChat_" + [String(a), String(b)].sort().join("_");
}

function createTypingIndicatorEl() {
    var div = document.createElement("div");
    div.className = "chat-typing";
    div.id = "chatTypingIndicator";
    div.setAttribute("aria-label", "Typing");
    div.innerHTML = "<span></span><span></span><span></span>";
    return div;
}

function showChatTyping() {
    var box = document.getElementById("chatMessages");
    if (!box) return;
    clearChatTyping();
    // remove empty state text if present
    var empty = box.querySelector("p");
    if (empty && empty.textContent.indexOf("No messages") !== -1) empty.remove();
    box.appendChild(createTypingIndicatorEl());
    box.scrollTop = box.scrollHeight;
}

function clearChatTyping() {
    var el = document.getElementById("chatTypingIndicator");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (chatTypingTimer) {
        clearTimeout(chatTypingTimer);
        chatTypingTimer = null;
    }
}

function getChatSenderId() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (acc && acc.isGuest) {
            return acc.guestId || ("guest_" + (acc.userId || "local"));
        }
        if (acc && acc.username) return acc.username;
    } catch (e) {}
    if (localStorage.getItem("loggedIn") === "guest") return "guest_local";
    return getMyUsername() || "Player";
}

function renderChatMessages() {
    var box = document.getElementById("chatMessages");
    if (!box || !currentChatFriend) return;
    var me = getChatSenderId();
    var key = getChatKey(me, currentChatFriend);
    var messages = [];
    try { messages = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}

    box.innerHTML = "";
    if (messages.length === 0) {
        var ai = getAICompanion();
        var hint = isAIChat()
            ? ("Say hi to " + ai.name + "! Your AI companion is ready to chat.")
            : "No messages yet. Say hi!";
        box.innerHTML = '<p style="color:rgba(255,255,255,0.6);text-align:center;margin-top:40px;">' + escapeHtml(hint) + '</p>';
        return;
    }
    messages.forEach(function (m) {
        var div = document.createElement("div");
        var mine = (m.from === me || m.from === getMyUsername() || m.from === "Guest");
        // AI messages are never "mine"
        if (m.from === AZORA_AI_ID || m.isAI) mine = false;
        div.className = "chat-bubble " + (mine ? "mine" : "theirs");
        div.textContent = m.text;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function aiReplyDelayMs(userText) {
    var len = (userText || "").length;
    var t = 3000 + Math.min(2000, len * 25);
    return Math.max(3000, Math.min(5000, t));
}

function generateAIReply(userText) {
    var ai = getAICompanion();
    var t = (userText || "").toLowerCase().trim();
    var name = ai.name || "Aza";
    var p = ai.personality || "friendly";

    // Who is the human talking?
    var userName = "";
    var isGuest = localStorage.getItem("loggedIn") === "guest";
    var userId = "";
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (acc) {
            if (acc.isGuest || isGuest) {
                userName = "";
                isGuest = true;
                userId = acc.userId || acc.guestId || "";
            } else {
                userName = acc.username || "";
                userId = acc.userId || "";
            }
        }
    } catch (e) {}
    if (!userName && !isGuest) userName = getMyUsername() || "";

    var openers = {
        friendly: ["Hey!", "Hi there!", "Hello!", "Nice to hear from you!"],
        playful: ["Hehe!", "Ooh!", "Yo!", "Haha okay—"],
        chill: ["Hey.", "Mm.", "Cool.", "Alright—"],
        builder: ["Got it!", "On it!", "Interesting!", "Let's think—"]
    };
    var list = openers[p] || openers.friendly;
    var opener = list[Math.floor(Math.random() * list.length)];

    // --- Name / identity questions (smarter) ---
    var asksName = (
        /\b(my name|what(?:'s| is) my name|who am i|what(?:'s| is) my username|my username|do you know (?:my )?name|what do you call me|who am i known as)\b/i.test(t) ||
        (/\bname\b/.test(t) && /\b(my|me|i)\b/.test(t) && /\b(what|whats|what's|who|tell|know)\b/.test(t))
    );
    if (asksName) {
        if (isGuest || !userName) {
            return opener + " You're chatting as a Guest right now, so you don't have a username yet. Create an account and I'll remember your name!";
        }
        return opener + " Your username on Azora is " + userName + "." +
            (userId ? " Your public User ID is " + userId + "." : "") +
            " Nice to know you, " + userName + "!";
    }

    // AI's own name
    if (/\b(your name|who are you|what(?:'s| is) your name|what are you called)\b/i.test(t)) {
        return "I'm " + name + ", your personal AI companion on Azora! You can rename me anytime with Customize AI.";
    }

    // Greetings
    if (/^(hello|hi|hey|yo|sup|hiya|good (morning|afternoon|evening))\b/.test(t) || t === "hi" || t === "hey") {
        if (userName) {
            return opener + " " + userName + "! I'm " + name + ". How's your day on Azora?";
        }
        return opener + " I'm " + name + ", your Azora AI companion. How's your day?";
    }

    // User ID
    if (/\b(my (user )?id|what(?:'s| is) my id|aza:\s*\d+)\b/i.test(t)) {
        if (userId) {
            return opener + " Your public User ID is " + userId + ".";
        }
        return opener + " I don't see a User ID on this session yet.";
    }

    // Games / building
    if (/\b(game|build|create|aza\s*fn|azafn|publish|feed)\b/.test(t)) {
        return opener + (userName ? " " + userName + "," : "") +
            " Building games on Azora is the best. Open AzaFn to design a 2D or 3D idea, then publish it to Feed!";
    }

    // Friends / chat
    if (/\b(friend|message|dm|chat with)\b/.test(t)) {
        if (isGuest) {
            return opener + " Guests can talk to me anytime! Create an account to add human friends and message them.";
        }
        return opener + " Search for players, send a friend request, and when they accept you can message them in Chat. I'm always here too.";
    }

    // Avatar / customize
    if (/\b(avatar|color|custom|outfit)\b/.test(t)) {
        return opener + " Customize your avatar on the main page. You can also change my name and colors with the Customize AI button!";
    }

    // Help / capabilities
    if (/\b(help|what can you do|commands|how do (i|you)|what are you)\b/.test(t)) {
        var who = userName ? userName : (isGuest ? "Guest" : "friend");
        return "I'm " + name + "! I can chat with you, remember your Azora username when you ask, and talk about games, Feed, friends, and avatars. What do you want to know, " + who + "?";
    }

    // Thanks
    if (/\b(thank|thanks|thx|ty)\b/.test(t)) {
        return opener + (userName ? " You're welcome, " + userName + "!" : " You're welcome! Happy to chat anytime.");
    }

    // How are you
    if (/\b(how are you|how(?:'s| is) it going|whats up|what's up)\b/.test(t)) {
        return opener + " I'm doing great — always ready to chat on Azora." + (userName ? " How are you, " + userName + "?" : " How are you?");
    }

    // Weather / joke light topics
    if (/\b(joke|funny)\b/.test(t)) {
        return opener + " Why did the avatar bring a ladder to Azora? To reach the next level!";
    }

    // Questions (generic but slightly smarter)
    if (/\?/.test(t)) {
        if (userName) {
            return opener + " Good question, " + userName + "! I'm a simple companion, but I can talk about your username, games, Feed, friends, and Azora tips.";
        }
        return opener + " Good question! Ask me about your username, games, Feed, friends, or how Azora works.";
    }

    // Echo a bit of what they said for smarter feel
    var snippet = (userText || "").trim();
    if (snippet.length > 80) snippet = snippet.slice(0, 77) + "...";
    var generics = [
        opener + (userName ? " " + userName + "," : "") + " that sounds interesting. Tell me more!",
        opener + " I heard you — \"" + snippet + "\". What else is on your mind?",
        opener + " Azora is more fun with chats like this." + (userName ? " Anything else, " + userName + "?" : ""),
        opener + " Thanks for talking with me. Want to build a game later or check the Feed?",
        opener + " I'm right here if you want to keep chatting" + (userName ? ", " + userName : "") + "."
    ];
    return generics[Math.floor(Math.random() * generics.length)];
}

function scheduleAIReply(userText, storageKey) {
    if (chatAiReplyTimer) {
        clearTimeout(chatAiReplyTimer);
        chatAiReplyTimer = null;
    }
    showChatTyping();
    var delay = aiReplyDelayMs(userText);
    chatAiReplyTimer = setTimeout(function () {
        chatAiReplyTimer = null;
        // Still in AI chat?
        if (currentChatFriend !== AZORA_AI_ID) {
            clearChatTyping();
            return;
        }
        clearChatTyping();
        var reply = generateAIReply(userText);
        var msgs = [];
        try { msgs = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) {}
        msgs.push({ from: AZORA_AI_ID, text: reply, at: Date.now(), isAI: true });
        localStorage.setItem(storageKey, JSON.stringify(msgs));
        renderChatMessages();
        // ensure typing is gone
        clearChatTyping();
    }, delay);
}

function sendChatMessage() {
    var input = document.getElementById("chatInput");
    if (!input) return;
    var text = (input.value || "").trim();
    if (!text) return;

    // If no chat selected, default to AI
    if (!currentChatFriend) {
        currentChatFriend = AZORA_AI_ID;
    }

    var isGuest = localStorage.getItem("loggedIn") === "guest";
    if (isGuest && currentChatFriend !== AZORA_AI_ID) {
        alert("Guests can only chat with their AI companion. Create an account to message friends!");
        selectChatFriend(AZORA_AI_ID);
        return;
    }

    var me = getChatSenderId();
    if (!me) me = isGuest ? "guest_local" : "Player";

    var key = getChatKey(me, currentChatFriend);
    var messages = [];
    try { messages = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    messages.push({ from: me, text: text, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(messages));
    input.value = "";
    renderChatMessages();

    if (currentChatFriend === AZORA_AI_ID || isAIChat()) {
        currentChatFriend = AZORA_AI_ID;
        scheduleAIReply(text, key);
    } else {
        showChatTyping();
        if (chatTypingTimer) clearTimeout(chatTypingTimer);
        chatTypingTimer = setTimeout(function () {
            clearChatTyping();
        }, 2200);
    }
}

window.openAICompanionSettings = openAICompanionSettings;
window.closeAICompanionSettings = closeAICompanionSettings;
window.saveAICompanionSettings = saveAICompanionSettings;
window.updateAICompanionPreview = updateAICompanionPreview;
window.updateAICompanionListItem = updateAICompanionListItem;

// Wire search "View" to open profiles
// Wire search "View" to open profiles
function performSearch() {
    const query = document.getElementById("searchInput").value.trim().toLowerCase();
    const resultsContainer = document.getElementById("searchResultsContainer");
    resultsContainer.innerHTML = "";

    let localUsers = [];
    const localAcc = localStorage.getItem("azoraAccount");
    if (localAcc) {
        try {
            const parsed = JSON.parse(localAcc);
            localUsers.push({ username: parsed.username, profileLink: "#" });
        } catch (e) {}
    }

    // Also include known social users
    var social = getSocialData();
    Object.keys(social).forEach(function (uname) {
        if (!localUsers.some(function (u) { return u.username.toLowerCase() === uname.toLowerCase(); })) {
            localUsers.push({ username: uname, profileLink: "#" });
        }
    });

    const allUsers = [...database.users, ...localUsers];
    const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.username.toLowerCase(), item])).values());

    let results = [];
    if (currentSearchTab === "users") {
        results = uniqueUsers.filter(u => u.username.toLowerCase().includes(query));
    } else {
        results = database.games.filter(g => g.title.toLowerCase().includes(query) || g.author.toLowerCase().includes(query));
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = "<div class='no-results'>No results found.</div>";
        return;
    }

    results.forEach(item => {
        const row = document.createElement("div");
        row.className = "search-result-item";
        if (currentSearchTab === "users") {
            row.innerHTML = '👤 <strong>' + escapeHtml(item.username) + '</strong> ';
            var viewBtn = document.createElement("a");
            viewBtn.href = "#";
            viewBtn.className = "search-action-btn";
            viewBtn.textContent = "View";
            viewBtn.onclick = function (e) {
                e.preventDefault();
                closeSearch();
                openUserProfile(item.username);
            };
            row.appendChild(viewBtn);
        } else {
            row.innerHTML = '🎮 <strong>' + escapeHtml(item.title) + '</strong> <span class="creator-by">by ' + escapeHtml(item.author) + '</span> <a href="' + item.link + '" class="search-action-btn">Play</a>';
        }
        resultsContainer.appendChild(row);
    });
}

window.dismissIntroSplash = dismissIntroSplash;
window.ensureGuestButtonsVisible = ensureGuestButtonsVisible;
window.getPublicUserId = getPublicUserId;
window.setProfileUserIdDisplay = setProfileUserIdDisplay;
window.createAccount = createAccount;
window.loginAccount = loginAccount;
window.getSavedAccounts = getSavedAccounts;
window.continueAsGuest = continueAsGuest;
window.applyGuestAvatarLock = applyGuestAvatarLock;
window.refreshAvatarLock = refreshAvatarLock;
window.isAvatarUnlocked = isAvatarUnlocked;
window.openMyProfile = openMyProfile;
window.openGuestProfile = openGuestProfile;
window.isGuestSession = isGuestSession;
window.getDisplayName = getDisplayName;
window.openUserProfile = openUserProfile;
window.closeProfile = closeProfile;
window.toggleFollow = toggleFollow;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriend = acceptFriend;
window.openChatPanel = openChatPanel;
window.closeChatPanel = closeChatPanel;
window.selectChatFriend = selectChatFriend;
window.sendChatMessage = sendChatMessage;


// ============================================================
// Azora 3.9 — Profile Bio, Status, Notifications
// ============================================================

var STATUS_LABELS = {
    online: "Online",
    offline: "Offline",
    afk: "AFK",
    building: "Building",
    playing: "Playing",
    busy: "Busy"
};

var lastActivity = Date.now();
var manualStatusOverride = null; // if set, auto-idle won't override until user goes idle again after choosing online
var statusIdleTimer = null;

function statusLabel(key) {
    return STATUS_LABELS[key] || "Offline";
}

function getProfileData() {
    try { return JSON.parse(localStorage.getItem("azoraProfiles") || "{}"); }
    catch (e) { return {}; }
}

function saveProfileData(data) {
    localStorage.setItem("azoraProfiles", JSON.stringify(data));
}

function getStatusData() {
    try { return JSON.parse(localStorage.getItem("azoraStatuses") || "{}"); }
    catch (e) { return {}; }
}

function saveStatusData(data) {
    localStorage.setItem("azoraStatuses", JSON.stringify(data));
}

function getUserStatus(username) {
    var data = getStatusData();
    if (data[username] && data[username].status) return data[username].status;
    return "offline";
}

function setUserStatus(username, status) {
    var data = getStatusData();
    data[username] = { status: status, updatedAt: Date.now() };
    saveStatusData(data);
}

function updateBioCount() {
    var input = document.getElementById("bioInput");
    var count = document.getElementById("bioCount");
    if (input && count) {
        count.textContent = input.value.length + " / 250";
    }
}

function saveProfileBio() {
    var me = getMyUsername();
    if (!me) return;
    var input = document.getElementById("bioInput");
    var bio = (input.value || "").trim().slice(0, 250);
    var profiles = getProfileData();
    if (!profiles[me]) profiles[me] = {};
    profiles[me].bio = bio;
    saveProfileData(profiles);
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (acc.username === me) {
            acc.bio = bio;
            localStorage.setItem("azoraAccount", JSON.stringify(acc));
            var map = getSavedAccounts();
            if (map[me]) {
                map[me].bio = bio;
                saveSavedAccounts(map);
            }
        }
    } catch (e) {}
    alert("Profile description saved!");
    openUserProfile(me);
}

function setManualStatus(value) {
    var me = getMyUsername();
    if (!me) return;
    setUserStatus(me, value);
    manualStatusOverride = value;
    lastActivity = Date.now();
    // If they pick online/building/playing/busy, treat as active
    if (value !== "offline" && value !== "afk") {
        lastActivity = Date.now();
    }
}

function touchActivity() {
    lastActivity = Date.now();
    var me = getMyUsername();
    if (!me) return;
    var current = getUserStatus(me);
    // Only auto-bump to online if currently offline/afk and no busy/building/playing override
    if (current === "offline" || current === "afk") {
        if (!manualStatusOverride || manualStatusOverride === "online" || manualStatusOverride === "offline" || manualStatusOverride === "afk") {
            setUserStatus(me, "online");
            manualStatusOverride = "online";
            var sel = document.getElementById("statusSelect");
            if (sel) sel.value = "online";
        }
    }
}

function checkIdleStatus() {
    var me = getMyUsername();
    if (!me || localStorage.getItem("loggedIn") !== "true") return;

    var idleMs = Date.now() - lastActivity;
    var current = getUserStatus(me);

    // Don't auto-change busy / building / playing unless idle long enough for AFK/offline
    // After 5 min → AFK (unless already offline)
    // After 10 min → Offline
    if (idleMs >= 10 * 60 * 1000) {
        if (current !== "offline") {
            setUserStatus(me, "offline");
            manualStatusOverride = "offline";
            var sel = document.getElementById("statusSelect");
            if (sel) sel.value = "offline";
        }
    } else if (idleMs >= 5 * 60 * 1000) {
        if (current !== "afk" && current !== "offline") {
            setUserStatus(me, "afk");
            var sel2 = document.getElementById("statusSelect");
            if (sel2) sel2.value = "afk";
        }
    }
}

function initStatusSystem() {
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(function (evt) {
        document.addEventListener(evt, touchActivity, { passive: true });
    });
    setInterval(checkIdleStatus, 15000);

    var me = getMyUsername();
    if (me && localStorage.getItem("loggedIn") === "true") {
        // Coming online on page load
        var cur = getUserStatus(me);
        if (cur === "offline" || cur === "afk" || !cur) {
            setUserStatus(me, "online");
        }
        var sel = document.getElementById("statusSelect");
        if (sel) sel.value = getUserStatus(me);
    }
}

// --- Notifications ---
function getNotifications(username) {
    try {
        var all = JSON.parse(localStorage.getItem("azoraNotifications") || "{}");
        return all[username] || [];
    } catch (e) { return []; }
}

function saveNotifications(username, list) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem("azoraNotifications") || "{}"); } catch (e) {}
    all[username] = list.slice(0, 50); // keep last 50
    localStorage.setItem("azoraNotifications", JSON.stringify(all));
}

function pushNotification(toUsername, message, type) {
    if (!toUsername) return;
    var list = getNotifications(toUsername);
    list.unshift({
        id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        message: message,
        type: type || "info",
        read: false,
        at: Date.now()
    });
    saveNotifications(toUsername, list);
    // Update badge if it's me
    if (toUsername === getMyUsername()) updateNotifBadge();
}

function updateNotifBadge() {
    var me = getMyUsername();
    var badge = document.getElementById("notifBadge");
    if (!badge || !me) return;
    var list = getNotifications(me);
    var unread = list.filter(function (n) { return !n.read; }).length;
    if (unread > 0) {
        badge.style.display = "flex";
        badge.textContent = unread > 9 ? "9+" : String(unread);
    } else {
        badge.style.display = "none";
    }
}

function toggleNotifPanel() {
    var ov = document.getElementById("notifOverlay");
    if (ov.style.display === "flex") {
        closeNotifPanel();
    } else {
        openNotifPanel();
    }
}

function openNotifPanel() {
    if (localStorage.getItem("loggedIn") === "guest") {
        alert("Guests don't receive notifications. Create an account to stay updated!");
        return;
    }
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Please log in to see notifications!");
        return;
    }
    document.getElementById("notifOverlay").style.display = "flex";
    renderNotifList();
}

function closeNotifPanel() {
    document.getElementById("notifOverlay").style.display = "none";
}

function renderNotifList() {
    var listEl = document.getElementById("notifList");
    if (!listEl) return;
    var me = getMyUsername();
    var list = getNotifications(me);
    if (list.length === 0) {
        listEl.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        return;
    }
    listEl.innerHTML = "";
    list.forEach(function (n) {
        var div = document.createElement("div");
        div.className = "notif-item" + (n.read ? "" : " unread");
        var timeStr = new Date(n.at).toLocaleString();
        div.innerHTML = escapeHtml(n.message) + '<span class="notif-time">' + timeStr + '</span>';
        div.onclick = function () {
            n.read = true;
            saveNotifications(me, list);
            updateNotifBadge();
            renderNotifList();
        };
        listEl.appendChild(div);
    });
}

function markAllNotifsRead() {
    var me = getMyUsername();
    var list = getNotifications(me);
    list.forEach(function (n) { n.read = true; });
    saveNotifications(me, list);
    updateNotifBadge();
    renderNotifList();
}

// Milestone helper (call when games hit play counts etc.)
function notifyGameMilestone(creatorUsername, gameTitle, milestone) {
    pushNotification(creatorUsername, gameTitle + " reached " + milestone + "!", "milestone");
}

// Wire bio counter
document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "bioInput") updateBioCount();
});

// Init on DOM ready (append to existing flow)
(function initV39() {
    function run() {
        initStatusSystem();
        updateNotifBadge();
        var bioInput = document.getElementById("bioInput");
        if (bioInput) bioInput.addEventListener("input", updateBioCount);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();

window.saveProfileBio = saveProfileBio;
window.setManualStatus = setManualStatus;
window.toggleNotifPanel = toggleNotifPanel;
window.openNotifPanel = openNotifPanel;
window.closeNotifPanel = closeNotifPanel;
window.markAllNotifsRead = markAllNotifsRead;
window.pushNotification = pushNotification;
window.notifyGameMilestone = notifyGameMilestone;


// Keep guest buttons correct even if something else toggles the topbar
setTimeout(function () {
    if (typeof ensureGuestButtonsVisible === "function") ensureGuestButtonsVisible();
    if (typeof refreshAvatarLock === "function") refreshAvatarLock();
}, 100);
setTimeout(function () {
    if (typeof ensureGuestButtonsVisible === "function") ensureGuestButtonsVisible();
    if (typeof refreshAvatarLock === "function") refreshAvatarLock();
}, 1000);


function switchSettingsTab(tab) {
    var basic = document.getElementById("settingsPanelBasic");
    var security = document.getElementById("settingsPanelSecurity");
    var tabBasic = document.getElementById("settingsTabBasic");
    var tabSecurity = document.getElementById("settingsTabSecurity");
    if (!basic || !security) return;

    var isGuest = localStorage.getItem("loggedIn") === "guest";
    var isFull = localStorage.getItem("loggedIn") === "true";

    // Guests: Security is restricted
    if (tab === "security" && !isFull) {
        if (tabSecurity) {
            tabSecurity.classList.add("restricted");
        }
        // Still show the panel but locked content via refreshSecurityPanel
    }

    if (tab === "security") {
        basic.style.display = "none";
        security.style.display = "block";
        if (tabBasic) tabBasic.classList.remove("active");
        if (tabSecurity) tabSecurity.classList.add("active");
        refreshSecurityPanel();
    } else {
        basic.style.display = "block";
        security.style.display = "none";
        if (tabBasic) tabBasic.classList.add("active");
        if (tabSecurity) tabSecurity.classList.remove("active");
    }
}

function refreshSecurityPanel() {
    var info = document.getElementById("securityAccountInfo");
    var err = document.getElementById("securityError");
    var ok = document.getElementById("securitySuccess");
    if (err) { err.style.display = "none"; err.textContent = ""; }
    if (ok) { ok.style.display = "none"; ok.textContent = ""; }

    var loggedIn = localStorage.getItem("loggedIn");
    var acc = {};
    try { acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}"); } catch (e) {}

    var formIds = ["currentPassword", "newPassword", "confirmNewPassword"];
    var updateBtn = null;
    // Find update password button inside security panel
    var secPanel = document.getElementById("settingsPanelSecurity");
    if (secPanel) {
        var btns = secPanel.querySelectorAll("button");
        btns.forEach(function (b) {
            if (b.textContent.indexOf("Update Password") !== -1) updateBtn = b;
        });
    }

    var locked = loggedIn !== "true";

    formIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.disabled = locked;
            el.placeholder = locked ? "Restricted for guests" : el.getAttribute("data-ph") || el.placeholder;
            if (!el.getAttribute("data-ph") && !locked) el.setAttribute("data-ph", el.placeholder);
        }
    });
    if (updateBtn) {
        updateBtn.disabled = locked;
        updateBtn.style.opacity = locked ? "0.5" : "1";
        updateBtn.style.pointerEvents = locked ? "none" : "auto";
    }

    if (info) {
        if (loggedIn === "true" && acc.username) {
            info.innerHTML = "Signed in as <strong>" + escapeHtml(acc.username) + "</strong>" +
                (acc.userId ? " · " + escapeHtml(acc.userId) : "");
        } else if (loggedIn === "guest") {
            info.innerHTML = "🔒 <strong>Security is restricted for guests.</strong><br>" +
                "Guests have no username or password, and progress is not saved.<br>" +
                "You can still play games — create an account to like, save, comment, and use Security.";
        } else {
            info.textContent = "Sign in with a full account to manage security.";
        }
    }

    // Dim security tab for guests
    var tabSecurity = document.getElementById("settingsTabSecurity");
    if (tabSecurity) {
        if (loggedIn === "guest") tabSecurity.classList.add("restricted");
        else tabSecurity.classList.remove("restricted");
    }
}

function changePassword() {
    var err = document.getElementById("securityError");
    var ok = document.getElementById("securitySuccess");
    if (err) { err.style.display = "none"; err.textContent = ""; }
    if (ok) { ok.style.display = "none"; ok.textContent = ""; }

    function fail(msg) {
        if (err) {
            err.textContent = msg;
            err.style.display = "block";
        } else {
            alert(msg);
        }
    }

    if (localStorage.getItem("loggedIn") !== "true") {
        fail("You must be logged in with a full account to change your password.");
        return;
    }

    var acc = {};
    try { acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}"); } catch (e) {}
    if (!acc.username || acc.isGuest) {
        fail("Guests cannot change a password. Create an account first.");
        return;
    }

    var current = document.getElementById("currentPassword").value;
    var next = document.getElementById("newPassword").value;
    var confirm = document.getElementById("confirmNewPassword").value;

    // Current password must match 100%
    if (typeof acc.password !== "string" || acc.password !== current) {
        fail("The password is incorrect. Please type the correct password");
        document.getElementById("currentPassword").value = "";
        document.getElementById("currentPassword").focus();
        return;
    }
    if (!next) {
        fail("Please enter a new password.");
        return;
    }
    if (next !== confirm) {
        fail("New passwords do not match.");
        return;
    }
    if (next === current) {
        fail("New password must be different from your current password.");
        return;
    }

    // Update account + multi-account store
    acc.password = next;
    localStorage.setItem("azoraAccount", JSON.stringify(acc));
    try {
        var map = getSavedAccounts();
        if (map[acc.username]) {
            map[acc.username].password = next;
            saveSavedAccounts(map);
        } else {
            map[acc.username] = acc;
            saveSavedAccounts(map);
        }
    } catch (e) {}

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";

    if (ok) {
        ok.textContent = "Password updated successfully!";
        ok.style.display = "block";
    } else {
        alert("Password updated successfully!");
    }
}

window.switchSettingsTab = switchSettingsTab;
window.changePassword = changePassword;
window.refreshSecurityPanel = refreshSecurityPanel;
