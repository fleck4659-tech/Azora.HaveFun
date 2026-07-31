console.log("%c[Azora] script.js v40.1 bright+UV","color:#1e60ff;font-weight:bold;font-size:14px");
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

var AZORA_TEMP_DISABLE_CREATE = true;
var AZORA_TEMP_DISABLE_AZAFN = true;
function showDisabledFeatureTip(event, btnEl) {
    var tip = document.getElementById("azoraDisabledTip");
    if (!tip) return;
    tip.textContent = "Oops! Looks like this button is disabled!";
    tip.style.display = "block";
    var pad = 12, tw = tip.offsetWidth || 200, th = tip.offsetHeight || 40;
    var br = btnEl ? btnEl.getBoundingClientRect() : null;
    var mx = (event && typeof event.clientX === "number") ? event.clientX : (br ? br.left + br.width / 2 : 40);
    var my = (event && typeof event.clientY === "number") ? event.clientY : (br ? br.top : 40);
    var x = mx + 14, y = my + 14;
    if (br) {
        var left = br.left - pad, right = br.right + pad, top = br.top - pad, bottom = br.bottom + pad;
        var overlaps = !(x + tw < left || x > right || y + th < top || y > bottom);
        if (overlaps) {
            var spaceRight = window.innerWidth - br.right, spaceLeft = br.left, spaceBelow = window.innerHeight - br.bottom, spaceAbove = br.top;
            var best = Math.max(spaceRight, spaceLeft, spaceBelow, spaceAbove);
            if (best === spaceRight) { x = br.right + pad; y = Math.min(Math.max(my - th / 2, 8), window.innerHeight - th - 8); }
            else if (best === spaceLeft) { x = br.left - pad - tw; y = Math.min(Math.max(my - th / 2, 8), window.innerHeight - th - 8); }
            else if (best === spaceBelow) { y = br.bottom + pad; x = Math.min(Math.max(mx - tw / 2, 8), window.innerWidth - tw - 8); }
            else { y = br.top - pad - th; x = Math.min(Math.max(mx - tw / 2, 8), window.innerWidth - tw - 8); }
        }
    }
    x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - th - 8));
    tip.style.left = x + "px"; tip.style.top = y + "px";
    clearTimeout(showDisabledFeatureTip._t);
    showDisabledFeatureTip._t = setTimeout(function () { tip.style.display = "none"; }, 2200);
}
function handleDisabledFeatureClick(event, btnEl) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    showDisabledFeatureTip(event || window.event, btnEl || (event && event.currentTarget));
    return false;
}
window.showDisabledFeatureTip = showDisabledFeatureTip;
window.handleDisabledFeatureClick = handleDisabledFeatureClick;


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


// ============================================================
// Platform owner account: "Azora" — full access, no password code
// ============================================================
var AZORA_OWNER_NAME = "Azora";

function isOwnerUsername(name) {
    return String(name || "").trim().toLowerCase() === "azora";
}

function isAzoraOwner() {
    try {
        if (localStorage.getItem("loggedIn") !== "true") return false;
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        return !!(acc && isOwnerUsername(acc.username));
    } catch (e) { return false; }
}

/** Ensure the official owner account exists on this device */
function ensureOwnerAccount() {
    migrateLegacyAccount();
    var map = getSavedAccounts();
    var existing = null;
    Object.keys(map).forEach(function (k) {
        if (isOwnerUsername(k)) existing = map[k];
    });
    if (existing) {
        existing.isOwner = true;
        existing.username = AZORA_OWNER_NAME;
        // Owner may have empty password ("no code")
        if (typeof existing.password !== "string") existing.password = "";
        map[AZORA_OWNER_NAME] = existing;
        // remove case variants
        Object.keys(map).forEach(function (k) {
            if (k !== AZORA_OWNER_NAME && isOwnerUsername(k)) delete map[k];
        });
        saveSavedAccounts(map);
        return existing;
    }
    var owner = {
        username: AZORA_OWNER_NAME,
        password: "",
        email: "",
        isGuest: false,
        isOwner: true,
        userId: "Aza: Owner",
        bio: "Official Azora account. Build games. Customize avatars. Have fun.",
        avatar: {
            head: "#ffcc00",
            torso: "#1e60ff",
            leftArm: "#ffcc00",
            rightArm: "#ffcc00",
            leftLeg: "#00ebd4",
            rightLeg: "#00ebd4"
        },
        createdAt: Date.now()
    };
    map[AZORA_OWNER_NAME] = owner;
    saveSavedAccounts(map);
    // registry
    try {
        var registry = JSON.parse(localStorage.getItem("azoraUserRegistry") || "[]");
        var found = registry.some(function (r) { return r && isOwnerUsername(r.username); });
        if (!found) {
            registry.unshift({
                userId: "Aza: Owner",
                username: AZORA_OWNER_NAME,
                displayName: AZORA_OWNER_NAME,
                isGuest: false,
                isOwner: true,
                createdAt: Date.now()
            });
            localStorage.setItem("azoraUserRegistry", JSON.stringify(registry));
        }
    } catch (e) {}
    return owner;
}

window.isAzoraOwner = isAzoraOwner;
window.isOwnerUsername = isOwnerUsername;
window.ensureOwnerAccount = ensureOwnerAccount;

function createAccount() {
    if (typeof clearAccountError === "function") clearAccountError();
    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;
    var confirm = document.getElementById("confirmPassword").value;
    var btn = document.getElementById("mainButton");

    if (isOwnerUsername(username)) {
        alert("The username \"Azora\" is reserved for the official platform owner. Please choose another name.");
        return;
    }
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

    migrateLegacyAccount();
    ensureOwnerAccount();

    // Official owner "Azora" — no code/password required
    if (isOwnerUsername(username)) {
        var owner = ensureOwnerAccount();
        owner.isOwner = true;
        setLoggedInAccount(owner);
        try {
            var coins = parseInt(localStorage.getItem("azoraCoins") || "0", 10) || 0;
            if (coins < 99999) localStorage.setItem("azoraCoins", "99999");
        } catch (e) {}
        clearAccountError();
        alert("Welcome, Azora (Owner)!\nFull platform access unlocked.\nNo password required for this account.");
        location.reload();
        return;
    }

    if (password.length === 0) {
        showAccountError("Please enter your password.");
        return;
    }

    var account = findAccountByUsername(username);

    if (!account) {
        showAccountError("No account found with that username. Create an account first.");
        return;
    }

    // 100% exact password match (case-sensitive, character-for-character)
    var saved = account.password;
    if (typeof saved !== "string" || saved !== password) {
        showAccountError("The password is incorrect. Please type the correct password");
        var pw = document.getElementById("password");
        if (pw) {
            pw.value = "";
            pw.focus();
        }
        return;
    }

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
function handleCreateClick(event) {
    if (typeof AZORA_TEMP_DISABLE_CREATE !== "undefined" && AZORA_TEMP_DISABLE_CREATE) {
        handleDisabledFeatureClick(event || window.event, document.getElementById("createGameBtn"));
        return;
    }
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
let faceGroup, neckMesh, avatarCharacterGroup;

function makeBox(w, h, d, color) {
    return new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: color })
    );
}

function buildAvatarFace(headColor) {
    // Flat 2D face only — Smile.png decal (no 3D eyes/mouth).
    // Smile.png is a transparent PNG (black smile only). Plane stays hidden until texture loads.
    var face = new THREE.Group();
    face.name = "face";

    var mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.FrontSide,
        alphaTest: 0.2
    });

    var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), mat);
    plane.name = "faceDecal";
    plane.position.set(0, 0.02, 0.34);
    plane.visible = false;
    face.add(plane);

    function showTex(tex) {
        if (!tex) return;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.transparent = true;
        mat.opacity = 1;
        mat.alphaTest = 0.2;
        mat.needsUpdate = true;
        plane.visible = true;
    }

    // Prefer TextureLoader (works on https / PWA). Avoid crossOrigin on file:// so local tests work.
    function loadWithThree(url, onFail) {
        try {
            var loader = new THREE.TextureLoader();
            // only set CORS when not opening as a local file
            if (typeof location !== "undefined" && location.protocol !== "file:") {
                loader.setCrossOrigin("anonymous");
            }
            loader.load(
                url,
                function (tex) { showTex(tex); },
                undefined,
                function () { if (onFail) onFail(); }
            );
        } catch (e) {
            if (onFail) onFail();
        }
    }

    // Image + canvas fallback strips any leftover gray if an old Smile.png is cached
    function loadWithImage(url, onFail) {
        try {
            var img = new Image();
            if (typeof location !== "undefined" && location.protocol !== "file:") {
                img.crossOrigin = "anonymous";
            }
            img.onload = function () {
                try {
                    var c = document.createElement("canvas");
                    c.width = img.naturalWidth || img.width;
                    c.height = img.naturalHeight || img.height;
                    var ctx = c.getContext("2d");
                    ctx.clearRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0);
                    var data = ctx.getImageData(0, 0, c.width, c.height);
                    var px = data.data;
                    for (var i = 0; i < px.length; i += 4) {
                        var lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                        if (px[i + 3] < 15 || lum > 90) {
                            px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
                        } else {
                            px[i] = px[i + 1] = px[i + 2] = 12;
                            px[i + 3] = 255;
                        }
                    }
                    ctx.putImageData(data, 0, 0);
                    showTex(new THREE.CanvasTexture(c));
                } catch (e) {
                    // canvas tainted (common on file://) — try raw texture without process
                    try {
                        showTex(new THREE.Texture(img));
                        mat.map.needsUpdate = true;
                    } catch (e2) {
                        if (onFail) onFail();
                    }
                }
            };
            img.onerror = function () { if (onFail) onFail(); };
            img.src = url;
        } catch (e) {
            if (onFail) onFail();
        }
    }

    loadWithThree("Smile.png", function () {
        loadWithThree("./Smile.png", function () {
            loadWithImage("Smile.png", function () {
                loadWithImage("./Smile.png", function () {
                    console.warn("[Azora] Smile.png missing — face left blank (no white square)");
                });
            });
        });
    });

    return face;
}

function init3DAvatar() {
    const container = document.getElementById("avatar3d-canvas");
    if (!container) return;
    if (typeof THREE === "undefined") {
        console.warn("[Azora] Three.js not loaded — avatar preview unavailable");
        return;
    }

    while (container.firstChild) container.removeChild(container.firstChild);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 1.2, 4.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    avatarCharacterGroup = new THREE.Group();
    const characterGroup = avatarCharacterGroup;

    // Blocky head
    headMesh = makeBox(0.65, 0.65, 0.65, 0xffcc00);
    headMesh.position.y = 1.12;
    characterGroup.add(headMesh);

    // Simple face on front
    faceGroup = buildAvatarFace(0xffcc00);
    faceGroup.position.y = 1.12;
    characterGroup.add(faceGroup);

    // Blocky torso
    torsoMesh = makeBox(0.85, 1.0, 0.45, 0x1e60ff);
    torsoMesh.position.y = 0.3;
    characterGroup.add(torsoMesh);

    // Blocky arms
    leftArmMesh = makeBox(0.35, 1.0, 0.35, 0xffcc00);
    leftArmMesh.position.set(-0.62, 0.3, 0);
    characterGroup.add(leftArmMesh);

    rightArmMesh = makeBox(0.35, 1.0, 0.35, 0xffcc00);
    rightArmMesh.position.set(0.62, 0.3, 0);
    characterGroup.add(rightArmMesh);

    // Blocky legs
    leftLegMesh = makeBox(0.35, 1.0, 0.35, 0x00ebd4);
    leftLegMesh.position.set(-0.22, -0.7, 0);
    characterGroup.add(leftLegMesh);

    rightLegMesh = makeBox(0.35, 1.0, 0.35, 0x00ebd4);
    rightLegMesh.position.set(0.22, -0.7, 0);
    characterGroup.add(rightLegMesh);

    scene.add(characterGroup);

    function animate() {
        requestAnimationFrame(animate);
        if (avatarCharacterGroup) avatarCharacterGroup.rotation.y += 0.008;
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    animate();

    // Resize canvas when container size is known
    try {
        if (!window._azoraAvatarResizeBound) {
            window._azoraAvatarResizeBound = true;
            window.addEventListener("resize", function () {
                var c = document.getElementById("avatar3d-canvas");
                if (!c || !renderer || !camera) return;
                var w = c.clientWidth, h = Math.max(c.clientHeight, 1);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            });
        }
    } catch (e) {}

    try {
        if (typeof wireAvatarColorInputs === "function") wireAvatarColorInputs();
        setTimeout(function () {
            if (typeof loadAvatarFromStorage === "function") loadAvatarFromStorage();
            else if (localStorage.getItem("loggedIn") === "true" && typeof updateAvatarColors === "function") {
                updateAvatarColors();
            }
        }, 50);
        setTimeout(function () {
            if (typeof loadAvatarFromStorage === "function") loadAvatarFromStorage();
        }, 300);
    } catch (e) {}
}

function paintAvatarDefaults() {
    if (!headMesh) return;
    try {
        headMesh.material.color.set("#ffcc00");
        if (neckMesh) neckMesh.material.color.set("#ffcc00");
        if (torsoMesh) torsoMesh.material.color.set("#1e60ff");
        if (leftArmMesh) leftArmMesh.material.color.set("#ffcc00");
        if (rightArmMesh) rightArmMesh.material.color.set("#ffcc00");
        if (leftLegMesh) leftLegMesh.material.color.set("#00ebd4");
        if (rightLegMesh) rightLegMesh.material.color.set("#00ebd4");
        syncAvatarExtraColors("#ffcc00", "#1e60ff", "#ffcc00", "#ffcc00");
    } catch (e) {}
}

function syncAvatarExtraColors(head, torso, leftArm, rightArm) {
    if (!avatarCharacterGroup) return;
    avatarCharacterGroup.traverse(function (obj) {
        if (!obj.isMesh || !obj.material) return;
        if (obj.name === "nose" && head) obj.material.color.set(head);
        if (obj.name === "handL" && leftArm) obj.material.color.set(leftArm);
        if (obj.name === "handR" && rightArm) obj.material.color.set(rightArm);
        if ((obj.name === "shoulderL" || obj.name === "shoulderR") && torso) obj.material.color.set(torso);
    });
    if (neckMesh && head) neckMesh.material.color.set(head);
}

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
    if (saveBtn) {
        saveBtn.style.display = locked ? "none" : "block";
        saveBtn.disabled = !!locked;
    }
    ["colorHead","colorTorso","colorLeftArm","colorRightArm","colorLeftLeg","colorRightLeg"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.disabled = !!locked;
            // Guests / logged-out: block interaction even if CSS fails
            el.style.pointerEvents = locked ? "none" : "";
        }
    });
}

function isAvatarUnlocked() {
    return localStorage.getItem("loggedIn") === "true";
}

function refreshAvatarLock() {
    // Only real accounts can customize; guests and logged-out users cannot
    applyGuestAvatarLock(!isAvatarUnlocked());
}

function readAvatarColorInputs() {
    function v(id, fallback) {
        var el = document.getElementById(id);
        var x = el && el.value ? String(el.value).trim() : fallback;
        if (!x || x.charAt(0) !== "#") x = fallback;
        return x;
    }
    return {
        head: v("colorHead", "#ffcc00"),
        torso: v("colorTorso", "#1e60ff"),
        leftArm: v("colorLeftArm", "#ffcc00"),
        rightArm: v("colorRightArm", "#ffcc00"),
        leftLeg: v("colorLeftLeg", "#00ebd4"),
        rightLeg: v("colorRightLeg", "#00ebd4")
    };
}

function setAvatarColorInputs(avatar) {
    if (!avatar) return;
    var map = {
        colorHead: avatar.head || "#ffcc00",
        colorTorso: avatar.torso || "#1e60ff",
        colorLeftArm: avatar.leftArm || "#ffcc00",
        colorRightArm: avatar.rightArm || "#ffcc00",
        colorLeftLeg: avatar.leftLeg || "#00ebd4",
        colorRightLeg: avatar.rightLeg || "#00ebd4"
    };
    Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = map[id];
    });
}

/** Apply validated colors to live 3D meshes (returns true if applied) */
function applyColorsToMeshes(validated) {
    if (!validated) return false;
    if (!headMesh || !torsoMesh || !leftArmMesh || !rightArmMesh || !leftLegMesh || !rightLegMesh) {
        return false;
    }
    try {
        function paint(mesh, hex) {
            if (!mesh || !mesh.material) return;
            mesh.material.color.set(hex);
            mesh.material.needsUpdate = true;
        }
        paint(headMesh, validated.head);
        paint(torsoMesh, validated.torso);
        paint(leftArmMesh, validated.leftArm);
        paint(rightArmMesh, validated.rightArm);
        paint(leftLegMesh, validated.leftLeg);
        paint(rightLegMesh, validated.rightLeg);
        if (typeof syncAvatarExtraColors === "function") {
            syncAvatarExtraColors(validated.head, validated.torso, validated.leftArm, validated.rightArm);
        }
        return true;
    } catch (e) {
        console.warn("[Azora] applyColorsToMeshes failed", e);
        return false;
    }
}

function updateAvatarColors() {
    // Guests / logged-out cannot customize
    if (localStorage.getItem("loggedIn") !== "true") {
        return;
    }
    var raw = readAvatarColorInputs();
    var validated = moderateCharacterColors(
        raw.head, raw.torso, raw.leftArm, raw.rightArm, raw.leftLeg, raw.rightLeg
    );

    // If 3D not ready yet, retry shortly
    if (!applyColorsToMeshes(validated)) {
        setTimeout(function () {
            if (localStorage.getItem("loggedIn") === "true") {
                applyColorsToMeshes(validated);
            }
        }, 120);
        setTimeout(function () {
            if (localStorage.getItem("loggedIn") === "true") {
                applyColorsToMeshes(validated);
            }
        }, 400);
    }

    // Keep torso picker in sync if moderation changed it
    if (validated.wasModerated) {
        var torsoEl = document.getElementById("colorTorso");
        if (torsoEl) torsoEl.value = validated.torso;
    }

    var warning = document.getElementById("modWarning");
    if (warning) {
        warning.style.display = validated.wasModerated ? "block" : "none";
    }
}

function saveAvatar() {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("You need an account to customize or save avatars.\nCreate an account or log in to unlock this!");
        if (typeof openCreateAccount === "function") openCreateAccount();
        return;
    }

    var account = null;
    try {
        account = JSON.parse(localStorage.getItem("azoraAccount") || "null");
    } catch (e) {
        account = null;
    }
    if (!account || account.isGuest || !account.username) {
        alert("Please log in or create an account to save your custom 3D avatar!");
        if (typeof openCreateAccount === "function") openCreateAccount();
        return;
    }

    var raw = readAvatarColorInputs();
    var validated = moderateCharacterColors(
        raw.head, raw.torso, raw.leftArm, raw.rightArm, raw.leftLeg, raw.rightLeg
    );

    // Paint mesh immediately so user sees the result
    applyColorsToMeshes(validated);
    if (validated.wasModerated) {
        var torsoEl = document.getElementById("colorTorso");
        if (torsoEl) torsoEl.value = validated.torso;
        var warning = document.getElementById("modWarning");
        if (warning) warning.style.display = "block";
    }

    account.avatar = {
        head: validated.head,
        torso: validated.torso,
        leftArm: validated.leftArm,
        rightArm: validated.rightArm,
        leftLeg: validated.leftLeg,
        rightLeg: validated.rightLeg,
        face: "default"
    };

    try {
        localStorage.setItem("azoraAccount", JSON.stringify(account));
    } catch (e) {
        alert("Could not save avatar (storage full or blocked).");
        return;
    }

    // Keep multi-account store in sync so progress survives log out / log in
    try {
        if (account.username && typeof getSavedAccounts === "function" && typeof saveSavedAccounts === "function") {
            var map = getSavedAccounts();
            map[account.username] = account;
            saveSavedAccounts(map);
        }
    } catch (e) {}

    // Confirm by re-reading storage
    try {
        var check = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (!check.avatar || check.avatar.head !== validated.head) {
            console.warn("[Azora] Avatar save verification mismatch", check.avatar);
        }
    } catch (e) {}

    alert("3D Avatar saved successfully to your Azora account!");
}

/** Load saved avatar onto pickers + 3D model (safe to call multiple times) */
function loadAvatarFromStorage() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (acc && acc.avatar) {
            setAvatarColorInputs(acc.avatar);
        }
    } catch (e) {}
    if (localStorage.getItem("loggedIn") === "true") {
        updateAvatarColors();
    } else if (typeof paintAvatarDefaults === "function") {
        paintAvatarDefaults();
    }
}

function wireAvatarColorInputs() {
    ["colorHead","colorTorso","colorLeftArm","colorRightArm","colorLeftLeg","colorRightLeg"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.getAttribute("data-azora-wired") === "1") return;
        el.setAttribute("data-azora-wired", "1");
        el.addEventListener("input", function () { updateAvatarColors(); });
        el.addEventListener("change", function () { updateAvatarColors(); });
    });
    // Save uses onclick="saveAvatar()" in HTML — no second listener (avoids double alert)
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
// LOADING SCREEN (~3s average after Welcome / on app open)
// ============================================================
var _azoraLoadingTimer = null;
var _azoraLoadingProgressTimer = null;

function showAzoraLoadingScreen() {
    var el = document.getElementById("azoraLoadingScreen");
    if (!el) return;
    el.classList.add("show");
    el.style.display = "flex";
    el.setAttribute("aria-hidden", "false");
    var fill = document.getElementById("azoraLoadingBarFill");
    if (fill) fill.style.width = "0%";
    var hint = document.getElementById("azoraLoadingHint");
    var hints = [
        "Getting things ready…",
        "Loading avatars…",
        "Checking your session…",
        "Almost there…"
    ];
    var hi = 0;
    if (hint) hint.textContent = hints[0];
    var progress = 0;
    if (_azoraLoadingProgressTimer) clearInterval(_azoraLoadingProgressTimer);
    _azoraLoadingProgressTimer = setInterval(function () {
        progress += 8 + Math.random() * 12;
        if (progress > 96) progress = 96;
        if (fill) fill.style.width = progress + "%";
        hi++;
        if (hint && hi < hints.length) hint.textContent = hints[hi];
    }, 700);
}

function hideAzoraLoadingScreen() {
    var el = document.getElementById("azoraLoadingScreen");
    if (!el) return;
    var fill = document.getElementById("azoraLoadingBarFill");
    if (fill) fill.style.width = "100%";
    if (_azoraLoadingProgressTimer) {
        clearInterval(_azoraLoadingProgressTimer);
        _azoraLoadingProgressTimer = null;
    }
    setTimeout(function () {
        el.classList.remove("show");
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        if (fill) fill.style.width = "0%";
    }, 200);
}

/**
 * Show loading for ~3 seconds (2.5–3.5s range), then run onDone.
 */
function runAzoraLoadingThen(onDone) {
    showAzoraLoadingScreen();
    var ms = 2500 + Math.floor(Math.random() * 1000); // ~3s average
    if (_azoraLoadingTimer) clearTimeout(_azoraLoadingTimer);
    _azoraLoadingTimer = setTimeout(function () {
        hideAzoraLoadingScreen();
        setTimeout(function () {
            try { if (typeof onDone === "function") onDone(); } catch (e) {}
        }, 220);
    }, ms);
}

window.showAzoraLoadingScreen = showAzoraLoadingScreen;
window.hideAzoraLoadingScreen = hideAzoraLoadingScreen;
window.runAzoraLoadingThen = runAzoraLoadingThen;

// ============================================================
// APP START
// ============================================================
function dismissIntroSplash(openAccount) {
    var splash = document.getElementById("introSplash");
    if (!splash) return;
    splash.classList.add("fade-out");
    splash.style.transition = "opacity 0.6s ease";
    splash.style.opacity = "0";
    splash.style.pointerEvents = "none";
    setTimeout(function () {
        splash.style.display = "none";
        splash.style.visibility = "hidden";
        // After Welcome fades → loading screen (~3s), then account or main app
        runAzoraLoadingThen(function () {
            if (openAccount) {
                try {
                    if (typeof openCreateAccount === "function") openCreateAccount();
                    else {
                        var ov = document.getElementById("accountOverlay");
                        if (ov) ov.style.display = "flex";
                    }
                } catch (e) {}
            }
        });
    }, 650);
}

window.addEventListener("DOMContentLoaded", function () {
    var splash = document.getElementById("introSplash");
    var loggedIn = localStorage.getItem("loggedIn");

    // Returning account or guest: skip Welcome text, still show ~3s loading
    if (loggedIn === "true" || loggedIn === "guest") {
        if (splash) {
            splash.style.display = "none";
            splash.style.pointerEvents = "none";
            splash.style.visibility = "hidden";
        }
        // Hide account popup while loading
        try {
            var ov0 = document.getElementById("accountOverlay");
            if (ov0) ov0.style.display = "none";
        } catch (e) {}
        runAzoraLoadingThen(function () {
            try {
                if (typeof ensureGuestButtonsVisible === "function") ensureGuestButtonsVisible();
                if (typeof restoreAppSessionIfNeeded === "function") restoreAppSessionIfNeeded();
            } catch (e) {}
        });
    } else if (splash) {
        // First visit / logged out: Welcome → loading → join popup
        splash.style.display = "flex";
        splash.style.opacity = "1";
        setTimeout(function () {
            dismissIntroSplash(true);
        }, 6500);
        setTimeout(function () {
            if (splash && splash.style.display !== "none") {
                splash.style.opacity = "0";
                splash.style.display = "none";
                splash.style.pointerEvents = "none";
                runAzoraLoadingThen(function () {
                    try { if (typeof openCreateAccount === "function") openCreateAccount(); } catch (e) {}
                });
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
                if (typeof wireAvatarColorInputs === "function") wireAvatarColorInputs();
                if (typeof loadAvatarFromStorage === "function") {
                    loadAvatarFromStorage();
                    setTimeout(loadAvatarFromStorage, 200);
                    setTimeout(loadAvatarFromStorage, 600);
                } else if (account.avatar && typeof updateAvatarColors === "function") {
                    updateAvatarColors();
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
    if (typeof AZORA_TEMP_DISABLE_AZAFN !== "undefined" && AZORA_TEMP_DISABLE_AZAFN) {
        handleDisabledFeatureClick(window.event, document.getElementById("azafnButton"));
        return;
    }

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

        var playConfig = buildPlayConfig(description, finalDims);
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
            deleted: false,
            playConfig: playConfig,
            genre: playConfig.genre
        };
        loadAzaFnGames();
        azaFnGames.unshift(game);
        saveAzaFnGames();

        addAzaFnAIMessage(
            "Ok I have created the game for you! Explore this <strong>" + finalDims + "</strong> world.<br><br>🎮 <strong>" + escapeHtml(game.title) + "</strong><br>🗺️ <strong>" + escapeHtml(playConfig.summary || playConfig.theme) + "</strong><br>📦 Collect <strong>" + playConfig.goalCount + " " + escapeHtml(playConfig.collectName || "orb") + "s</strong><br><br>Press <strong>Play Game</strong> to explore."
        );
        renderAzaFnMessages();
        openGamePreview(game.id);
    }, 60000);
}


function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function buildPlayConfig(description, dimensions) {
    var d = (description || "").toLowerCase();
    var seed = hashString(d + "|" + (dimensions || "2D"));
    var rand = mulberry32(seed);

    // --- Theme (order matters: more specific first) ---
    var theme = "default";
    if (/\b(boat|ship|sinking|sink|yacht|ferry|raft|canoe|sail|vessel|submarine)\b/.test(d)) theme = "boat";
    else if (/\b(city|cities|urban|town|street|building|skyscraper|downtown|metropolis)\b/.test(d)) theme = "city";
    else if (/\b(space|planet|galaxy|alien|moon|starfield|orbit)\b/.test(d)) theme = "space";
    else if (/\b(forest|jungle|tree|nature|park|woods)\b/.test(d)) theme = "forest";
    else if (/\b(ocean|sea|beach|underwater|fish|island|water)\b/.test(d)) theme = "ocean";
    else if (/\b(snow|ice|winter|arctic|frozen)\b/.test(d)) theme = "snow";
    else if (/\b(desert|sand|cactus|dune)\b/.test(d)) theme = "desert";
    else if (/\b(castle|medieval|knight|kingdom)\b/.test(d)) theme = "castle";
    else if (/\b(farm|barn|animal|village)\b/.test(d)) theme = "farm";
    else if (/\b(volcano|lava|magma)\b/.test(d)) theme = "volcano";
    else if (/\b(night|neon|cyber|future)\b/.test(d)) theme = "neon";

    // --- Genre: only pick "survive/dodge" if user asked for it ---
    var genre = "explorer";
    if (/\b(platform|jump|runner|parkour)\b/.test(d)) genre = "platformer";
    else if (/\b(maze|labyrinth|puzzle)\b/.test(d)) genre = "maze";
    else if (/\b(dodge|avoid|asteroid)\b/.test(d)) genre = "dodger";
    else if (/\b(race|speed|car|drive|traffic)\b/.test(d)) genre = "racer";
    else if (/\b(fight|arena|battle|combat)\b/.test(d)) genre = "arena";
    else if (/\b(fly|flight|plane|bird)\b/.test(d)) genre = "flyer";
    else if (/\b(collect|coin|gem|treasure|pickup)\b/.test(d)) genre = "collector";
    else if (/\b(surviv|don't die|dont die|not die|stay alive)\b/.test(d)) genre = "dodger";
    else if (theme === "boat") genre = "boat_rescue"; // special: stay on boat / collect while it sinks feel
    else if (theme === "city" || theme === "forest" || theme === "castle" || theme === "ocean") genre = "explorer";
    // NEVER random into dodger — default explorer/collector
    else genre = rand() > 0.5 ? "explorer" : "collector";

    var collectName = "orb";
    if (/\b(coin|coins)\b/.test(d)) collectName = "coin";
    else if (/\b(gem|crystal|jewel)\b/.test(d)) collectName = "gem";
    else if (/\b(star|stars)\b/.test(d)) collectName = "star";
    else if (/\b(key|keys)\b/.test(d)) collectName = "key";
    else if (theme === "boat") collectName = "life-ring";
    else if (theme === "city") collectName = "package";
    else if (theme === "forest") collectName = "fruit";
    else if (theme === "ocean") collectName = "pearl";
    else if (theme === "space") collectName = "crystal";

    var mood = "day";
    if (/\b(night|dark|evening)\b/.test(d)) mood = "night";
    else if (/\b(sunset|dusk)\b/.test(d)) mood = "sunset";
    else if (/\b(rain|storm|sinking)\b/.test(d)) mood = "storm";

    var density = 1;
    if (/\b(huge|giant|massive|big|detailed|complex)\b/.test(d)) density = 1.45;
    else if (/\b(small|tiny|simple|mini)\b/.test(d)) density = 0.7;

    var themePalettes = {
        boat: ["#0c4a6e", "#38bdf8", "#fbbf24", "#082f49"],
        city: ["#334155", "#38bdf8", "#fbbf24", "#0f172a"],
        space: ["#1e1b4b", "#a78bfa", "#f0abfc", "#020617"],
        forest: ["#166534", "#86efac", "#facc15", "#052e16"],
        ocean: ["#0e7490", "#67e8f9", "#fde68a", "#082f49"],
        snow: ["#94a3b8", "#e2e8f0", "#38bdf8", "#1e293b"],
        desert: ["#d97706", "#fcd34d", "#fb923c", "#451a03"],
        castle: ["#57534e", "#a8a29e", "#fbbf24", "#1c1917"],
        farm: ["#65a30d", "#bef264", "#fdba74", "#14532d"],
        volcano: ["#7f1d1d", "#f97316", "#fde047", "#1c1917"],
        neon: ["#0f172a", "#22d3ee", "#e879f9", "#020617"],
        default: ["#1e60ff", "#00ebd4", "#ffcc00", "#0f172a"]
    };
    var palette = themePalettes[theme] || themePalettes.default;
    if (mood === "night" || mood === "storm") palette = [palette[0], palette[1], palette[2], "#020617"];

    var buildingCount = Math.round((theme === "city" ? 28 : theme === "castle" ? 12 : theme === "boat" ? 0 : 8) * density);
    var propCount = Math.round((14 + rand() * 10) * density);
    var goalCount = Math.round((theme === "boat" ? 6 : theme === "city" ? 7 : 5) + rand() * 5 * density);

    return {
        seed: seed,
        genre: genre,
        theme: theme,
        mood: mood,
        collectName: collectName,
        density: density,
        buildingCount: buildingCount,
        propCount: propCount,
        dimensions: dimensions === "3D" ? "3D" : "2D",
        colors: { primary: palette[0], secondary: palette[1], accent: palette[2], bg: palette[3] },
        goalCount: Math.max(4, Math.min(16, goalCount)),
        speed: 2.1 + rand() * 2.0,
        difficulty: (genre === "explorer" || genre === "boat_rescue" || theme === "city" || theme === "boat")
            ? 0.3 + rand() * 0.25
            : 0.55 + rand() * 0.8,
        summary: theme === "boat"
            ? ("sinking boat · collect " + collectName + "s")
            : (theme + " " + genre + " collecting " + collectName + "s")
    };
}
var _play = { running: false, raf: null, keys: {}, game: null, cfg: null, score: 0, won: false, lost: false, entities: [], player: null, canvas: null, ctx: null, renderer: null, scene: null, camera: null, meshPlayer: null, collectMeshes: [], _last: 0 };
function playCurrentPreview() { if (currentPreviewGameId) playAzoraGame(currentPreviewGameId); }
function playAzoraGame(gameId) {
    loadAzaFnGames();
    var game = azaFnGames.find(function (g) { return g.id === gameId; });
    if (!game) { alert("Game not found."); return; }
    if (!game.playConfig || !game.playConfig.theme) { game.playConfig = buildPlayConfig(game.description || game.title || "", game.dimensions || "2D"); game.genre = game.playConfig.genre; saveAzaFnGames(); }
    startGamePlay(game);
}
function startGamePlay(game) {
    stopGamePlayLoops();
    _play.game = game;
    _play.cfg = game.playConfig || buildPlayConfig(game.description || "", game.dimensions || "2D");
    _play.score = 0; _play.won = false; _play.lost = false; _play.running = true; _play.keys = {}; _play._last = 0;
    document.getElementById("gamePlayTitle").textContent = game.title || "Game";
    document.getElementById("gamePlayHudScore").textContent = "Score: 0";
    document.getElementById("gamePlayHudGoal").textContent = (_play.cfg.summary || (_play.cfg.theme + " " + _play.cfg.genre)) + " | Goal " + _play.cfg.goalCount + " " + (_play.cfg.collectName || "orb") + "s";
    document.getElementById("gamePlayHudHint").textContent = _play.cfg.dimensions === "3D" ? "WASD move | collect orbs | avoid red boxes" : "Arrows/WASD move | Space jump (platformer)";
    document.getElementById("gamePlayStatus").textContent = "Go!";
    document.getElementById("gamePlayOverlay").style.display = "flex";
    _play.canvas = document.getElementById("gamePlayCanvas");
    _play.ctx = _play.canvas.getContext("2d");
    window.addEventListener("keydown", _playKeyDown);
    window.addEventListener("keyup", _playKeyUp);
    if (_play.cfg.dimensions === "3D" && typeof THREE !== "undefined") initPlay3D();
    else initPlay2D();
    _play.raf = requestAnimationFrame(playLoop);
}
function restartGamePlay() { if (_play.game) startGamePlay(_play.game); }
function closeGamePlay() { stopGamePlayLoops(); var el = document.getElementById("gamePlayOverlay"); if (el) el.style.display = "none"; }
function stopGamePlayLoops() {
    _play.running = false;
    if (_play.raf) cancelAnimationFrame(_play.raf);
    _play.raf = null;
    window.removeEventListener("keydown", _playKeyDown);
    window.removeEventListener("keyup", _playKeyUp);
    if (_play.renderer) {
        try { var c = _play.renderer.domElement; if (c && c.parentNode) c.parentNode.removeChild(c); _play.renderer.dispose(); } catch (e) {}
    }
    _play.renderer = null; _play.scene = null; _play.camera = null; _play.meshPlayer = null; _play.collectMeshes = [];
    var canvas = document.getElementById("gamePlayCanvas"); if (canvas) canvas.style.display = "block";
}
function _playKeyDown(e) {
    _play.keys[e.key.toLowerCase()] = true;
    var k = e.key.toLowerCase();
    if (k === "arrowup" || k === "arrowdown" || k === "arrowleft" || k === "arrowright" || e.key === " ") e.preventDefault();
}
function _playKeyUp(e) { _play.keys[e.key.toLowerCase()] = false; }
function initPlay2D() {
    var canvas = _play.canvas; canvas.style.display = "block";
    var w = canvas.width, h = canvas.height, rand = mulberry32(_play.cfg.seed), genre = _play.cfg.genre;
    _play.player = { x: 60, y: h - 80, vx: 0, vy: 0, w: 28, h: 28, onGround: false };
    _play.entities = [];
    if (genre === "platformer") {
        _play.entities.push({ type: "plat", x: 0, y: h - 40, w: w, h: 40 });
        for (var i = 0; i < 6; i++) _play.entities.push({ type: "plat", x: 80 + i * 110 + rand() * 40, y: h - 120 - rand() * 200, w: 70 + rand() * 50, h: 16 });
        for (var c = 0; c < _play.cfg.goalCount; c++) _play.entities.push({ type: "coin", x: 100 + c * 90 + rand() * 30, y: 80 + rand() * (h - 200), r: 10, taken: false });
    } else if (genre === "maze") {
        _play.player.x = 40; _play.player.y = 40;
        for (var m = 0; m < 18; m++) { var horiz = rand() > 0.5; _play.entities.push({ type: "wall", x: rand() * (w - 100), y: rand() * (h - 100), w: horiz ? 80 + rand() * 120 : 16, h: horiz ? 16 : 80 + rand() * 120 }); }
        for (var g = 0; g < _play.cfg.goalCount; g++) _play.entities.push({ type: "coin", x: 60 + rand() * (w - 120), y: 60 + rand() * (h - 120), r: 10, taken: false });
    } else if (genre === "dodger") {
        _play.player.y = h - 70;
        for (var d = 0; d < 10; d++) _play.entities.push({ type: "hazard", x: rand() * w, y: -rand() * 400, w: 18 + rand() * 24, h: 18 + rand() * 24, vy: 2 + rand() * 3 * _play.cfg.difficulty });
        for (var k = 0; k < _play.cfg.goalCount; k++) _play.entities.push({ type: "coin", x: 40 + rand() * (w - 80), y: 40 + rand() * (h - 120), r: 10, taken: false });
    } else if (genre === "racer" || genre === "flyer") {
        _play.player.x = w / 2; _play.player.y = h - 80;
        for (var r = 0; r < 12; r++) _play.entities.push({ type: "hazard", x: rand() * w, y: -r * 80 - rand() * 40, w: 30, h: 30, vy: 3 + _play.cfg.speed * 0.5 });
        for (var o = 0; o < _play.cfg.goalCount; o++) _play.entities.push({ type: "coin", x: 40 + rand() * (w - 80), y: -o * 100 - 50, r: 12, taken: false, vy: 3 });
    } else if (genre === "boat_rescue" || _play.cfg.theme === "boat") {
        // Boat deck rectangle + life-rings in water
        _play.entities.push({ type: "plat", x: w * 0.22, y: h * 0.32, w: w * 0.56, h: h * 0.36 });
        for (var cabin = 0; cabin < 3; cabin++) {
            _play.entities.push({ type: "wall", x: w * 0.3 + cabin * 50, y: h * 0.38, w: 36, h: 28 });
        }
        for (var j = 0; j < _play.cfg.goalCount; j++) {
            _play.entities.push({ type: "coin", x: 40 + rand() * (w - 80), y: 40 + rand() * (h - 80), r: 12, taken: false });
        }
        for (var e = 0; e < 2; e++) {
            _play.entities.push({ type: "hazard", x: rand() * w, y: rand() * h, w: 18, h: 18, vx: (rand() - 0.5) * 1.2, vy: (rand() - 0.5) * 1.2 });
        }
    } else {
        // explorer / collector / city default — low hazard
        var hz = (_play.cfg.theme === "city" || genre === "explorer") ? 2 : 3;
        for (var j2 = 0; j2 < _play.cfg.goalCount; j2++) _play.entities.push({ type: "coin", x: 50 + rand() * (w - 100), y: 50 + rand() * (h - 100), r: 12, taken: false });
        for (var e2 = 0; e2 < hz; e2++) _play.entities.push({ type: "hazard", x: rand() * w, y: rand() * h, w: 22, h: 22, vx: (rand() - 0.5) * 2, vy: (rand() - 0.5) * 2 });
    }
}
function initPlay3D() {
    var canvas = _play.canvas; canvas.style.display = "none";
    var host = canvas.parentElement;
    var w = Math.min(960, host.clientWidth || 800); var h = Math.round(w * 0.6);
    var cfg = _play.cfg;
    var rand = mulberry32(cfg.seed);
    _play.scene = new THREE.Scene();
    _play.scene.background = new THREE.Color(cfg.colors.bg);
    if (cfg.mood === "night" || cfg.theme === "space" || cfg.theme === "neon") {
        _play.scene.fog = new THREE.FogExp2(cfg.colors.bg, 0.012);
    }
    _play.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 300);
    _play.camera.position.set(0, 12, 18);
    _play.renderer = new THREE.WebGLRenderer({ antialias: true });
    _play.renderer.setSize(w, h);
    _play.renderer.domElement.style.borderRadius = "12px";
    _play.renderer.domElement.style.border = "3px solid #1e60ff";
    host.insertBefore(_play.renderer.domElement, canvas);

    _play.scene.add(new THREE.AmbientLight(0xffffff, cfg.mood === "night" ? 0.35 : 0.55));
    var sun = new THREE.DirectionalLight(cfg.mood === "sunset" ? 0xffedd5 : 0xffffff, cfg.mood === "night" ? 0.4 : 0.95);
    sun.position.set(10, 22, 12);
    _play.scene.add(sun);
    if (cfg.mood === "night" || cfg.theme === "neon") {
        var neon = new THREE.PointLight(0x22d3ee, 1.2, 40);
        neon.position.set(0, 6, 0);
        _play.scene.add(neon);
    }

    // Ground by theme
    var floorColor = 0x1e293b;
    if (cfg.theme === "forest") floorColor = 0x14532d;
    else if (cfg.theme === "ocean") floorColor = 0x0e7490;
    else if (cfg.theme === "desert") floorColor = 0xd97706;
    else if (cfg.theme === "snow") floorColor = 0xe2e8f0;
    else if (cfg.theme === "city" || cfg.theme === "neon") floorColor = 0x1e293b;
    else if (cfg.theme === "volcano") floorColor = 0x292524;
    var floor = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 60), new THREE.MeshLambertMaterial({ color: floorColor }));
    floor.position.y = -0.5;
    _play.scene.add(floor);

    // === Detailed scenery ===
    if (cfg.theme === "boat") {
        // Ocean water surface
        var water = new THREE.Mesh(
            new THREE.BoxGeometry(70, 0.4, 70),
            new THREE.MeshLambertMaterial({ color: 0x0369a1 })
        );
        water.position.y = -0.2;
        _play.scene.add(water);
        // Waves
        for (var wv = 0; wv < 16; wv++) {
            var wave = new THREE.Mesh(
                new THREE.BoxGeometry(4 + rand() * 6, 0.25, 1.2),
                new THREE.MeshLambertMaterial({ color: 0x38bdf8 })
            );
            wave.position.set((rand() - 0.5) * 50, 0.15, (rand() - 0.5) * 50);
            _play.scene.add(wave);
        }
        // Main boat hull
        var hull = new THREE.Mesh(
            new THREE.BoxGeometry(10, 1.4, 4),
            new THREE.MeshLambertMaterial({ color: 0x92400e })
        );
        hull.position.set(0, 0.5, 0);
        // slight tilt = "sinking" feel
        hull.rotation.z = -0.12;
        hull.rotation.x = 0.05;
        _play.scene.add(hull);
        var cabin = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 2, 3.2),
            new THREE.MeshLambertMaterial({ color: 0xf5f5f4 })
        );
        cabin.position.set(-1.5, 1.8, 0);
        cabin.rotation.z = -0.12;
        _play.scene.add(cabin);
        // mast
        var mast = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 5, 0.25),
            new THREE.MeshLambertMaterial({ color: 0x44403c })
        );
        mast.position.set(2, 3.2, 0);
        mast.rotation.z = -0.12;
        _play.scene.add(mast);
        // floating debris crates
        for (var cr = 0; cr < 8; cr++) {
            var crate = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshLambertMaterial({ color: 0xb45309 })
            );
            crate.position.set((rand() - 0.5) * 30, 0.4, (rand() - 0.5) * 30);
            _play.scene.add(crate);
        }
        // rocks / icebergs
        for (var rk = 0; rk < 6; rk++) {
            var rock = new THREE.Mesh(
                new THREE.BoxGeometry(2 + rand() * 2, 1 + rand(), 2 + rand() * 2),
                new THREE.MeshLambertMaterial({ color: 0x57534e })
            );
            rock.position.set((rand() - 0.5) * 40, 0.3, (rand() - 0.5) * 40);
            if (Math.abs(rock.position.x) < 6 && Math.abs(rock.position.z) < 4) rock.position.x += 12;
            _play.scene.add(rock);
        }
    } else if (cfg.theme === "city" || cfg.theme === "neon") {
        // road grid
        for (var r = -2; r <= 2; r++) {
            var roadZ = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 60), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
            roadZ.position.set(r * 12, 0.04, 0); _play.scene.add(roadZ);
            var roadX = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 6), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
            roadX.position.set(0, 0.04, r * 12); _play.scene.add(roadX);
        }
        // street lines
        for (var ln = -2; ln <= 2; ln++) {
            for (var seg = 0; seg < 8; seg++) {
                var line = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.13, 2), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
                line.position.set(ln * 12, 0.08, -24 + seg * 7 + (rand() * 1.5));
                _play.scene.add(line);
            }
        }
        var bCount = cfg.buildingCount || 28;
        for (var bi = 0; bi < bCount; bi++) {
            var bw = 2 + rand() * 4, bh = 5 + rand() * 16, bd = 2 + rand() * 4;
            var bcol = cfg.theme === "neon" ? (rand() > 0.5 ? 0x312e81 : 0x1e3a5f) : (rand() > 0.5 ? 0x64748b : 0x475569);
            var building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshLambertMaterial({ color: bcol }));
            var gx = Math.floor((rand() - 0.5) * 5);
            var gz = Math.floor((rand() - 0.5) * 5);
            var px = gx * 12 + (rand() - 0.5) * 5;
            var pz = gz * 12 + (rand() - 0.5) * 5;
            // avoid exact road centers slightly
            if (Math.abs(px) < 3.5) px += 5;
            if (Math.abs(pz) < 3.5) pz += 5;
            building.position.set(px, bh / 2, pz);
            _play.scene.add(building);
            // window glow
            if (bh > 6 && (cfg.mood === "night" || cfg.theme === "neon" || rand() > 0.4)) {
                var win = new THREE.Mesh(
                    new THREE.BoxGeometry(bw * 0.75, bh * 0.55, 0.15),
                    new THREE.MeshLambertMaterial({ color: 0xfde68a, emissive: 0xb45309 })
                );
                win.position.set(px, bh * 0.4, pz + bd * 0.5);
                _play.scene.add(win);
            }
        }
        // traffic cones / street props
        for (var pr = 0; pr < (cfg.propCount || 10); pr++) {
            var cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0xf97316 }));
            cone.position.set((rand() - 0.5) * 40, 0.45, (rand() - 0.5) * 40);
            _play.scene.add(cone);
        }
    } else if (cfg.theme === "forest") {
        for (var t = 0; t < 35 * (cfg.density || 1); t++) {
            var tx = (rand() - 0.5) * 48, tz = (rand() - 0.5) * 48;
            if (Math.abs(tx) < 3 && Math.abs(tz) < 3) tx += 7;
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x78350f }));
            var leaves = new THREE.Mesh(new THREE.SphereGeometry(1.1 + rand() * 0.6, 8, 8), new THREE.MeshLambertMaterial({ color: rand() > 0.3 ? 0x16a34a : 0x15803d }));
            trunk.position.set(tx, 1.1, tz); leaves.position.set(tx, 2.7, tz);
            _play.scene.add(trunk); _play.scene.add(leaves);
        }
    } else if (cfg.theme === "space") {
        for (var s = 0; s < 70; s++) {
            var star = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rand() * 0.08, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            star.position.set((rand() - 0.5) * 80, 3 + rand() * 30, (rand() - 0.5) * 80);
            _play.scene.add(star);
        }
        for (var pl = 0; pl < 5; pl++) {
            var planet = new THREE.Mesh(new THREE.SphereGeometry(1 + rand() * 2, 12, 12), new THREE.MeshLambertMaterial({ color: rand() > 0.5 ? 0x818cf8 : 0xf472b6 }));
            planet.position.set((rand() - 0.5) * 40, 4 + rand() * 8, (rand() - 0.5) * 40);
            _play.scene.add(planet);
        }
    } else if (cfg.theme === "castle") {
        for (var tw = 0; tw < 8; tw++) {
            var tower = new THREE.Mesh(new THREE.BoxGeometry(3, 8 + rand() * 6, 3), new THREE.MeshLambertMaterial({ color: 0x78716c }));
            tower.position.set((rand() - 0.5) * 30, 5, (rand() - 0.5) * 30);
            _play.scene.add(tower);
        }
    } else if (cfg.theme === "volcano") {
        var vol = new THREE.Mesh(new THREE.ConeGeometry(8, 10, 10), new THREE.MeshLambertMaterial({ color: 0x44403c }));
        vol.position.set(12, 5, -10); _play.scene.add(vol);
        var lava = new THREE.Mesh(new THREE.CircleGeometry(2, 12), new THREE.MeshLambertMaterial({ color: 0xf97316, emissive: 0x9a3412 }));
        lava.rotation.x = -Math.PI / 2; lava.position.set(12, 9.2, -10); _play.scene.add(lava);
    } else {
        for (var p = 0; p < (cfg.propCount || 12); p++) {
            var rock = new THREE.Mesh(new THREE.BoxGeometry(1 + rand(), 0.5 + rand(), 1 + rand()), new THREE.MeshLambertMaterial({ color: 0x64748b }));
            rock.position.set((rand() - 0.5) * 35, 0.4, (rand() - 0.5) * 35);
            _play.scene.add(rock);
        }
    }

    // Player
    _play.meshPlayer = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 1), new THREE.MeshLambertMaterial({ color: cfg.colors.accent }));
    // Box height 1.4 → center at 0.7 sits on y=0 ground
    _play.meshPlayer.position.set(0, 0.7, 0);
    _play.scene.add(_play.meshPlayer);

    // Collectibles
    _play.collectMeshes = [];
    for (var i = 0; i < cfg.goalCount; i++) {
        var shape = (cfg.collectName === "package")
            ? new THREE.BoxGeometry(0.7, 0.7, 0.7)
            : new THREE.SphereGeometry(0.45, 12, 12);
        var orb = new THREE.Mesh(shape, new THREE.MeshLambertMaterial({ color: cfg.colors.secondary, emissive: cfg.colors.secondary }));
        var ox = (rand() - 0.5) * 42, oz = (rand() - 0.5) * 42;
        if (Math.abs(ox) < 2 && Math.abs(oz) < 2) ox += 7;
        orb.position.set(ox, 0.55, oz);
        orb.userData.taken = false; orb.userData.hazard = false;
        _play.scene.add(orb); _play.collectMeshes.push(orb);
    }

    // Sparse hazards for explorer themes
    var hazardCount = 2;
    if (cfg.genre === "dodger" || cfg.genre === "arena" || cfg.genre === "racer") hazardCount = 7;
    else if (cfg.genre === "explorer" || cfg.genre === "boat_rescue" || cfg.theme === "city" || cfg.theme === "boat") hazardCount = 2;
    else hazardCount = 3;
    for (var o = 0; o < hazardCount; o++) {
        var box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), new THREE.MeshLambertMaterial({ color: 0xef4444 }));
        var hx = (rand() - 0.5) * 36, hz = (rand() - 0.5) * 36;
        if (Math.abs(hx) < 6 && Math.abs(hz) < 6) hx += 12;
        box.position.set(hx, 0.6, hz);
        box.userData.hazard = true; box.userData.taken = false;
        _play.scene.add(box); _play.collectMeshes.push(box);
    }
}

function playLoop(now) {
    if (!_play.running) return;
    var dt = Math.min(32, now - (_play._last || now)) / 16.67; _play._last = now;
    if (_play.cfg.dimensions === "3D" && _play.renderer) { updatePlay3D(dt); _play.renderer.render(_play.scene, _play.camera); }
    else { updatePlay2D(dt); drawPlay2D(); }
    document.getElementById("gamePlayHudScore").textContent = "Score: " + _play.score;
    if (_play.score >= _play.cfg.goalCount && !_play.won) { _play.won = true; document.getElementById("gamePlayStatus").textContent = "You win! Score " + _play.score; }
    if (_play.lost) document.getElementById("gamePlayStatus").textContent = "Hit a hazard! Press Restart.";
    _play.raf = requestAnimationFrame(playLoop);
}
function updatePlay2D(dt) {
    if (_play.won || _play.lost) return;
    var p = _play.player, speed = _play.cfg.speed * 1.6;
    var left = _play.keys["arrowleft"] || _play.keys["a"], right = _play.keys["arrowright"] || _play.keys["d"];
    var up = _play.keys["arrowup"] || _play.keys["w"] || _play.keys[" "], down = _play.keys["arrowdown"] || _play.keys["s"];
    p.vx = 0; if (left) p.vx = -speed; if (right) p.vx = speed;
    var genre = _play.cfg.genre;
    if (genre === "platformer") {
        p.vy += 0.55 * dt; if (up && p.onGround) { p.vy = -11; p.onGround = false; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.onGround = false;
        _play.entities.forEach(function (e) {
            if (e.type === "plat" && p.x < e.x + e.w && p.x + p.w > e.x && p.y + p.h > e.y && p.y + p.h < e.y + e.h + 12 && p.vy >= 0) { p.y = e.y - p.h; p.vy = 0; p.onGround = true; }
        });
    } else if (genre === "flyer" || genre === "racer") {
        if (up) p.y -= speed * dt; if (down) p.y += speed * dt; p.x += p.vx * dt;
        _play.entities.forEach(function (e) { if (e.vy) { e.y += e.vy * dt; if (e.y > _play.canvas.height + 40) { e.y = -40; e.x = Math.random() * _play.canvas.width; } } });
    } else {
        if (up) p.y -= speed * dt; if (down) p.y += speed * dt; p.x += p.vx * dt;
        _play.entities.forEach(function (e) {
            if (e.type === "hazard") {
                if (e.vx || e.vy) { e.x += (e.vx || 0) * dt; e.y += (e.vy || 0) * dt; if (e.x < 0 || e.x > _play.canvas.width) e.vx *= -1; if (e.y < 0 || e.y > _play.canvas.height) e.vy *= -1; }
                if (e.vy && !e.vx) { e.y += e.vy * dt; if (e.y > _play.canvas.height) { e.y = -30; e.x = Math.random() * _play.canvas.width; } }
            }
        });
    }
    p.x = Math.max(0, Math.min(_play.canvas.width - p.w, p.x));
    p.y = Math.max(0, Math.min(_play.canvas.height - p.h, p.y));
    _play.entities.forEach(function (e) {
        if (e.type === "coin" && !e.taken && p.x < e.x + e.r && p.x + p.w > e.x - e.r && p.y < e.y + e.r && p.y + p.h > e.y - e.r) { e.taken = true; _play.score++; }
        if (e.type === "hazard" && p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) _play.lost = true;
        if (e.type === "wall" && p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) { p.x -= p.vx * dt * 2; }
    });
}
function drawPlay2D() {
    var ctx = _play.ctx, w = _play.canvas.width, h = _play.canvas.height, c = _play.cfg.colors;
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.08; ctx.fillStyle = c.primary;
    for (var i = 0; i < 20; i++) ctx.fillRect((i * 97 + _play.cfg.seed) % w, (i * 53 + _play.cfg.seed * 2) % h, 40, 40);
    ctx.globalAlpha = 1;
    _play.entities.forEach(function (e) {
        if (e.type === "plat") { ctx.fillStyle = c.primary; ctx.fillRect(e.x, e.y, e.w, e.h); }
        else if (e.type === "wall") { ctx.fillStyle = "#475569"; ctx.fillRect(e.x, e.y, e.w, e.h); }
        else if (e.type === "coin" && !e.taken) { ctx.beginPath(); ctx.fillStyle = c.accent; ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); }
        else if (e.type === "hazard") { ctx.fillStyle = "#ef4444"; ctx.fillRect(e.x, e.y, e.w, e.h); }
    });
    var p = _play.player; ctx.fillStyle = c.secondary; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#fff"; ctx.fillRect(p.x + 6, p.y + 8, 6, 6); ctx.fillRect(p.x + 16, p.y + 8, 6, 6);
}
function updatePlay3D(dt) {
    if (_play.won || _play.lost || !_play.meshPlayer) return;
    var speed = _play.cfg.speed * 0.12, p = _play.meshPlayer.position;
    if (_play.keys["a"] || _play.keys["arrowleft"]) p.x -= speed * dt * 3;
    if (_play.keys["d"] || _play.keys["arrowright"]) p.x += speed * dt * 3;
    if (_play.keys["w"] || _play.keys["arrowup"]) p.z -= speed * dt * 3;
    if (_play.keys["s"] || _play.keys["arrowdown"]) p.z += speed * dt * 3;
    p.x = Math.max(-18, Math.min(18, p.x)); p.z = Math.max(-18, Math.min(18, p.z));
    _play.camera.position.set(p.x, 8, p.z + 12); _play.camera.lookAt(p.x, 0, p.z);
    _play.collectMeshes.forEach(function (m) {
        if (m.userData.taken) return;
        if (m.userData.hazard) { var dx = m.position.x - p.x, dz = m.position.z - p.z; if (dx * dx + dz * dz < 1.6) _play.lost = true; return; }
        m.rotation.y += 0.05 * dt;
        var dx2 = m.position.x - p.x, dz2 = m.position.z - p.z;
        if (dx2 * dx2 + dz2 * dz2 < 1.3) { m.userData.taken = true; m.visible = false; _play.score++; }
    });
}
window.playCurrentPreview = playCurrentPreview;
window.playAzoraGame = playAzoraGame;
window.restartGamePlay = restartGamePlay;
window.closeGamePlay = closeGamePlay;

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
                '<button class="game-action-btn" onclick="playAzoraGame(\'' + game.id + '\')">▶️ Play</button>' +
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
                '<button class="game-action-btn" onclick="playAzoraGame(\'' + game.id + '\')">▶️ Play</button>' +
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
    // owner badge applied after render via hook below

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
var currentAIChatId = null;

function getAIChatStore() {
    try {
        var s = JSON.parse(localStorage.getItem("azoraAIChats") || "null");
        if (s && Array.isArray(s.chats)) return s;
    } catch (e) {}
    return { chats: [], activeId: null };
}
function saveAIChatStore(store) {
    localStorage.setItem("azoraAIChats", JSON.stringify(store));
}
function ensureActiveAIChat() {
    var store = getAIChatStore();
    if (!store.chats.length) {
        var id = "ai_" + Date.now();
        store.chats.push({
            id: id,
            title: "Chat 1",
            messages: [],
            updatedAt: Date.now()
        });
        store.activeId = id;
        saveAIChatStore(store);
    }
    if (!store.activeId || !store.chats.some(function (c) { return c.id === store.activeId; })) {
        store.activeId = store.chats[0].id;
        saveAIChatStore(store);
    }
    currentAIChatId = store.activeId;
    return store;
}
function getActiveAIChat() {
    var store = ensureActiveAIChat();
    for (var i = 0; i < store.chats.length; i++) {
        if (store.chats[i].id === store.activeId) return store.chats[i];
    }
    return store.chats[0];
}
function setActiveAIChat(id) {
    var store = getAIChatStore();
    if (!store.chats.some(function (c) { return c.id === id; })) return;
    store.activeId = id;
    currentAIChatId = id;
    saveAIChatStore(store);
}
function startNewAIChat() {
    var store = getAIChatStore();
    var n = store.chats.length + 1;
    var id = "ai_" + Date.now();
    store.chats.unshift({
        id: id,
        title: "Chat " + n,
        messages: [],
        updatedAt: Date.now()
    });
    store.activeId = id;
    currentAIChatId = id;
    saveAIChatStore(store);
    selectChatFriend(AZORA_AI_ID);
    renderAIChatHistoryList();
}
function deleteAIChat(id, ev) {
    if (ev) ev.stopPropagation();
    var store = getAIChatStore();
    if (store.chats.length <= 1) {
        // reset the only chat
        store.chats[0].messages = [];
        store.chats[0].title = "Chat 1";
        store.chats[0].updatedAt = Date.now();
        saveAIChatStore(store);
        if (isAIChat()) renderChatMessages();
        renderAIChatHistoryList();
        return;
    }
    store.chats = store.chats.filter(function (c) { return c.id !== id; });
    if (store.activeId === id) store.activeId = store.chats[0].id;
    currentAIChatId = store.activeId;
    saveAIChatStore(store);
    if (isAIChat()) {
        renderChatMessages();
        var ai = getAICompanion();
        var chat = getActiveAIChat();
        document.getElementById("chatWithLabel").textContent = "Chat with " + ai.name + " — " + (chat.title || "AI");
    }
    renderAIChatHistoryList();
}
function renderAIChatHistoryList() {
    var box = document.getElementById("aiChatHistoryList");
    if (!box) return;
    var store = ensureActiveAIChat();
    // Newest activity first
    var chats = store.chats.slice().sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    box.innerHTML = "";
    if (!chats.length) {
        box.innerHTML = "<p style=\"color:rgba(255,255,255,0.55);font-size:11px;padding:6px;\">No AI chats yet. Send a message or tap New AI chat.</p>";
        return;
    }
    chats.forEach(function (c) {
        var item = document.createElement("div");
        item.className = "ai-history-item" + (c.id === store.activeId && currentChatFriend === AZORA_AI_ID ? " active" : "");
        item.title = "Click once to open this old AI chat";

        var title = c.title || "Chat";
        var lastTs = c.updatedAt || null;
        if (c.messages && c.messages.length) {
            var last = c.messages[c.messages.length - 1];
            if (last && last.text) title = String(last.text).slice(0, 28);
            if (last && last.at) lastTs = last.at;
        }

        var meta = document.createElement("div");
        meta.className = "ai-history-meta";
        var titleEl = document.createElement("span");
        titleEl.className = "ai-history-title";
        titleEl.textContent = title;
        var timeEl = document.createElement("small");
        timeEl.className = "ai-history-time";
        timeEl.textContent = formatLastTalked(lastTs);
        meta.appendChild(titleEl);
        meta.appendChild(timeEl);

        var del = document.createElement("button");
        del.type = "button";
        del.textContent = "✕";
        del.title = "Delete this AI chat";
        del.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            deleteAIChat(c.id, e);
        };

        item.appendChild(meta);
        item.appendChild(del);

        // One click loads the full old AI chat
        item.onclick = function () {
            setActiveAIChat(c.id);
            currentChatFriend = AZORA_AI_ID;
            clearChatTyping();
            if (chatAiReplyTimer) {
                clearTimeout(chatAiReplyTimer);
                chatAiReplyTimer = null;
            }
            var ai = getAICompanion();
            var chat = getActiveAIChat();
            document.getElementById("chatWithLabel").textContent =
                "Chat with " + ai.name + " (AI) — " + (chat.title || "Chat") +
                " · " + formatLastTalked(chat.updatedAt || lastTs);
            document.getElementById("chatInputRow").style.display = "flex";
            renderAIChatHistoryList();
            updateAICompanionListItem();
            renderFriendsList();
            renderChatMessages();
        };
        box.appendChild(item);
    });
}

// Player message archives (kept even if live chat is cleared)
function getChatArchives() {
    try {
        return JSON.parse(localStorage.getItem("azoraChatArchives") || "{}");
    } catch (e) { return {}; }
}
function saveChatArchives(map) {
    localStorage.setItem("azoraChatArchives", JSON.stringify(map));
}
function archivePlayerMessage(friendKey, entry) {
    var map = getChatArchives();
    if (!map[friendKey]) map[friendKey] = [];
    map[friendKey].push(entry);
    // cap per thread
    if (map[friendKey].length > 500) map[friendKey] = map[friendKey].slice(-500);
    saveChatArchives(map);
}
function openChatArchives() {
    var body = document.getElementById("chatArchivesBody");
    var map = getChatArchives();
    var keys = Object.keys(map);
    if (!keys.length) {
        body.innerHTML = "<p style='color:#666;'>No archived friend messages yet. Messages you send to friends are stored here automatically.</p>";
    } else {
        body.innerHTML = keys.map(function (k) {
            var lines = (map[k] || []).slice().reverse().slice(0, 40).map(function (m) {
                return "<div class='archive-line'><strong>" + escapeHtml(m.from) + ":</strong> " +
                    escapeHtml(m.text) + "<time>" + (m.at ? new Date(m.at).toLocaleString() : "") + "</time></div>";
            }).join("");
            return "<div class='archive-block'><h4>" + escapeHtml(k) + "</h4>" + lines + "</div>";
        }).join("");
    }
    document.getElementById("chatArchivesOverlay").style.display = "flex";
}
function closeChatArchives() {
    var el = document.getElementById("chatArchivesOverlay");
    if (el) el.style.display = "none";
}
window.startNewAIChat = startNewAIChat;
window.deleteAIChat = deleteAIChat;
window.openChatArchives = openChatArchives;
window.closeChatArchives = closeChatArchives;


function getAICompanion() {
    var def = {
        name: "Aza",
        personality: "friendly",
        head: "#ffcc00",
        body: "#a78bfa",
        accent: "#00ebd4",
        apiKey: "",
        useOpenEnded: true
    };
    try {
        var saved = JSON.parse(localStorage.getItem("azoraAICompanion") || "null");
        if (saved && typeof saved === "object") {
            return {
                name: (saved.name || def.name).toString().slice(0, 24),
                personality: saved.personality || def.personality,
                head: saved.head || def.head,
                body: saved.body || def.body,
                accent: saved.accent || def.accent,
                apiKey: saved.apiKey || localStorage.getItem("azoraAIApiKey") || "",
                useOpenEnded: saved.useOpenEnded !== false
            };
        }
    } catch (e) {}
    def.apiKey = localStorage.getItem("azoraAIApiKey") || "";
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
    var keyEl = document.getElementById("aiCompApiKey");
    if (keyEl) keyEl.value = ai.apiKey || "";
    var useEl = document.getElementById("aiCompUseOpenAI");
    if (useEl) useEl.checked = ai.useOpenEnded !== false;
    var st = document.getElementById("aiApiStatus");
    if (st) {
        if (ai.useOpenEnded === false) {
            st.textContent = "Open-ended AI is turned off. Only simple replies will be used.";
            st.style.color = "#666";
        } else if (ai.apiKey) {
            st.textContent = "Open-ended AI: Gemini key saved (this device).";
            st.style.color = "#059669";
        } else {
            st.textContent = "Open-ended AI: free mode (no key needed).";
            st.style.color = "#059669";
        }
    }
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
    var apiKey = (document.getElementById("aiCompApiKey") && document.getElementById("aiCompApiKey").value || "").trim();
    var useOpen = document.getElementById("aiCompUseOpenAI")
        ? document.getElementById("aiCompUseOpenAI").checked
        : true;
    saveAICompanion({
        name: name,
        personality: document.getElementById("aiCompPersonality").value || "friendly",
        head: document.getElementById("aiCompHead").value,
        body: document.getElementById("aiCompBody").value,
        accent: document.getElementById("aiCompAccent").value,
        apiKey: apiKey,
        useOpenEnded: useOpen
    });
    if (apiKey) localStorage.setItem("azoraAIApiKey", apiKey);
    else localStorage.removeItem("azoraAIApiKey");
    closeAICompanionSettings();
    updateAICompanionListItem();
    if (document.getElementById("chatOverlay").style.display === "flex") {
        renderFriendsList();
        if (isAIChat()) {
            document.getElementById("chatWithLabel").textContent = "Chat with " + name + " (AI)";
        }
    }
    alert(useOpen
        ? ("AI saved! Open-ended mode ON" + (apiKey ? " (Gemini key)" : " (free)") + ". Name: " + name)
        : ("AI saved! Simple replies only. Name: " + name));
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
    ensureActiveAIChat();
    renderFriendsList();
    renderAIChatHistoryList();
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
            if (small) {
            try {
                var ac = getActiveAIChat();
                var ts = ac && ac.updatedAt ? ac.updatedAt : null;
                if (ac && ac.messages && ac.messages.length && ac.messages[ac.messages.length - 1].at) {
                    ts = ac.messages[ac.messages.length - 1].at;
                }
                small.textContent = formatLastTalked(ts);
            } catch (e) {
                small.textContent = "AI Companion · Tap to chat";
            }
        }
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
        var last = getFriendLastTalked(friend);
        item.innerHTML =
            '<div class="friend-avatar">' + String(friend)[0].toUpperCase() + '</div>' +
            '<div class="friend-meta"><span>' + escapeHtml(friend) + '</span><small>' +
            escapeHtml(formatLastTalked(last)) + '</small></div>';
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
        ensureActiveAIChat();
        var ai = getAICompanion();
        var chat = getActiveAIChat();
        var lastTs = chat.updatedAt || null;
        if (chat.messages && chat.messages.length) {
            var lm = chat.messages[chat.messages.length - 1];
            if (lm && lm.at) lastTs = lm.at;
        }
        document.getElementById("chatWithLabel").textContent =
            "Chat with " + ai.name + " (AI) — " + (chat.title || "Chat") +
            " · " + formatLastTalked(lastTs);
        renderAIChatHistoryList();
    } else {
        var fl = getFriendLastTalked(friend);
        document.getElementById("chatWithLabel").textContent =
            "Chat with " + friend + " · " + formatLastTalked(fl);
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

    var messages = [];
    var me = getChatSenderId();

    if (currentChatFriend === AZORA_AI_ID) {
        var chat = getActiveAIChat();
        messages = (chat && chat.messages) ? chat.messages : [];
    } else {
        var key = getChatKey(me, currentChatFriend);
        try { messages = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
        // Live friend chat intentionally does not emphasize long history —
        // full record lives in Archives. Show recent messages only (last 30).
        if (messages.length > 30) messages = messages.slice(-30);
    }

    box.innerHTML = "";
    if (messages.length === 0) {
        var ai = getAICompanion();
        var hint = isAIChat()
            ? ("New chat with " + ai.name + ". Ask about Azora rules, games, jokes, science, and more!")
            : "Send a message. Full history is kept in Message Archives.";
        box.innerHTML = '<p style="color:rgba(255,255,255,0.6);text-align:center;margin-top:40px;">' + escapeHtml(hint) + '</p>';
        return;
    }
    messages.forEach(function (m, idx) {
        var div = document.createElement("div");
        var mine = (m.from === me || m.from === getMyUsername() || m.from === "Guest");
        if (m.from === AZORA_AI_ID || m.isAI) mine = false;
        div.className = "chat-bubble " + (mine ? "mine" : "theirs");
        div.textContent = m.text;
        // Friend chats: allow removing from live view (stays in archives)
        if (!isAIChat() && mine) {
            div.title = "Double-click to remove from live chat (stays in Archives)";
            div.style.cursor = "pointer";
            div.ondblclick = (function (messageIndex) {
                return function () {
                    removeLiveFriendMessage(messageIndex);
                };
            })(idx);
        }
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function removeLiveFriendMessage(visibleIndex) {
    if (isAIChat() || !currentChatFriend) return;
    var me = getChatSenderId();
    var key = getChatKey(me, currentChatFriend);
    var messages = [];
    try { messages = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    // visible list is last 30 — map back
    var start = Math.max(0, messages.length - 30);
    var realIndex = start + visibleIndex;
    if (realIndex < 0 || realIndex >= messages.length) return;
    messages.splice(realIndex, 1);
    localStorage.setItem(key, JSON.stringify(messages));
    renderChatMessages();
}

function aiReplyDelayMs(userText) {
    var len = (userText || "").length;
    var t = 3000 + Math.min(2000, len * 25);
    return Math.max(3000, Math.min(5000, t));
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pad2(n) {
    n = Math.floor(Number(n) || 0);
    return (n < 10 ? "0" : "") + n;
}
/** Format: last talked M/DD/YYYY at HH:MM:SS */
function formatLastTalked(ts) {
    if (!ts) return "last talked — never";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "last talked — never";
    var month = d.getMonth() + 1;
    var day = pad2(d.getDate());
    var year = d.getFullYear();
    var h = pad2(d.getHours());
    var m = pad2(d.getMinutes());
    var s = pad2(d.getSeconds());
    return "last talked " + month + "/" + day + "/" + year + " at " + h + ":" + m + ":" + s;
}
function getFriendLastTalked(friend) {
    try {
        var me = getChatSenderId();
        var key = getChatKey(me, friend);
        var messages = JSON.parse(localStorage.getItem(key) || "[]");
        if (messages.length) return messages[messages.length - 1].at || null;
    } catch (e) {}
    // archives fallback
    try {
        var map = getChatArchives();
        var arr = map["with:" + friend] || [];
        if (arr.length) return arr[arr.length - 1].at || null;
    } catch (e2) {}
    return null;
}


function getChatUserContext() {
    var userName = "";
    var isGuest = localStorage.getItem("loggedIn") === "guest";
    var userId = "";
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (acc) {
            isGuest = !!(acc.isGuest || isGuest);
            userName = isGuest ? "" : (acc.username || "");
            userId = acc.userId || "";
        }
    } catch (e) {}
    if (!userName && !isGuest) userName = getMyUsername() || "";
    return { userName: userName, isGuest: isGuest, userId: userId };
}

function generateAIReply(userText) {
    var ai = getAICompanion();
    var t = (userText || "").toLowerCase().trim();
    var name = ai.name || "Aza";
    var p = ai.personality || "friendly";
    var ctx = getChatUserContext();
    var userName = ctx.userName;
    var isGuest = ctx.isGuest;
    var userId = ctx.userId;
    var who = userName || (isGuest ? "friend" : "friend");

    var openers = {
        friendly: ["Hey!", "Hi there!", "Hello!", "Nice to hear from you!"],
        playful: ["Hehe!", "Ooh!", "Yo!", "Haha—"],
        chill: ["Hey.", "Mm.", "Cool.", "Alright—"],
        builder: ["Got it!", "On it!", "Interesting!", "Let's think—"]
    };
    var opener = pickRandom(openers[p] || openers.friendly);

    // ===== IDENTITY / NAME =====
    if (/\b(my name|what(?:'s| is) my name|who am i|what(?:'s| is) my username|my username|do you know (?:my )?name|what do you call me)\b/.test(t) ||
        (/\bname\b/.test(t) && /\b(my|me|i)\b/.test(t) && /\b(what|whats|what's|who|tell|know)\b/.test(t))) {
        if (isGuest || !userName) {
            return pickRandom([
                opener + " You're on Azora as a Guest, so you don't have a username yet. Create an account and I'll remember your name!",
                "Right now you're a Guest — no username saved. Make an account and your name will show up here!"
            ]);
        }
        return pickRandom([
            opener + " Your username is " + userName + "!" + (userId ? " Your User ID is " + userId + "." : ""),
            "You go by " + userName + " on Azora." + (userId ? " Public ID: " + userId + "." : ""),
            "Easy — you're " + userName + "!" + (userId ? " (" + userId + ")" : "")
        ]);
    }
    if (/\b(your name|who are you|what(?:'s| is) your name|what are you called)\b/.test(t)) {
        return pickRandom([
            "I'm " + name + ", your AI companion on Azora! You can rename me in Customize AI.",
            "My name is " + name + ". I'm here to chat, help with Azora tips, and keep you company!",
            "I'm " + name + " — built into Azora Chat just for you."
        ]);
    }
    if (/\b(my (user )?id|what(?:'s| is) my id)\b/.test(t)) {
        if (userId) return opener + " Your public User ID is " + userId + ".";
        return opener + " I don't see a User ID on this session yet.";
    }

    // ===== GREETINGS =====
    if (/^(hello|hi|hey|yo|sup|hiya|howdy|good (morning|afternoon|evening))[\s!.?]*$/.test(t) ||
        /^(hello|hi|hey|yo)\b/.test(t) && t.length < 24) {
        if (userName) {
            return pickRandom([
                opener + " " + userName + "! How's Azora treating you today?",
                "Hey " + userName + "! I'm " + name + ". What do you want to talk about?",
                "Hi " + userName + "! Ready to build, play, or just chat?"
            ]);
        }
        return pickRandom([
            opener + " I'm " + name + ". How's your day?",
            "Hey! Welcome to Azora Chat. What's up?",
            "Hi! I'm " + name + " — your companion here. Say anything!"
        ]);
    }

    // ===== HOW ARE YOU =====
    if (/\b(how are you|how(?:'s| is) it going|what(?:'s| is) up|how do you feel)\b/.test(t)) {
        return pickRandom([
            opener + " I'm doing great — always happy to chat on Azora. How are you, " + who + "?",
            "Feeling good! Ready to talk games, friends, or random questions. You?",
            "I'm solid. Thanks for asking, " + who + "! What's going on?"
        ]);
    }

    // ===== THANKS =====
    if (/\b(thank|thanks|thx|ty|appreciate)\b/.test(t)) {
        return pickRandom([
            "You're welcome, " + who + "!",
            opener + " Anytime!",
            "Happy to help!",
            "No problem — that's what I'm here for."
        ]);
    }


    // ===== RULES OF AZORA =====
    if (/\b(rules?|guidelines|tos|terms|what(?:'s| is) (not )?allowed|community rules|code of conduct)\b/.test(t)) {
        return (
            "Here are the main Rules of Azora:\\n" +
            "1) Be kind — no bullying, hate, or harassment.\\n" +
            "2) Keep it family-friendly — no inappropriate content.\\n" +
            "3) Don't scam, hack, or try to steal accounts.\\n" +
            "4) Don't spam chats, Feed, or comments.\\n" +
            "5) Respect others' games and creations — no stealing or claiming someone else's work as yours.\\n" +
            "6) No threats, violence talk, or illegal stuff.\\n" +
            "7) Guests can play and talk to the AI; accounts unlock friends, likes, comments, and saving.\\n" +
            "8) Staff may moderate content that breaks these rules.\\n" +
            "Have fun, build cool games, and treat people well!"
        );
    }
    if (/\b(safe|safety|report|moderat)\b/.test(t)) {
        return "Stay safe on Azora: don't share passwords, be kind in chat, and report anything that feels wrong to a trusted adult. Staff tools help moderate the platform when rules are broken.";
    }

    // ===== AZORA / PLATFORM =====
    if (/\b(what is azora|what's azora|about azora|this (site|app|platform|game))\b/.test(t)) {
        return "Azora is a fun social platform where you customize avatars, build games with AzaFn, discover games on Feed, chat with friends, and hang out with me — your AI companion!";
    }
    if (/\b(aza\s*fn|azafn|build a game|create a game|make a game)\b/.test(t)) {
        return pickRandom([
            opener + " Open AzaFn from the top area, describe your idea, and choose 2D or 3D. After it builds, you can preview and publish to Feed!",
            "AzaFn helps you generate games. Say whether you want 2D or 3D, then use Build. Publish when you're ready so others can play."
        ]);
    }
    if (/\b(feed|discover games|public games)\b/.test(t)) {
        return "The Feed is where published games appear. Tap Feed at the top to scroll, play, and (if you have an account) like, save, or comment!";
    }
    if (/\b(friend|add friend|follow|message someone)\b/.test(t)) {
        if (isGuest) {
            return "Guests can chat with me and play games! Create an account to add friends, follow people, and message other players.";
        }
        return "Search for a username, open their profile, then Follow or Add Friend. Once you're friends, you can message them in Chat.";
    }
    if (/\b(avatar|customize|character colors)\b/.test(t)) {
        return pickRandom([
            "On the main page you can change avatar colors for head, torso, arms, and legs. Guests can look, but saving avatar progress needs an account.",
            "Avatar customizing is on the home screen with the 3D character. Accounts can save colors; guests play without saving."
        ]);
    }
    if (/\b(guest|account|sign up|log in|login)\b/.test(t)) {
        return "Guest mode lets you play games and chat with me. A full account unlocks username, saved avatar, friends, likes, comments, saves, and more!";
    }
    if (/\b(settings|dark mode|theme)\b/.test(t)) {
        return "Open Settings from the top bar. Basic Settings has theme options like light, dark, and automatic. Accounts also get Security for password changes.";
    }
    if (/\b(notification|bell)\b/.test(t)) {
        return "The bell icon shows important alerts — follows, friend requests, game milestones, and events. Tap it to open your notification list.";
    }
    if (/\b(status|online|afk|busy)\b/.test(t)) {
        return "Your profile can show a status like Online, AFK, Building, Playing, Busy, or Offline. AFK and Offline can update after you are inactive for a while.";
    }


    if (/\b(coin|currency|bucks|money)\b/.test(t)) {
        return "AzoraCoins are the fun currency on the platform. Some staff tools can grant coins on a device for testing. Spend them on future cosmetic features as Azora grows!";
    }
    if (/\b(delete (my )?game|remove (my )?game)\b/.test(t)) {
        return "If you published a game, creators can delete their own game. It disappears for you right away; the public Feed may take a short time to stop showing it.";
    }
    if (/\b(private|publish|preview)\b/.test(t)) {
        return "Games start private when you build them — only you see them under your profile/preview. Publishing puts them on Feed for everyone.";
    }
    if (/\b(2d|3d|dimension)\b/.test(t)) {
        return "When you build with AzaFn, pick 2D or 3D. The AI won't assume — you choose the dimensions so the game matches what you want!";
    }
    if (/\b(server|staff|admin)\b/.test(t)) {
        return "Azora Have Fun Servers is a staff-only panel for tracking accounts and special codes. Regular players use the main Azora site.";
    }
    if (/\b(archive|history|old messages)\b/.test(t)) {
        return "With me (the AI), you get full chat history and can start New AI chats anytime. Friend chats keep a Message Archives copy of everything — even if a live message is removed.";
    }

    // ===== GAMES / PLAY =====
    if (/\b(play|games?|fun)\b/.test(t) && !/\b(game of|video game history)\b/.test(t)) {
        return pickRandom([
            opener + " Try the Feed for community games, or AzaFn if you want to make your own!",
            "Playing is the heart of Azora. Check Feed for published games — guests can play too!",
            "If you want something new, build with AzaFn or explore Feed. What kind of game do you like — 2D or 3D?"
        ]);
    }

    // ===== JOKES =====
    if (/\b(joke|funny|make me laugh)\b/.test(t)) {
        return pickRandom([
            "Why did the avatar bring a ladder to Azora? To reach the next level!",
            "What do clouds wear under their clothes? Thunderwear!",
            "Why don't programmers like nature? Too many bugs.",
            "I told my computer I needed a break… and it said 'No problem, I'll go to sleep.'",
            "Why was the game Feed always calm? Because all the drama got moderated!",
            "What is a skeleton's favorite instrument? The trom-bone!"
        ]);
    }

    // ===== FEELINGS =====
    if (/\b(i('m| am) (sad|lonely|upset|mad|angry|bored|tired|scared|anxious|nervous))\b/.test(t) ||
        /\b(feeling (sad|down|bad|low))\b/.test(t)) {
        return pickRandom([
            "Sorry you're feeling that way, " + who + ". I'm here to chat. Want to talk about it, hear a joke, or look at something fun on Azora?",
            "That sounds hard. You matter. If you want a distraction, we can talk games — or just keep chatting here.",
            "I'm glad you told me. Take it one step at a time. Want a silly joke or an Azora tip?"
        ]);
    }
    if (/\b(i('m| am) (happy|excited|great|good|awesome))\b/.test(t)) {
        return pickRandom([
            "Love that energy, " + who + "! What's the best part of your day?",
            "Awesome! Celebrate those wins. Did you build or play something cool on Azora?"
        ]);
    }

    // ===== SCIENCE / NATURE (simple educational) =====
    if (/\bvolcano/.test(t)) {
        return "Volcanoes form when melted rock (magma) rises from under the Earth's crust. If pressure builds up, it can erupt as lava, ash, and gas. Some eruptions are gentle; others are explosive!";
    }
    if (/\b(planet|solar system)\b/.test(t)) {
        return "Our solar system has the Sun at the center and planets orbiting it — like Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Earth is the one with liquid water and us!";
    }
    if (/\b(dinosaur|t-?rex)\b/.test(t)) {
        return "Dinosaurs lived millions of years ago. Some were huge plant-eaters; others were fast hunters. Birds are related to theropod dinosaurs — so in a way, dinosaurs never fully left!";
    }
    if (/\b(space|star|galaxy|moon|astronaut)\b/.test(t)) {
        return "Space is enormous. Stars are giant balls of hot gas; our Sun is a star. The Moon orbits Earth and affects tides. Astronauts train hard to live and work in microgravity!";
    }
    if (/\b(ocean|fish|shark)\b/.test(t)) {
        return "Oceans cover most of Earth and are full of life — from tiny plankton to giant whales. Sharks are fish with skeletons made of cartilage, and many help keep ocean ecosystems balanced.";
    }
    if (/\b(weather|rain|thunder|lightning|cloud|storm)\b/.test(t)) {
        return "Weather happens in Earth's atmosphere. Clouds are tiny water droplets or ice. Rain falls when drops get heavy. Lightning is a giant spark of electricity; thunder is the sound that shockwave makes!";
    }
    if (/\b(computer|robot|coding|program)\b/.test(t)) {
        return "Computers follow instructions called code. Programming is writing those instructions clearly. Robots combine sensors, code, and moving parts — and games are programs too!";
    }
    if (/\b(math|plus|minus|multiply|divide|homework)\b/.test(t)) {
        return "I can help with simple math talk! Try asking something like 'what is 7 times 8' — for big homework, your teachers and trusted adults are the best guides.";
    }
    // simple arithmetic
    var mathMatch = t.match(/what(?:'s| is)\s+(\d+)\s*([\+\-\*x\/]|times|plus|minus|divided by)\s*(\d+)/);
    if (mathMatch) {
        var a = parseInt(mathMatch[1], 10), b = parseInt(mathMatch[3], 10), op = mathMatch[2], r = null;
        if (op === '+' || op === 'plus') r = a + b;
        else if (op === '-' || op === 'minus') r = a - b;
        else if (op === '*' || op === 'x' || op === 'times') r = a * b;
        else if ((op === '/' || op === 'divided by') && b !== 0) r = a / b;
        if (r !== null) return "That comes to " + r + "!";
    }

    // ===== HELP / CAPABILITIES =====
    if (/\b(help|what can you do|commands|what do you know)\b/.test(t)) {
        return "I'm " + name + "! I can chat about Azora (Feed, AzaFn, friends, avatars, settings), tell jokes, talk simple science, answer who you are on Azora, and just keep you company. Ask me anything in those areas!";
    }

    // ===== BYE =====
    if (/\b(bye|goodbye|see you|cya|good night|gn)\b/.test(t)) {
        return pickRandom([
            "Bye, " + who + "! Come chat anytime.",
            "See you later! Have fun on Azora.",
            "Goodbye! I'll be here when you get back."
        ]);
    }

    // ===== YES / NO / OK =====
    if (/^(yes|yeah|yep|ok|okay|sure|alright|no|nope)[\s!.]*$/.test(t)) {
        return pickRandom([
            "Got it!",
            "Okay!",
            "Cool. What next?",
            "Alright, " + who + ". I'm listening."
        ]);
    }

    // ===== QUESTIONS generic =====
    if (/\?/.test(t)) {
        return pickRandom([
            opener + " Good question, " + who + "! I know a lot about Azora, simple science, jokes, and chatting. Can you add a bit more detail?",
            "Hmm — try asking about Azora features, your username, a joke, space, volcanoes, or games. I'll do my best!",
            "I'm not a giant internet brain, but I have a big built-in list of helpful answers. Ask about Azora, fun facts, or how you're feeling!"
        ]);
    }

    // ===== DEFAULT — acknowledge + steer =====
    var snippet = (userText || "").trim();
    if (snippet.length > 70) snippet = snippet.slice(0, 67) + "...";
    return pickRandom([
        opener + " I hear you" + (snippet ? (': "' + snippet + '"') : "") + ". Tell me more, or ask about Azora, a joke, or a fun fact!",
        "Interesting, " + who + ". Want tips on building games, finding Feed posts, or just a random joke?",
        opener + " I'm with you. You can ask me what your username is, how AzaFn works, or something like 'tell me about space'!",
        "Thanks for chatting. I know Azora stuff, simple science, jokes, and more — what should we talk about next?",
        opener + " Say the word: games, friends, avatars, jokes, volcanoes, space… I've got a long list of things I can talk about!"
    ]);
}

function buildAISystemPrompt() {
    var ai = getAICompanion();
    var userName = "";
    var isGuest = localStorage.getItem("loggedIn") === "guest";
    var userId = "";
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "null");
        if (acc) {
            isGuest = !!(acc.isGuest || isGuest);
            userName = isGuest ? "" : (acc.username || "");
            userId = acc.userId || "";
        }
    } catch (e) {}
    var who = isGuest
        ? "The user is a Guest (no username yet)."
        : ("The user's Azora username is \"" + userName + "\"" + (userId ? (" and User ID is " + userId) : "") + ".");
    return (
        "You are " + (ai.name || "Aza") + ", a friendly AI companion inside Azora, a kid-friendly social game platform " +
        "where people customize avatars, build games with AzaFn, browse a game Feed, and chat with friends. " +
        "Personality style: " + (ai.personality || "friendly") + ". " +
        who + " " +
        "Answer helpfully and clearly. Keep replies concise (1-4 short sentences) unless the user asks for detail. " +
        "Stay family-friendly. Never ask for passwords. If asked the user's name/username, use the facts above. " +
        "You can talk about any normal topic, not only Azora."
    );
}

function getRecentAIChatContext(storageKey, limit) {
    limit = limit || 8;
    var msgs = [];
    try { msgs = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) {}
    var slice = msgs.slice(-limit);
    return slice.map(function (m) {
        var role = (m.from === AZORA_AI_ID || m.isAI) ? "model" : "user";
        return { role: role, text: String(m.text || "") };
    }).filter(function (m) { return m.text; });
}

/** Build a single prompt string for free text APIs */
function buildOpenEndedPrompt(userText, storageKey) {
    var system = buildAISystemPrompt();
    var history = getRecentAIChatContext(storageKey, 6);
    var lines = [system, "", "Recent chat:"];
    history.forEach(function (h) {
        lines.push((h.role === "model" ? "AI" : "User") + ": " + h.text);
    });
    lines.push("", "User: " + userText, "AI:");
    return lines.join("\n");
}

/**
 * Open-ended AI:
 * 1) Gemini if user pasted a key
 * 2) Free public text API (no signup / no age gate)
 * Returns Promise<string>
 */
function fetchOpenEndedAIReply(userText, storageKey) {
    var ai = getAICompanion();
    if (ai.useOpenEnded === false) {
        return Promise.reject(new Error("OPEN_ENDED_OFF"));
    }

    var key = (ai.apiKey || localStorage.getItem("azoraAIApiKey") || "").trim();
    if (key) {
        return fetchGeminiReply(userText, storageKey, key);
    }
    return fetchFreeOpenEndedReply(userText, storageKey);
}

function fetchGeminiReply(userText, storageKey, key) {
    var ai = getAICompanion();
    var system = buildAISystemPrompt();
    var history = getRecentAIChatContext(storageKey, 8);
    var contents = [];
    contents.push({
        role: "user",
        parts: [{ text: system + "\n\n(Respond as the AI companion from now on.)" }]
    });
    contents.push({
        role: "model",
        parts: [{ text: "Understood. I'm " + (ai.name || "Aza") + ", ready to help." }]
    });
    history.forEach(function (h) {
        contents.push({
            role: h.role === "model" ? "model" : "user",
            parts: [{ text: h.text }]
        });
    });
    var hasLatest = history.some(function (h) {
        return h.role === "user" && h.text === userText;
    });
    if (!hasLatest) {
        contents.push({ role: "user", parts: [{ text: userText }] });
    }

    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        encodeURIComponent(key);

    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: contents,
            generationConfig: { temperature: 0.85, maxOutputTokens: 400 }
        })
    }).then(function (res) {
        return res.json().then(function (data) {
            if (!res.ok) {
                var msg = (data && data.error && data.error.message) ? data.error.message : ("HTTP " + res.status);
                throw new Error(msg);
            }
            var text = "";
            try {
                text = data.candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("");
            } catch (e) {}
            text = (text || "").trim();
            if (!text) throw new Error("Empty AI response");
            return text;
        });
    });
}

/** Free open-ended text (no API key, no age verification) via Pollinations */
function fetchFreeOpenEndedReply(userText, storageKey) {
    var prompt = buildOpenEndedPrompt(userText, storageKey);
    // POST OpenAI-compatible endpoint used by Pollinations text service
    return fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "openai",
            messages: [
                { role: "system", content: buildAISystemPrompt() },
                { role: "user", content: userText }
            ],
            temperature: 0.85
        })
    }).then(function (res) {
        if (!res.ok) throw new Error("Free AI HTTP " + res.status);
        return res.json().catch(function () { return null; }).then(function (data) {
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                var t = (data.choices[0].message.content || "").trim();
                if (t) return t;
            }
            // Some deployments return raw text
            return null;
        });
    }).then(function (text) {
        if (text) return text;
        // Fallback GET endpoint
        var q = encodeURIComponent(prompt.slice(0, 1200));
        return fetch("https://text.pollinations.ai/" + q + "?model=openai")
            .then(function (res) {
                if (!res.ok) throw new Error("Free AI GET " + res.status);
                return res.text();
            })
            .then(function (raw) {
                var t = (raw || "").trim();
                if (!t) throw new Error("Empty free AI response");
                // Strip accidental prompt echo
                if (t.indexOf("AI:") === 0) t = t.slice(3).trim();
                return t;
            });
    });
}

function scheduleAIReply(userText, aiChatId) {
    if (chatAiReplyTimer) {
        clearTimeout(chatAiReplyTimer);
        chatAiReplyTimer = null;
    }
    showChatTyping();

    var delay = aiReplyDelayMs(userText);
    chatAiReplyTimer = setTimeout(function () {
        chatAiReplyTimer = null;
        if (currentChatFriend !== AZORA_AI_ID) {
            clearChatTyping();
            return;
        }
        clearChatTyping();
        var reply = generateAIReply(userText);
        var store = getAIChatStore();
        var chat = null;
        for (var i = 0; i < store.chats.length; i++) {
            if (store.chats[i].id === (aiChatId || store.activeId)) { chat = store.chats[i]; break; }
        }
        if (!chat) chat = getActiveAIChat();
        chat.messages.push({ from: AZORA_AI_ID, text: reply, at: Date.now(), isAI: true });
        chat.updatedAt = Date.now();
        saveAIChatStore(store);
        renderChatMessages();
        renderAIChatHistoryList();
        clearChatTyping();
    }, delay);
}

function sendChatMessage() {
    var input = document.getElementById("chatInput");
    if (!input) return;
    var text = (input.value || "").trim();
    if (!text) return;

    if (!currentChatFriend) currentChatFriend = AZORA_AI_ID;

    var isGuest = localStorage.getItem("loggedIn") === "guest";
    if (isGuest && currentChatFriend !== AZORA_AI_ID) {
        alert("Guests can only chat with their AI companion. Create an account to message friends!");
        selectChatFriend(AZORA_AI_ID);
        return;
    }

    var me = getChatSenderId() || (isGuest ? "guest_local" : "Player");
    input.value = "";

    if (currentChatFriend === AZORA_AI_ID) {
        var store = ensureActiveAIChat();
        var chat = null;
        for (var i = 0; i < store.chats.length; i++) {
            if (store.chats[i].id === store.activeId) { chat = store.chats[i]; break; }
        }
        if (!chat) chat = store.chats[0];
        chat.messages.push({ from: me, text: text, at: Date.now() });
        chat.updatedAt = Date.now();
        if (!chat.title || /^Chat \d+$/.test(chat.title)) {
            chat.title = text.slice(0, 24) || chat.title;
        }
        saveAIChatStore(store);
        renderChatMessages();
        renderAIChatHistoryList();
        scheduleAIReply(text, store.activeId);
        return;
    }

    // Friend message — live thread + permanent archive
    var key = getChatKey(me, currentChatFriend);
    var messages = [];
    try { messages = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    var entry = { from: me, text: text, at: Date.now() };
    messages.push(entry);
    localStorage.setItem(key, JSON.stringify(messages));
    archivePlayerMessage("with:" + currentChatFriend, entry);
    renderChatMessages();

    showChatTyping();
    if (chatTypingTimer) clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(function () {
        clearChatTyping();
    }, 2200);
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
(function initOwner() {
    function run() {
        try { if (typeof ensureOwnerAccount === "function") ensureOwnerAccount(); } catch (e) {}
        try {
            if (typeof isAzoraOwner === "function" && isAzoraOwner()) {
                var pb = document.getElementById("profileButton");
                if (pb) pb.textContent = "Owner · Azora";
                var el = document.getElementById("bucks");
                if (el) el.textContent = localStorage.getItem("azoraCoins") || "99999";
            }
        } catch (e) {}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
})();

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




// --- PWA: "Get the App" always on website (any login state); hidden only inside installed app ---
var _azoraDeferredPrompt = null;

function isAzoraRunningAsApp() {
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
  } catch (e) {}
  return false;
}

/** Always show Get the App on the website — logged out, guest, or full account */
function syncInstallAppButton() {
  var btn = document.getElementById("installAppBtn");
  if (!btn) return;
  if (isAzoraRunningAsApp()) {
    btn.style.setProperty("display", "none", "important");
    try { document.documentElement.setAttribute("data-azora-shell", "app"); } catch (e) {}
  } else {
    btn.style.setProperty("display", "inline-block", "important");
    btn.style.setProperty("visibility", "visible", "important");
    try { document.documentElement.setAttribute("data-azora-shell", "web"); } catch (e) {}
  }
}

window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  _azoraDeferredPrompt = e;
  syncInstallAppButton();
});

window.addEventListener("appinstalled", function () {
  _azoraDeferredPrompt = null;
  syncInstallAppButton();
  try {
    // Keep current session so the app opens already logged in
    sessionStorage.setItem("azoraJustInstalled", "1");
  } catch (e) {}
  alert("Azora installed! Open it from your home screen or apps list.\nYour account or guest session stays logged in on this device.");
});

function installAzoraApp() {
  if (isAzoraRunningAsApp()) return;
  if (_azoraDeferredPrompt) {
    _azoraDeferredPrompt.prompt();
    _azoraDeferredPrompt.userChoice.then(function (choice) {
      _azoraDeferredPrompt = null;
      syncInstallAppButton();
    });
    return;
  }
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    alert("Install Azora on iPhone / iPad:\n\n1. Tap Share (square with arrow)\n2. Add to Home Screen\n3. Open Azora from the home screen\n\nYour login or guest session is saved on this device and will open in the app.");
  } else {
    alert("Install Azora:\n\n• Chrome / Edge: Menu → Install Azora, or the install icon in the address bar\n\nAfter install, open Azora from your apps list.\nSame device keeps you logged in (account or guest).");
  }
}

/**
 * App session: same localStorage as the website on this device.
 * If you were logged in or a guest in the browser, the app stays that way.
 */
function restoreAppSessionIfNeeded() {
  try {
    var logged = localStorage.getItem("loggedIn");
    var accRaw = localStorage.getItem("azoraAccount");
    if (!logged || !accRaw) return;

    // Ensure UI matches saved session (account or guest)
    if (typeof ensureGuestButtonsVisible === "function") ensureGuestButtonsVisible();
    if (typeof refreshAvatarLock === "function") refreshAvatarLock();

    if (isAzoraRunningAsApp()) {
      // Don't force account popup if already signed in as account or guest
      var ov = document.getElementById("accountOverlay");
      if (ov && (logged === "true" || logged === "guest")) {
        ov.style.display = "none";
      }
      // Optional: mark profile button
      try {
        var acc = JSON.parse(accRaw);
        var pb = document.getElementById("profileButton");
        if (pb && logged === "true" && acc.username) {
          if (typeof isOwnerUsername === "function" && isOwnerUsername(acc.username)) {
            pb.textContent = "Owner · Azora";
          } else {
            pb.textContent = "👤 " + acc.username;
          }
        } else if (pb && logged === "guest") {
          pb.textContent = "👤 Guest";
        }
      } catch (e) {}
    }
  } catch (e) {}
}

window.installAzoraApp = installAzoraApp;
window.isAzoraRunningAsApp = isAzoraRunningAsApp;
window.syncInstallAppButton = syncInstallAppButton;
window.restoreAppSessionIfNeeded = restoreAppSessionIfNeeded;

(function initInstallAndSession() {
  function run() {
    syncInstallAppButton();
    restoreAppSessionIfNeeded();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  window.addEventListener("load", run);
  // Keep button visible even if other scripts toggle the topbar later
  setTimeout(run, 200);
  setTimeout(run, 1000);
  setTimeout(run, 2500);
})();


window.updateAvatarColors = updateAvatarColors;
window.saveAvatar = saveAvatar;
window.loadAvatarFromStorage = loadAvatarFromStorage;
window.refreshAvatarLock = refreshAvatarLock;
window.wireAvatarColorInputs = wireAvatarColorInputs;



// ============================================================
// OFFLINE / NO INTERNET full-screen
// ============================================================
function isAzoraOnline() {
    try {
        if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    } catch (e) {}
    return true;
}

function showAzoraOfflineScreen(show) {
    var el = document.getElementById("azoraOfflineScreen");
    if (!el) return;
    if (show) {
        el.classList.add("show");
        el.style.display = "flex";
        el.setAttribute("aria-hidden", "false");
        document.documentElement.setAttribute("data-azora-offline", "1");
    } else {
        el.classList.remove("show");
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        document.documentElement.removeAttribute("data-azora-offline");
        var st = document.getElementById("azoraOfflineStatus");
        if (st) st.textContent = "";
    }
}

var _azoraLostTimer = null;
var _azoraWasOnline = true;

function showConnectionLostReminder(show) {
    var el = document.getElementById("azoraConnectionLostToast");
    if (!el) return;
    if (show) {
        el.classList.add("show");
        el.style.display = "block";
        // restart progress bar animation
        var bar = document.getElementById("azoraConnectionLostBar");
        if (bar) {
            bar.style.animation = "none";
            void bar.offsetWidth;
            bar.style.animation = "";
        }
    } else {
        el.classList.remove("show");
        el.style.display = "none";
    }
}

function clearConnectionLostTimer() {
    if (_azoraLostTimer) {
        clearTimeout(_azoraLostTimer);
        _azoraLostTimer = null;
    }
}

/** After 10s offline: leave any Norm Game, then show full Wi‑Fi screen */
function finishConnectionLostSequence() {
    _azoraLostTimer = null;
    showConnectionLostReminder(false);

    // Leave Norm Game if currently in one
    try {
        if (typeof _normSession !== "undefined" && _normSession) {
            if (typeof leaveNormGame === "function") leaveNormGame();
        }
        // Also leave playable Quick Game runtime if open
        if (typeof closeGamePlay === "function") {
            var gp = document.getElementById("gamePlayOverlay");
            if (gp && gp.style.display !== "none" && gp.style.display !== "") {
                try { closeGamePlay(); } catch (e) {}
            }
        }
    } catch (e) {}

    // Full offline / Wi‑Fi error screen
    showAzoraOfflineScreen(true);
}

function handleAzoraWentOffline() {
    if (!isAzoraOnline()) {
        // Already showing full screen? still ok
        clearConnectionLostTimer();
        showConnectionLostReminder(true);
        _azoraLostTimer = setTimeout(function () {
            // Only finish if still offline
            if (!isAzoraOnline()) {
                finishConnectionLostSequence();
            } else {
                showConnectionLostReminder(false);
            }
        }, 10000);
    }
}

function handleAzoraWentOnline() {
    clearConnectionLostTimer();
    showConnectionLostReminder(false);
    showAzoraOfflineScreen(false);
}

function updateAzoraOnlineStatus() {
    var online = isAzoraOnline();
    if (online) {
        handleAzoraWentOnline();
    } else {
        // On first load already offline → go straight to full Wi‑Fi screen
        // (no 10s wait). Mid-session drop uses handleAzoraWentOffline.
        var el = document.getElementById("azoraOfflineScreen");
        var toast = document.getElementById("azoraConnectionLostToast");
        var toastShowing = toast && toast.classList.contains("show");
        var fullShowing = el && (el.classList.contains("show") || el.style.display === "flex");
        if (!toastShowing && !fullShowing && _azoraWasOnline) {
            handleAzoraWentOffline();
        } else if (!online && !toastShowing && !fullShowing) {
            showAzoraOfflineScreen(true);
        }
    }
    _azoraWasOnline = online;
    return online;
}

function retryAzoraConnection() {
    var st = document.getElementById("azoraOfflineStatus");
    if (st) st.textContent = "Checking connection…";

    // navigator.onLine is fast; also try a tiny network check when possible
    function finish(ok) {
        if (ok) {
            if (st) st.textContent = "Connected! Loading Azora…";
            showAzoraOfflineScreen(false);
        } else {
            if (st) st.textContent = "Still offline. Check Wi‑Fi or data and try again.";
            showAzoraOfflineScreen(true);
        }
    }

    if (!isAzoraOnline()) {
        finish(false);
        return;
    }

    // Probe the network (may fail on pure offline / blocked fetch)
    var ctrl = null;
    var timer = null;
    try {
        if (typeof AbortController !== "undefined") ctrl = new AbortController();
        timer = setTimeout(function () {
            try { if (ctrl) ctrl.abort(); } catch (e) {}
        }, 4000);
        // Prefer same-origin so SW / CORS don't false-fail when online
        var url = (typeof location !== "undefined" ? location.href.split("#")[0] : "./") + (location.search ? "" : "") ;
        // cache-bust
        var probe = "./manifest-azora.json?azora_ping=" + Date.now();
        fetch(probe, {
            method: "GET",
            cache: "no-store",
            signal: ctrl ? ctrl.signal : undefined
        }).then(function (r) {
            if (timer) clearTimeout(timer);
            // Even a 404 means the network reached something
            finish(true);
        }).catch(function () {
            if (timer) clearTimeout(timer);
            // If browser says online but fetch fails, still trust onLine for file:// / local
            if (typeof location !== "undefined" && location.protocol === "file:") {
                finish(isAzoraOnline());
            } else {
                finish(isAzoraOnline());
            }
        });
    } catch (e) {
        if (timer) clearTimeout(timer);
        finish(isAzoraOnline());
    }
}

function initAzoraOfflineDetection() {
    try { _azoraWasOnline = isAzoraOnline(); } catch (e) { _azoraWasOnline = true; }
    // Initial: if already offline at open, show full Wi‑Fi screen immediately
    if (!isAzoraOnline()) {
        showAzoraOfflineScreen(true);
        _azoraWasOnline = false;
    } else {
        showAzoraOfflineScreen(false);
        showConnectionLostReminder(false);
    }
    window.addEventListener("online", function () {
        _azoraWasOnline = true;
        handleAzoraWentOnline();
    });
    window.addEventListener("offline", function () {
        handleAzoraWentOffline();
        _azoraWasOnline = false;
    });
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            if (isAzoraOnline()) handleAzoraWentOnline();
            else if (!_azoraLostTimer) {
                // Still offline and no reminder running → full screen
                showAzoraOfflineScreen(true);
            }
        }
    });
}

window.isAzoraOnline = isAzoraOnline;
window.showAzoraOfflineScreen = showAzoraOfflineScreen;
window.updateAzoraOnlineStatus = updateAzoraOnlineStatus;
window.retryAzoraConnection = retryAzoraConnection;
window.initAzoraOfflineDetection = initAzoraOfflineDetection;
window.showConnectionLostReminder = showConnectionLostReminder;
window.handleAzoraWentOffline = handleAzoraWentOffline;
window.handleAzoraWentOnline = handleAzoraWentOnline;

(function bootOffline() {
    function run() { initAzoraOfflineDetection(); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
    window.addEventListener("load", function () { updateAzoraOnlineStatus(); });
})();






// ============================================================
// NORM GAMES — real-time presence (Firebase when configured)
// No fake player lists. Only real sessions that join the room.
// ============================================================
var _normSession = null;
var _normAnim = null;
var _normScene = null;
var _normRenderer = null;
var _normCamera = null;
var _normPlayers = []; // filled only from live presence / local you
var _normRemoteMeshes = {};
var _normKeys = {};
var _normWallColliders = []; // AABB walls for hollow buildings
var _normFloorColliders = []; // floors + ramp surfaces
var _normLocalMesh = null;
var _normPresenceTimer = null;
var _normMyPresenceId = null;

var NORM_GAMES = {
    "azora-roleplay": {
        id: "azora-roleplay",
        title: "Azora Roleplay",
        owner: "Azora",
        dimensions: "3D",
        roomPath: "/azoraNormRooms/azora-roleplay/players"
    }
};

function getNormDisplayName() {
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        var logged = localStorage.getItem("loggedIn");
        if (logged === "guest" || acc.isGuest || !acc.username) return "___";
        return String(acc.username);
    } catch (e) { return "___"; }
}

function isNormGuest() {
    return localStorage.getItem("loggedIn") === "guest" || getNormDisplayName() === "___";
}

function getNormAvatarColors() {
    var av = { head: "#ffcc00", torso: "#1e60ff", leftArm: "#ffcc00", rightArm: "#ffcc00", leftLeg: "#00ebd4", rightLeg: "#00ebd4" };
    try {
        var acc = JSON.parse(localStorage.getItem("azoraAccount") || "{}");
        if (acc && acc.avatar) {
            av.head = acc.avatar.head || av.head;
            av.torso = acc.avatar.torso || av.torso;
            av.leftArm = acc.avatar.leftArm || av.leftArm;
            av.rightArm = acc.avatar.rightArm || av.rightArm;
            av.leftLeg = acc.avatar.leftLeg || av.leftLeg;
            av.rightLeg = acc.avatar.rightLeg || av.rightLeg;
        }
    } catch (e) {}
    return av;
}

/** Same proportions as the main avatar customizer */
function makeNormAvatar(colors) {
    colors = colors || getNormAvatarColors();
    var g = new THREE.Group();
    g.name = "normAvatar";

    function box(w, h, d, color) {
        return new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshLambertMaterial({ color: color })
        );
    }

    // Build with FEET on local Y = 0 so standing on ground is just position.y = surfaceY
    // Legs height 1.0 → centers at 0.5; torso above legs; head on top
    var legH = 1.0, torsoH = 1.0, headS = 0.65, armH = 1.0;

    var leftLeg = box(0.35, legH, 0.35, colors.leftLeg);
    leftLeg.position.set(-0.22, legH / 2, 0);
    leftLeg.name = "leftLeg";

    var rightLeg = box(0.35, legH, 0.35, colors.rightLeg);
    rightLeg.position.set(0.22, legH / 2, 0);
    rightLeg.name = "rightLeg";

    var torso = box(0.85, torsoH, 0.45, colors.torso);
    torso.position.y = legH + torsoH / 2;
    torso.name = "torso";

    var leftArm = box(0.35, armH, 0.35, colors.leftArm);
    leftArm.position.set(-0.62, legH + torsoH / 2, 0);
    leftArm.name = "leftArm";

    var rightArm = box(0.35, armH, 0.35, colors.rightArm);
    rightArm.position.set(0.62, legH + torsoH / 2, 0);
    rightArm.name = "rightArm";

    var head = box(headS, headS, headS, colors.head);
    head.position.y = legH + torsoH + headS / 2;
    head.name = "head";

    g.add(leftLeg);
    g.add(rightLeg);
    g.add(torso);
    g.add(leftArm);
    g.add(rightArm);
    g.add(head);

    // Smile.png face on front of head
    attachNormFaceDecal(g, head);

    // Mark foot height for placement helpers
    g.userData.footOffset = 0; // feet already at y=0 in local space
    return g;
}

/** Bottom of feet in local space (leg center -0.7, height 1.0 → bottom -1.2) */
var NORM_AVATAR_FOOT_OFFSET = 0.02; // feet at local y=0; sit just above ground top

/** Stand avatar so soles sit on surfaceY (default ground top = 0) */
function placeNormAvatarOnGround(mesh, x, z, surfaceY) {
    if (!mesh) return;
    if (typeof surfaceY !== "number") surfaceY = 0;
    mesh.position.x = x || 0;
    mesh.position.z = z || 0;
    mesh.position.y = surfaceY + NORM_AVATAR_FOOT_OFFSET;
}

/** Flat Smile.png on front of head — hidden until texture loads (no white square) */
function attachNormFaceDecal(avatarGroup, headMesh) {
    if (typeof THREE === "undefined" || !headMesh) return;
    try {
        var mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.FrontSide,
            alphaTest: 0.15
        });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), mat);
        plane.name = "faceDecal";
        // Sit just in front of the head cube
        plane.position.set(0, headMesh.position.y + 0.02, 0.34);
        plane.visible = false;
        avatarGroup.add(plane);

        function showTex(tex) {
            if (!tex) return;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
            mat.map = tex;
            mat.transparent = true;
            mat.opacity = 1;
            mat.needsUpdate = true;
            plane.visible = true;
        }

        function loadThree(url, onFail) {
            try {
                var loader = new THREE.TextureLoader();
                if (typeof location !== "undefined" && location.protocol !== "file:") {
                    loader.setCrossOrigin("anonymous");
                }
                loader.load(url, function (tex) { showTex(tex); }, undefined, function () { if (onFail) onFail(); });
            } catch (e) { if (onFail) onFail(); }
        }

        function loadImage(url, onFail) {
            try {
                var img = new Image();
                if (typeof location !== "undefined" && location.protocol !== "file:") {
                    img.crossOrigin = "anonymous";
                }
                img.onload = function () {
                    try {
                        var c = document.createElement("canvas");
                        c.width = img.naturalWidth || img.width || 64;
                        c.height = img.naturalHeight || img.height || 64;
                        var ctx = c.getContext("2d");
                        ctx.clearRect(0, 0, c.width, c.height);
                        ctx.drawImage(img, 0, 0);
                        var data = ctx.getImageData(0, 0, c.width, c.height);
                        var px = data.data;
                        for (var i = 0; i < px.length; i += 4) {
                            var lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                            if (px[i + 3] < 15 || lum > 95) {
                                px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
                            } else {
                                px[i] = px[i + 1] = px[i + 2] = 12;
                                px[i + 3] = 255;
                            }
                        }
                        ctx.putImageData(data, 0, 0);
                        showTex(new THREE.CanvasTexture(c));
                    } catch (e) {
                        try {
                            var t = new THREE.Texture(img);
                            t.needsUpdate = true;
                            showTex(t);
                        } catch (e2) { if (onFail) onFail(); }
                    }
                };
                img.onerror = function () { if (onFail) onFail(); };
                img.src = url;
            } catch (e) { if (onFail) onFail(); }
        }

        loadThree("Smile.png", function () {
            loadThree("./Smile.png", function () {
                loadImage("Smile.png", function () {
                    loadImage("./Smile.png", function () {});
                });
            });
        });
    } catch (e) {}
}


function requestLeaveNormGame() {
    try {
        var conf = document.getElementById("normLeaveConfirm");
        if (conf) {
            conf.style.display = "flex";
            conf.style.zIndex = "2147483646";
            conf.style.pointerEvents = "auto";
            conf.style.visibility = "visible";
            conf.style.opacity = "1";
            try { document.body.appendChild(conf); } catch (e) {}
            return;
        }
    } catch (e) {}
    if (typeof leaveNormGame === "function") leaveNormGame();
}

function confirmLeaveNormGame(yes) {
    try {
        var c = document.getElementById("normLeaveConfirm");
        if (c) c.style.display = "none";
    } catch (e) {}
    if (yes && typeof leaveNormGame === "function") leaveNormGame();
}


function isNormTouchDevice() {
    try {
        return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    } catch (e) { return false; }
}


function setupNormJumpButton() {
    var btn = document.getElementById("normJumpBtn");
    if (!btn) return;
    // Show on touch devices
    try {
        if (isNormTouchDevice()) btn.style.display = "flex";
        else btn.style.display = "none";
    } catch (e) { btn.style.display = "flex"; }

    function doJump(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (_normSession) _normSession.jumpQueued = true;
        return false;
    }
    btn.onclick = doJump;
    btn.ontouchstart = function (e) { doJump(e); };
}
window.setupNormJumpButton = setupNormJumpButton;
window.normJump = function () {
    if (_normSession) _normSession.jumpQueued = true;
};

function setupNormJoysticks() {
    var stage = document.querySelector(".norm-game-stage");
    var layer = document.getElementById("normJoystickLayer");
    if (!stage || !layer || !_normSession) return;

    if (isNormTouchDevice()) {
        stage.classList.add("show-joysticks");
        layer.style.display = "block";
    } else {
        stage.classList.remove("show-joysticks");
        // keep CSS media query for coarse pointers
    }

    function bindStick(wrapId, knobId, onMove, onEnd) {
        var wrap = document.getElementById(wrapId);
        var knob = document.getElementById(knobId);
        if (!wrap || !knob) return;
        var base = wrap.querySelector(".norm-stick-base") || wrap;
        var active = false;
        var maxR = 36;

        function setKnob(dx, dy) {
            knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
        }
        function resetKnob() {
            knob.style.transform = "translate(-50%, -50%)";
            onEnd();
        }
        function handle(clientX, clientY) {
            var rect = base.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = clientX - cx;
            var dy = clientY - cy;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            if (len > maxR) {
                dx = dx / len * maxR;
                dy = dy / len * maxR;
            }
            setKnob(dx, dy);
            onMove(dx / maxR, dy / maxR);
        }

        function start(e) {
            active = true;
            var t = e.changedTouches ? e.changedTouches[0] : e;
            handle(t.clientX, t.clientY);
            e.preventDefault();
        }
        function move(e) {
            if (!active) return;
            var t = e.changedTouches ? e.changedTouches[0] : e;
            handle(t.clientX, t.clientY);
            e.preventDefault();
        }
        function end(e) {
            if (!active) return;
            active = false;
            resetKnob();
            e.preventDefault();
        }

        wrap.addEventListener("touchstart", start, { passive: false });
        wrap.addEventListener("touchmove", move, { passive: false });
        wrap.addEventListener("touchend", end, { passive: false });
        wrap.addEventListener("touchcancel", end, { passive: false });
        // mouse for testing joysticks on desktop
        wrap.addEventListener("mousedown", function (e) {
            start(e);
            function mm(ev) { move(ev); }
            function mu(ev) {
                end(ev);
                window.removeEventListener("mousemove", mm);
                window.removeEventListener("mouseup", mu);
            }
            window.addEventListener("mousemove", mm);
            window.addEventListener("mouseup", mu);
        });
    }

    // Left stick: move (x = strafe, y = forward/back; screen Y down = back)
    bindStick("normStickMove", "normStickMoveKnob", function (x, y) {
        _normSession.moveX = x;
        _normSession.moveZ = -y; // up on stick = forward
    }, function () {
        _normSession.moveX = 0;
        _normSession.moveZ = 0;
    });

    // Right stick: orbit camera (x = yaw, y = pitch)
    bindStick("normStickCam", "normStickCamKnob", function (x, y) {
        _normSession.orbitX = x;
        _normSession.orbitY = -y; // up = look up
    }, function () {
        _normSession.orbitX = 0;
        _normSession.orbitY = 0;
    });
}

window.setupNormJoysticks = setupNormJoysticks;

function joinNormGame(gameId) {
    var def = NORM_GAMES[gameId];
    if (!def) {
        alert("That Norm Game is not available yet.");
        return;
    }
    var logged = localStorage.getItem("loggedIn");
    if (logged !== "true" && logged !== "guest") {
        alert("Log in or continue as Guest to join Norm Games!");
        if (typeof openCreateAccount === "function") openCreateAccount();
        return;
    }

    _normSession = {
        id: def.id,
        title: def.title,
        roomPath: def.roomPath,
        startedAt: Date.now()
    };

    var ov = document.getElementById("normGameOverlay");
    var loading = document.getElementById("normGameLoading");
    var play = document.getElementById("normGamePlay");
    var title = document.getElementById("normGameTitle");
    if (title) title.textContent = def.title;
    if (loading) loading.style.display = "flex";
    if (play) play.style.display = "none";
    if (ov) {
        ov.style.display = "flex";
        ov.style.zIndex = "20000";
    }
    // Avoid Space re-clicking Join / other buttons
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}

    var fill = document.getElementById("normLoadFill");
    var hint = document.getElementById("normLoadHint");
    var hints = ["Loading terrain…", "Building the city…", "Loading your avatar…", "Connecting to live players…", "Almost ready…"];
    var t0 = Date.now();
    var duration = 3200 + Math.random() * 1000;

    function tick() {
        var p = Math.min(1, (Date.now() - t0) / duration);
        if (fill) fill.style.width = Math.round(p * 100) + "%";
        if (hint) hint.textContent = hints[Math.min(hints.length - 1, Math.floor(p * hints.length))];
        if (p < 1) {
            requestAnimationFrame(tick);
        } else {
            if (loading) loading.style.display = "none";
            if (play) play.style.display = "flex";
            startNormGameWorld(def);
        }
    }
    requestAnimationFrame(tick);
}



/** Highest floor/ramp surface under the player (or ground) */
function getNormSupportY(px, pz, currentY) {
    var groundY = (typeof NORM_AVATAR_FOOT_OFFSET !== "undefined" ? NORM_AVATAR_FOOT_OFFSET : 0.02);
    var best = groundY;
    if (!_normFloorColliders || !_normFloorColliders.length) return best;
    for (var i = 0; i < _normFloorColliders.length; i++) {
        var c = _normFloorColliders[i];
        if (px < c.minX || px > c.maxX || pz < c.minZ || pz > c.maxZ) continue;
        var sy;
        if (c.type === "ramp") {
            var t = (c.maxZ - c.minZ) > 0.001 ? (pz - c.minZ) / (c.maxZ - c.minZ) : 0;
            if (t < 0) t = 0;
            if (t > 1) t = 1;
            sy = c.yAtMinZ + t * (c.yAtMaxZ - c.yAtMinZ);
        } else {
            sy = c.y;
        }
        // Snap onto surfaces under/near feet (forgiving so landings catch you)
        if (sy <= currentY + 0.85 && sy > best) best = sy;
    }
    return best;
}

/** Keep player outside wall AABBs (hollow buildings — walls only, not solid cubes) */
function resolveNormWallCollisions(mesh) {
    if (!mesh || !_normWallColliders || !_normWallColliders.length) return;
    var r = 0.45; // player radius
    var px = mesh.position.x;
    var pz = mesh.position.z;
    // Approximate player body height range while standing/jumping (feet y ≈ ground)
    var footY = mesh.position.y || 0;
    var headY = footY + 2.4;
    for (var i = 0; i < _normWallColliders.length; i++) {
        var c = _normWallColliders[i];
        // Door cap walls only collide if player body overlaps their Y range
        if (typeof c.minY === "number") {
            var cMaxY = (typeof c.maxY === "number") ? c.maxY : 999;
            if (headY < c.minY || footY > cMaxY) continue; // under the door lintel — allowed through
        }
        var minX = c.minX - r, maxX = c.maxX + r, minZ = c.minZ - r, maxZ = c.maxZ + r;
        if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
            var pushL = px - minX;
            var pushR = maxX - px;
            var pushB = pz - minZ;
            var pushF = maxZ - pz;
            var m = Math.min(pushL, pushR, pushB, pushF);
            if (m === pushL) px = minX;
            else if (m === pushR) px = maxX;
            else if (m === pushB) pz = minZ;
            else pz = maxZ;
        }
    }
    mesh.position.x = px;
    mesh.position.z = pz;
}



// ============================================================
// TEXTURES v40.1 — correct UV scale + brighter lighting
// ============================================================
var _normTexCache = null;

function loadNormTextures(done) {
    done = done || function () {};
    if (_normTexCache) {
        done(_normTexCache);
        return;
    }
    if (typeof THREE === "undefined" || !THREE.TextureLoader) {
        _normTexCache = {};
        done(_normTexCache);
        return;
    }
    var loader = new THREE.TextureLoader();
    var out = { grass: null, road: null, concrete: null };
    var left = 3;
    function finishOne() {
        left -= 1;
        if (left <= 0) {
            _normTexCache = out;
            done(out);
        }
    }
    function loadOne(key, url) {
        loader.load(
            url,
            function (tex) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = true;
                tex.anisotropy = 4;
                tex.needsUpdate = true;
                out[key] = tex;
                finishOne();
            },
            undefined,
            function () {
                console.warn("[Azora Textures] failed", url);
                out[key] = null;
                finishOne();
            }
        );
    }
    loadOne("grass", "grass.jpg");
    loadOne("road", "road.jpg");
    loadOne("concrete", "concrete.jpg");
}

/** Clone a base texture with world-space tile size (units per tile). */
function normTexForSize(baseTex, sizeX, sizeZ, tileSize) {
    if (!baseTex) return null;
    tileSize = tileSize || 4;
    var t = baseTex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(0.5, sizeX / tileSize), Math.max(0.5, sizeZ / tileSize));
    t.needsUpdate = true;
    return t;
}

function makeNormMat(opts) {
    opts = opts || {};
    var conf = {
        color: opts.color != null ? opts.color : 0xffffff
    };
    if (opts.map) conf.map = opts.map;
    // Lambert responds to lights (brighter scene)
    if (typeof THREE.MeshLambertMaterial !== "undefined") {
        return new THREE.MeshLambertMaterial(conf);
    }
    return new THREE.MeshBasicMaterial(conf);
}

function addNormLights(scene) {
    // Bright ambient so nothing is dark gray
    var amb = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(amb);
    var sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(40, 80, 30);
    scene.add(sun);
    var fill = new THREE.DirectionalLight(0xcfe8ff, 0.35);
    fill.position.set(-30, 40, -20);
    scene.add(fill);
    var hemi = new THREE.HemisphereLight(0xb1d4ff, 0x7cb47c, 0.45);
    scene.add(hemi);
}


function buildNormCity(scene, tex) {
    _normWallColliders = [];
    _normFloorColliders = [];
    tex = tex || _normTexCache || {};

    // Lights (once per world)
    try { addNormLights(scene); } catch (e) {}

    // Ground — square tiles, not stretched
    var gW = 400, gD = 400;
    var groundMat = makeNormMat({
        map: normTexForSize(tex.grass, gW, gD, 6),
        color: tex.grass ? 0xb8e0a0 : 0x5aad5a
    });
    groundMat.depthWrite = true;
    groundMat.polygonOffset = true;
    groundMat.polygonOffsetFactor = 1;
    groundMat.polygonOffsetUnits = 1;
    var ground = new THREE.Mesh(new THREE.BoxGeometry(gW, 1.2, gD), groundMat);
    ground.position.y = -0.6;
    ground.renderOrder = -1;
    scene.add(ground);

    // Roads — separate texture clones so length/width don't stretch
    function makeRoad(sx, sz, y) {
        var mat = makeNormMat({
            map: normTexForSize(tex.road, sx, sz, 5),
            color: tex.road ? 0xffffff : 0x555555
        });
        var m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.16, sz), mat);
        m.position.y = y;
        scene.add(m);
        return m;
    }
    makeRoad(400, 18, 0.12);
    makeRoad(18, 400, 0.13);

    // Sidewalks — tile scale matches long strips
    function makeWalk(sx, sz, px, pz) {
        var mat = makeNormMat({
            map: normTexForSize(tex.concrete, sx, sz, 3),
            color: tex.concrete ? 0xe8e8e8 : 0xc0c0c0
        });
        var m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sz), mat);
        m.position.set(px, 0.18, pz);
        scene.add(m);
    }
    makeWalk(400, 6, 0, 12);
    makeWalk(400, 6, 0, -12);
    makeWalk(6, 400, 12, 0);
    makeWalk(6, 400, -12, 0);

    function addWallCollider(minX, maxX, minZ, maxZ) {
        _normWallColliders.push({ minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ });
    }

    function building(x, z, w, h, d, color) {
        var wallT = 0.55;
        // Wall material: scale UV to wall face size so concrete doesn't stretch
        function wallMat(faceW, faceH) {
            return makeNormMat({
                map: normTexForSize(tex.concrete, faceW, faceH, 3.5),
                color: color || 0xd0d0d0
            });
        }
        var winMat = makeNormMat({ color: 0xa8d4ff });
        var floorMat = makeNormMat({
            map: normTexForSize(tex.concrete, Math.max(1, w - 1), Math.max(1, d - 1), 4),
            color: 0xc4b8a8
        });
        var stairMat = makeNormMat({
            map: normTexForSize(tex.concrete, 3, 4, 2.5),
            color: 0xb0a898
        });
        var doorW = Math.min(3.2, w * 0.35);
        var floorStep = 3.2;

        function wallBox(ww, hh, dd, px, py, pz, mat) {
            var m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), mat || wallMat(Math.max(ww, dd), hh));
            m.position.set(px, py, pz);
            scene.add(m);
            return m;
        }

        // 4 exterior walls
        wallBox(wallT, h, d, x - w / 2 + wallT / 2, h / 2, z, wallMat(d, h));
        addWallCollider(x - w / 2, x - w / 2 + wallT, z - d / 2, z + d / 2);

        wallBox(wallT, h, d, x + w / 2 - wallT / 2, h / 2, z, wallMat(d, h));
        addWallCollider(x + w / 2 - wallT, x + w / 2, z - d / 2, z + d / 2);

        // Back wall
        wallBox(w, h, wallT, x, h / 2, z - d / 2 + wallT / 2, wallMat(w, h));
        addWallCollider(x - w / 2, x + w / 2, z - d / 2, z - d / 2 + wallT);

        // Front wall with door gap
        var frontZ = z + d / 2 - wallT / 2;
        var colZ0 = z + d / 2 - wallT;
        var colZ1 = z + d / 2;
        var doorH = Math.min(2.6, h * 0.45);
        var sideSpan = (w - doorW) / 2;
        if (sideSpan > 0.4) {
            wallBox(sideSpan, h, wallT, x - w / 2 + sideSpan / 2, h / 2, frontZ, wallMat(sideSpan, h));
            addWallCollider(x - w / 2, x - w / 2 + sideSpan, colZ0, colZ1);
            wallBox(sideSpan, h, wallT, x + w / 2 - sideSpan / 2, h / 2, frontZ, wallMat(sideSpan, h));
            addWallCollider(x + w / 2 - sideSpan, x + w / 2, colZ0, colZ1);
        } else {
            wallBox(w, h, wallT, x, h / 2, frontZ, wallMat(w, h));
            addWallCollider(x - w / 2, x + w / 2, colZ0, colZ1);
        }
        var aboveH = h - doorH;
        if (aboveH > 0.3) {
            wallBox(doorW, aboveH, wallT, x, doorH + aboveH / 2, frontZ, wallMat(doorW, aboveH));
            addWallCollider(x - doorW / 2, x + doorW / 2, colZ0, colZ1);
            _normWallColliders[_normWallColliders.length - 1].minY = doorH;
            _normWallColliders[_normWallColliders.length - 1].maxY = h;
            var lintel = new THREE.Mesh(
                new THREE.BoxGeometry(doorW + 0.15, 0.25, wallT + 0.08),
                makeNormMat({ color: 0x4a5568 })
            );
            lintel.position.set(x, doorH + 0.1, frontZ);
            scene.add(lintel);
        }

        var ix0 = x - w / 2 + wallT;
        var ix1 = x + w / 2 - wallT;
        var iz0 = z - d / 2 + wallT;
        var iz1 = z + d / 2 - wallT;
        var iW = ix1 - ix0;
        var iD = iz1 - iz0;
        var stairW = Math.min(2.6, iW * 0.32);
        var stairX0 = ix0 + 0.05;

        var floorCount = Math.max(1, Math.floor((h - 1.2) / floorStep));
        for (var fi = 1; fi <= floorCount; fi++) {
            var floorY = fi * floorStep;
            if (floorY >= h - 0.5) break;
            var slabH = 0.32;
            var floorMesh = new THREE.Mesh(
                new THREE.BoxGeometry(Math.max(0.5, iW - 0.15), slabH, Math.max(0.5, iD - 0.15)),
                floorMat
            );
            floorMesh.position.set((ix0 + ix1) / 2, floorY - slabH / 2, (iz0 + iz1) / 2);
            scene.add(floorMesh);
            _normFloorColliders.push({
                type: "flat",
                y: floorY,
                minX: ix0 + 0.05,
                maxX: ix1 - 0.05,
                minZ: iz0 + 0.05,
                maxZ: iz1 - 0.05
            });

            // Simple ramp stairs
            var rampLen = Math.min(6, iD * 0.55);
            var ramp = new THREE.Mesh(
                new THREE.BoxGeometry(stairW, 0.28, rampLen),
                stairMat
            );
            ramp.position.set(stairX0 + stairW / 2, floorY - floorStep / 2, iz0 + rampLen / 2 + 0.3);
            ramp.rotation.x = -Math.atan2(floorStep, rampLen);
            scene.add(ramp);
            _normFloorColliders.push({
                type: "ramp",
                y0: floorY - floorStep,
                y1: floorY,
                minX: stairX0,
                maxX: stairX0 + stairW,
                minZ: iz0 + 0.2,
                maxZ: iz0 + rampLen + 0.4,
                len: rampLen
            });
        }

        // Simple windows (dark panels)
        var floorsVis = Math.max(1, Math.floor(h / 3.2));
        for (var wi = 0; wi < floorsVis; wi++) {
            var wy = 1.4 + wi * 3.2;
            if (wy > h - 0.8) break;
            [-1, 1].forEach(function (side) {
                var wx = x + side * (w / 2 - wallT / 2);
                for (var wj = -1; wj <= 1; wj++) {
                    var wz = z + wj * (d * 0.28);
                    var win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.1), winMat);
                    win.position.set(wx, wy, wz);
                    scene.add(win);
                }
            });
        }
    }

    // Brighter building colors
    var layouts = [
        [14, 10, 12, 11, 10, 0xd8d8d8],
        [-16, 12, 14, 14, 11, 0xcfcfcf],
        [0, 22, 16, 10, 12, 0xe0e0e0],
        [24, 18, 10, 16, 10, 0xd0d0d0],
        [-22, 20, 12, 12, 12, 0xc8c8c8],
        [20, -20, 14, 13, 10, 0xd4d4d4],
        [-18, -18, 11, 11, 11, 0xcacaca],
        [10, -24, 10, 15, 9, 0xd6d6d6],
        [-8, 8, 9, 9, 9, 0xd2d2d2],
        [28, -8, 11, 12, 10, 0xcecece]
    ];
    for (var bi = 0; bi < layouts.length; bi++) {
        var L = layouts[bi];
        building(L[0], L[1], L[2], L[3], L[4], L[5]);
    }

    // Street poles (simple, unchanged)
    function pole(px, pz) {
        var p = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 5.5, 0.28),
            makeNormMat({ color: 0x2a2a2a })
        );
        p.position.set(px, 2.75, pz);
        scene.add(p);
    }
    var poleSpots = [[8, 8], [-8, 8], [8, -8], [-8, -8], [18, 0], [-18, 0], [0, 18], [0, -18]];
    for (var pi = 0; pi < poleSpots.length; pi++) {
        pole(poleSpots[pi][0], poleSpots[pi][1]);
    }
}



/* ===== Roleplay music (Mossy.mp3) ===== */
var _normMusic = null;

function getNormMusic() {
    if (_normMusic) return _normMusic;
    try {
        _normMusic = new Audio("Mossy.mp3");
        _normMusic.loop = true;
        _normMusic.preload = "auto";
        _normMusic.volume = 0.45;
    } catch (e) {
        _normMusic = null;
    }
    return _normMusic;
}

function startNormMusic() {
    var a = getNormMusic();
    if (!a) return;
    try {
        a.currentTime = 0;
        var p = a.play();
        updateNormMusicButton(true);
        if (p && typeof p.catch === "function") {
            p.catch(function () {
                updateNormMusicButton(false);
                var once = function () {
                    try {
                        a.play().then(function () { updateNormMusicButton(true); }).catch(function () {});
                    } catch (e2) {}
                    document.removeEventListener("click", once, true);
                    document.removeEventListener("touchstart", once, true);
                };
                document.addEventListener("click", once, true);
                document.addEventListener("touchstart", once, true);
            });
        }
    } catch (e) {}
}

function stopNormMusic() {
    if (!_normMusic) return;
    try {
        _normMusic.pause();
        _normMusic.currentTime = 0;
    } catch (e) {}
    updateNormMusicButton(false);
}

/** Pause keeps place in the track; Unpause continues from there */
function toggleNormMusicPause() {
    var a = getNormMusic();
    if (!a) return;
    var btn = document.getElementById("normMusicToggleBtn");
    try {
        if (a.paused) {
            var p = a.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
            updateNormMusicButton(true);
        } else {
            a.pause(); // keep currentTime — resume later from same spot
            updateNormMusicButton(false);
        }
    } catch (e) {}
}

function updateNormMusicButton(isPlaying) {
    var btn = document.getElementById("normMusicToggleBtn");
    if (!btn) return;
    if (isPlaying) {
        btn.textContent = "Pause Music";
        btn.classList.remove("is-paused");
    } else {
        btn.textContent = "Unpause Music";
        btn.classList.add("is-paused");
    }
}

window.toggleNormMusicPause = toggleNormMusicPause;


function startNormGameWorld(def) {
    console.log("[Azora] Norm Game engine v40.1 bright+UV");
    try { disposeNormWorld(false); } catch (e) {}
    try { startNormMusic(); } catch (e) {}

    var meName = (typeof getNormDisplayName === "function") ? getNormDisplayName() : "You";
    _normPlayers = [{ id: "me", name: meName, isMe: true, isGuest: (typeof isNormGuest === "function" && isNormGuest()) }];
    try { renderNormPlayerList(); } catch (e) {}

    var chat = document.getElementById("normChatMessages");
    if (chat) {
        chat.innerHTML = "";
        try {
            appendNormChat("System", "v40.1 · brighter + fixed textures · WASD · Space jump", true);
        } catch (e) {}
    }

    if (!_normSession) {
        _normSession = {
            id: (def && def.id) || "azora-roleplay",
            title: (def && def.title) || "Azora Roleplay",
            roomPath: (def && def.roomPath) || "",
            startedAt: Date.now()
        };
    }

    var container = document.getElementById("normGameCanvas");
    if (!container) {
        try { startNormPresence(def); } catch (e) {}
        return;
    }
    if (typeof THREE === "undefined") {
        container.innerHTML = "<p style='color:#fff;padding:24px;text-align:center;font-weight:bold;'>Three.js failed to load. Refresh with internet, then Join again.</p>";
        try { startNormPresence(def); } catch (e) {}
        return;
    }

    while (container.firstChild) container.removeChild(container.firstChild);

    container.style.cssText = "position:relative;display:block;width:100%;height:420px;min-height:420px;background:#5dade2;border-radius:12px;overflow:hidden;border:3px solid #1e60ff;";
    var playEl = document.getElementById("normGamePlay");
    if (playEl) {
        playEl.style.display = "flex";
        playEl.style.minHeight = "480px";
    }

    var w = Math.max(container.clientWidth || 0, 640);
    var h = Math.max(container.clientHeight || 0, 420);

    function finishStart(tex) {
        tex = tex || {};
        try {
            _normScene = new THREE.Scene();
            _normScene.background = new THREE.Color(0x9ec9f0);
            try { addNormLights(_normScene); } catch (eL) {}

            // Closer camera (like before the textures update)
            _normCamera = new THREE.PerspectiveCamera(55, w / h, 0.1, 800);
            _normCamera.position.set(0, 4.5, 9);
            _normCamera.lookAt(0, 1.2, 0);

            _normRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            _normRenderer.setClearColor(0x87b8e8, 1);
            _normRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            _normRenderer.setSize(w, h, false);
            var canvasEl = _normRenderer.domElement;
            canvasEl.style.cssText = "display:block!important;width:100%!important;height:100%!important;position:absolute;left:0;top:0;";
            container.appendChild(canvasEl);

            // Apply anisotropy once renderer exists
            ["grass", "road", "concrete"].forEach(function (k) {
                if (tex[k] && _normRenderer.capabilities) {
                    try {
                        tex[k].anisotropy = Math.min(4, _normRenderer.capabilities.getMaxAnisotropy());
                        tex[k].needsUpdate = true;
                    } catch (e) {}
                }
            });

            // ONLY the real city (no extra cubes / pads) — textures applied inside
            if (typeof buildNormCity === "function") {
                buildNormCity(_normScene, tex);
            }

            // Avatar only
            try {
                _normLocalMesh = makeNormAvatar(typeof getNormAvatarColors === "function" ? getNormAvatarColors() : null);
            } catch (e) { _normLocalMesh = null; }
            if (!_normLocalMesh) {
                _normLocalMesh = new THREE.Group();
                var body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.6), new THREE.MeshBasicMaterial({ color: 0x1e60ff }));
                body.position.y = 1;
                _normLocalMesh.add(body);
                var head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
                head.position.y = 2.35;
                _normLocalMesh.add(head);
            }
            try {
                if (typeof placeNormAvatarOnGround === "function") {
                    placeNormAvatarOnGround(_normLocalMesh, 0, 0, 0);
                } else {
                    _normLocalMesh.position.set(0, 0.05, 0);
                }
            } catch (e) {
                _normLocalMesh.position.set(0, 0.05, 0);
            }
            _normScene.add(_normLocalMesh);
            _normRemoteMeshes = {};

            _normRenderer.render(_normScene, _normCamera);
            console.log("[Azora] textures applied, children:", _normScene.children.length);
        } catch (err) {
            console.error("[Azora] 3D start failed:", err);
            container.innerHTML = "<p style='color:#fff;padding:20px;text-align:center;'>3D failed: " +
                String((err && err.message) || err) + "<br>You can still Leave.</p>";
            try { startNormPresence(def); } catch (e) {}
            return;
        }

        _normKeys = {};
        // Closer follow camera
        _normSession.charYaw = 0;
        _normSession.camDist = 7;
        _normSession.camHeight = 3.2;
        _normSession.moveX = 0;
        _normSession.moveZ = 0;
        _normSession.velY = 0;
        _normSession.onGround = true;
        _normSession.jumpQueued = false;

        function onKeyDown(e) {
            if (!_normSession) return;
            var k = (e.key || "").toLowerCase();
            if (k === "escape") {
                e.preventDefault();
                requestLeaveNormGame();
                return;
            }
            if (k === " " || e.code === "Space") {
                e.preventDefault();
                _normSession.jumpQueued = true;
                return;
            }
            if (k === "w" || k === "a" || k === "s" || k === "d" || k === "p") {
                _normKeys[k] = true;
                e.preventDefault();
            }
        }
        function onKeyUp(e) {
            var k = (e.key || "").toLowerCase();
            if (k === "w" || k === "a" || k === "s" || k === "d" || k === "p") _normKeys[k] = false;
        }
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("keyup", onKeyUp, true);
        _normSession._kd = onKeyDown;
        _normSession._ku = onKeyUp;

        try { setupNormJoysticks(); } catch (e) {}
        try { setupNormJumpButton(); } catch (e) {}

        function animate() {
            _normAnim = requestAnimationFrame(animate);
            if (!_normLocalMesh || !_normRenderer || !_normCamera || !_normSession) return;
            try {
                if (!_normKeys) _normKeys = {};
                var sp = 0.2, turnSp = 0.05;
                if (_normKeys["a"]) _normSession.charYaw += turnSp;
                if (_normKeys["d"]) _normSession.charYaw -= turnSp;
                _normSession.charYaw -= (_normSession.moveX || 0) * 0.05;
                _normLocalMesh.rotation.y = _normSession.charYaw;

                var yaw = _normSession.charYaw || 0;
                var fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
                var throttle = 0;
                if (_normKeys["w"] || _normKeys["p"]) throttle += 1;
                if (_normKeys["s"]) throttle -= 1;
                throttle += (_normSession.moveZ || 0);
                if (throttle > 1) throttle = 1;
                if (throttle < -1) throttle = -1;
                if (Math.abs(throttle) > 0.001) {
                    _normLocalMesh.position.x += fwdX * throttle * sp;
                    _normLocalMesh.position.z += fwdZ * throttle * sp;
                }
                if (typeof resolveNormWallCollisions === "function") {
                    try { resolveNormWallCollisions(_normLocalMesh); } catch (e) {}
                }
                _normLocalMesh.position.x = Math.max(-90, Math.min(90, _normLocalMesh.position.x));
                _normLocalMesh.position.z = Math.max(-90, Math.min(90, _normLocalMesh.position.z));

                if (_normSession.jumpQueued) {
                    _normSession.jumpQueued = false;
                    if (_normSession.onGround) {
                        _normSession.velY = 0.34;
                        _normSession.onGround = false;
                    }
                }
                _normSession.velY = (_normSession.velY || 0) - 0.018;
                _normLocalMesh.position.y += _normSession.velY;
                var supportY = 0.05;
                if (typeof getNormSupportY === "function") {
                    try {
                        supportY = getNormSupportY(_normLocalMesh.position.x, _normLocalMesh.position.z, _normLocalMesh.position.y);
                    } catch (e) {}
                }
                if (_normLocalMesh.position.y <= supportY) {
                    _normLocalMesh.position.y = supportY;
                    _normSession.velY = 0;
                    _normSession.onGround = true;
                } else {
                    _normSession.onGround = false;
                }

                var dist = _normSession.camDist || 7;
                var height = _normSession.camHeight || 3.2;
                var idealX = _normLocalMesh.position.x - Math.sin(yaw) * dist;
                var idealZ = _normLocalMesh.position.z - Math.cos(yaw) * dist;
                var idealY = _normLocalMesh.position.y + height;
                _normCamera.position.x += (idealX - _normCamera.position.x) * 0.22;
                _normCamera.position.y += (idealY - _normCamera.position.y) * 0.22;
                _normCamera.position.z += (idealZ - _normCamera.position.z) * 0.22;
                _normCamera.lookAt(_normLocalMesh.position.x, _normLocalMesh.position.y + 1.4, _normLocalMesh.position.z);

                if (_normSession._smoothRemotes) try { _normSession._smoothRemotes(); } catch (e) {}
                _normRenderer.render(_normScene, _normCamera);
            } catch (animErr) {
                console.error("[Azora] animate error", animErr);
            }
        }
        animate();

        function fitNormCanvas() {
            if (!_normRenderer || !_normCamera || !container) return;
            var rw = Math.max(container.clientWidth || 0, 320);
            var rh = Math.max(container.clientHeight || 0, 280);
            if (rh < 200) {
                rh = 420;
                container.style.height = "420px";
            }
            _normCamera.aspect = rw / rh;
            _normCamera.updateProjectionMatrix();
            _normRenderer.setSize(rw, rh, false);
            _normRenderer.domElement.style.width = "100%";
            _normRenderer.domElement.style.height = "100%";
            _normRenderer.render(_normScene, _normCamera);
        }
        setTimeout(fitNormCanvas, 50);
        setTimeout(fitNormCanvas, 250);
        window.addEventListener("resize", fitNormCanvas);
        _normSession._onResize = fitNormCanvas;

        try { updateNormHudCount(); } catch (e) {}
        try { startNormPresence(def); } catch (e) {}
    }

    loadNormTextures(function (tex) {
        finishStart(tex || {});
    });
}




function updateNormHudCount() {
    var hud = document.getElementById("normHudPlayers");
    if (hud) hud.textContent = "Players: " + _normPlayers.length;
}

function renderNormPlayerList() {
    var el = document.getElementById("normPlayerList");
    if (!el) return;
    el.innerHTML = "";
    if (!_normPlayers.length) {
        el.innerHTML = '<div class="norm-player-row"><span class="np-name">No players yet</span></div>';
        return;
    }
    _normPlayers.forEach(function (p) {
        var row = document.createElement("div");
        row.className = "norm-player-row";
        var label = document.createElement("span");
        label.className = "np-name";
        label.textContent = p.name + (p.isMe ? " (you)" : "");
        row.appendChild(label);
        if (!p.isMe && !p.isGuest && p.name && p.name !== "___" && localStorage.getItem("loggedIn") === "true") {
            var act = document.createElement("div");
            act.className = "np-actions";
            var btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Add Friend";
            btn.onclick = function () {
                if (typeof sendFriendRequest === "function") {
                    try { sendFriendRequest(p.name); } catch (e) { alert("Friend request sent to " + p.name + "!"); }
                } else {
                    alert("Friend request sent to " + p.name + "!");
                }
            };
            act.appendChild(btn);
            row.appendChild(act);
        } else if (!p.isMe && (p.isGuest || p.name === "___")) {
            var tip = document.createElement("span");
            tip.style.fontSize = "11px";
            tip.style.opacity = "0.7";
            tip.textContent = "Guest";
            row.appendChild(tip);
        }
        el.appendChild(row);
    });
    updateNormHudCount();
}

function appendNormChat(user, text, isSystem) {
    var box = document.getElementById("normChatMessages");
    if (!box) return;
    var line = document.createElement("div");
    line.className = "norm-chat-line";
    var u = document.createElement("span");
    u.className = "nc-user" + ((user === "___" || user === "Guest") ? " guest" : "");
    u.textContent = isSystem ? "• " : (user + ": ");
    line.appendChild(u);
    line.appendChild(document.createTextNode(text));
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

function sendNormChat() {
    var input = document.getElementById("normChatInput");
    if (!input) return;
    var msg = (input.value || "").trim();
    if (!msg) return;
    var name = getNormDisplayName();
    appendNormChat(name, msg);
    input.value = "";
    // Broadcast chat when cloud ready
    try {
        if (_normSession && typeof AZORA_CLOUD !== "undefined" && AZORA_CLOUD.isReady && AZORA_CLOUD.isReady()) {
            var base = (AZORA_CLOUD.firebaseUrl || "").replace(/\/$/, "");
            var chatUrl = base + "/azoraNormRooms/" + _normSession.id + "/chat.json";
            fetch(chatUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: name, text: msg, at: Date.now() })
            }).catch(function () {});
        }
    } catch (e) {}
}

/** Real-time presence via Firebase (when configured). No fake players. */
function startNormPresence(def) {
    stopNormPresence();
    _normMyPresenceId = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    _normSession._lastPublishAt = 0;
    _normSession._lastPullAt = 0;

    function publishSelf(force) {
        if (!_normSession) return;
        if (typeof AZORA_CLOUD === "undefined" || !AZORA_CLOUD.isReady || !AZORA_CLOUD.isReady()) return;
        var now = Date.now();
        // Live-ish: publish often while moving, still throttle a little
        if (!force && now - (_normSession._lastPublishAt || 0) < 180) return;
        _normSession._lastPublishAt = now;

        var base = (AZORA_CLOUD.firebaseUrl || "").replace(/\/$/, "");
        var url = base + def.roomPath + "/" + _normMyPresenceId + ".json";
        var pos = _normLocalMesh ? {
            x: _normLocalMesh.position.x,
            y: _normLocalMesh.position.y,
            z: _normLocalMesh.position.z
        } : { x: 0, y: (typeof NORM_AVATAR_FOOT_OFFSET !== "undefined" ? NORM_AVATAR_FOOT_OFFSET : 0.02), z: 0 };
        var yaw = (_normLocalMesh && _normLocalMesh.rotation) ? _normLocalMesh.rotation.y : (_normSession.charYaw || 0);
        var body = {
            name: getNormDisplayName(),
            isGuest: isNormGuest(),
            avatar: getNormAvatarColors(),
            pos: pos,
            yaw: yaw,
            updatedAt: now
        };
        fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }).catch(function () {});
    }

    function pullPlayers() {
        if (!_normSession) return;
        if (typeof AZORA_CLOUD === "undefined" || !AZORA_CLOUD.isReady || !AZORA_CLOUD.isReady()) {
            _normPlayers = [{ id: "me", name: getNormDisplayName(), isMe: true, isGuest: isNormGuest() }];
            renderNormPlayerList();
            return;
        }
        var now = Date.now();
        if (now - (_normSession._lastPullAt || 0) < 250) return;
        _normSession._lastPullAt = now;

        var base = (AZORA_CLOUD.firebaseUrl || "").replace(/\/$/, "");
        var url = base + def.roomPath + ".json";
        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var list = [];
                var tnow = Date.now();
                list.push({ id: "me", name: getNormDisplayName(), isMe: true, isGuest: isNormGuest() });
                if (data && typeof data === "object") {
                    Object.keys(data).forEach(function (pid) {
                        if (pid === _normMyPresenceId) return;
                        var row = data[pid];
                        if (!row || !row.updatedAt) return;
                        // Drop stale presence (>8s — tighter live room)
                        if (tnow - row.updatedAt > 8000) return;
                        list.push({
                            id: pid,
                            name: row.name || "___",
                            isMe: false,
                            isGuest: !!row.isGuest,
                            pos: row.pos,
                            yaw: row.yaw,
                            avatar: row.avatar
                        });
                        if (_normScene && typeof THREE !== "undefined") {
                            if (!_normRemoteMeshes[pid]) {
                                var mesh = makeNormAvatar(row.avatar || getNormAvatarColors());
                                placeNormAvatarOnGround(mesh, (row.pos && row.pos.x) || 0, (row.pos && row.pos.z) || 0, 0);
                                _normScene.add(mesh);
                                _normRemoteMeshes[pid] = mesh;
                                mesh.userData.targetPos = mesh.position.clone();
                                mesh.userData.targetYaw = row.yaw || 0;
                            }
                            var remote = _normRemoteMeshes[pid];
                            if (row.pos && remote) {
                                var footY = (typeof NORM_AVATAR_FOOT_OFFSET !== "undefined" ? NORM_AVATAR_FOOT_OFFSET : 0.02);
                                var ry = (row.pos.y != null) ? row.pos.y : footY;
                                if (ry > 0.15 && ry < 1.5) ry = footY;
                                if (ry < 0) ry = footY;
                                // Store target for smooth lerp each frame (looks live)
                                if (!remote.userData.targetPos) remote.userData.targetPos = remote.position.clone();
                                remote.userData.targetPos.set(row.pos.x || 0, ry, row.pos.z || 0);
                                remote.userData.targetYaw = (typeof row.yaw === "number") ? row.yaw : remote.rotation.y;
                            }
                        }
                    });
                }
                if (_normRemoteMeshes) {
                    Object.keys(_normRemoteMeshes).forEach(function (pid) {
                        var still = list.some(function (p) { return p.id === pid; });
                        if (!still) {
                            try { _normScene.remove(_normRemoteMeshes[pid]); } catch (e) {}
                            delete _normRemoteMeshes[pid];
                        }
                    });
                }
                _normPlayers = list;
                renderNormPlayerList();
            })
            .catch(function () {});
    }

    // Smooth remote avatars every frame toward latest live target
    _normSession._smoothRemotes = function () {
        if (!_normRemoteMeshes) return;
        Object.keys(_normRemoteMeshes).forEach(function (pid) {
            var mesh = _normRemoteMeshes[pid];
            if (!mesh || !mesh.userData.targetPos) return;
            var t = mesh.userData.targetPos;
            mesh.position.x += (t.x - mesh.position.x) * 0.25;
            mesh.position.y += (t.y - mesh.position.y) * 0.25;
            mesh.position.z += (t.z - mesh.position.z) * 0.25;
            if (typeof mesh.userData.targetYaw === "number") {
                // shortest-angle lerp
                var cur = mesh.rotation.y;
                var goal = mesh.userData.targetYaw;
                var diff = goal - cur;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                mesh.rotation.y = cur + diff * 0.25;
            }
        });
    };

    publishSelf(true);
    pullPlayers();
    // Fast live loop (~4–5 updates/sec network, smooth motion in between)
    _normPresenceTimer = setInterval(function () {
        publishSelf(false);
        pullPlayers();
    }, 280);
}

function stopNormPresence() {
    if (_normPresenceTimer) {
        clearInterval(_normPresenceTimer);
        _normPresenceTimer = null;
    }
    // Remove our presence node
    try {
        if (_normMyPresenceId && _normSession && typeof AZORA_CLOUD !== "undefined" && AZORA_CLOUD.isReady && AZORA_CLOUD.isReady()) {
            var base = (AZORA_CLOUD.firebaseUrl || "").replace(/\/$/, "");
            var url = base + (_normSession.roomPath || "") + "/" + _normMyPresenceId + ".json";
            fetch(url, { method: "DELETE" }).catch(function () {});
        }
    } catch (e) {}
    _normMyPresenceId = null;
}

function disposeNormWorld(keepSession) {
    stopNormMusic();
    stopNormPresence();
    if (_normAnim) {
        cancelAnimationFrame(_normAnim);
        _normAnim = null;
    }
    if (_normSession) {
        if (_normSession._kd) {
            window.removeEventListener("keydown", _normSession._kd, true);
            window.removeEventListener("keydown", _normSession._kd, false);
        }
        if (_normSession._ku) {
            window.removeEventListener("keyup", _normSession._ku, true);
            window.removeEventListener("keyup", _normSession._ku, false);
        }
        if (_normSession._onResize) window.removeEventListener("resize", _normSession._onResize);
    }
    if (_normRenderer) {
        try { _normRenderer.dispose(); } catch (e) {}
        _normRenderer = null;
    }
    _normScene = null;
    _normCamera = null;
    _normLocalMesh = null;
    _normRemoteMeshes = {};
    var container = document.getElementById("normGameCanvas");
    if (container) {
        while (container.firstChild) container.removeChild(container.firstChild);
    }
    if (!keepSession) {
        // session cleared by leaveNormGame
    }
}

function leaveNormGame() {
    try { stopNormMusic(); } catch (e) {}
    try {
        var st = document.querySelector(".norm-game-stage");
        if (st) st.classList.remove("show-joysticks");
        var layer = document.getElementById("normJoystickLayer");
        if (layer) layer.style.display = "none";
    } catch (e) {}
    try { disposeNormWorld(false); } catch (e) {}
    _normSession = null;
    _normPlayers = [];
    _normKeys = {};
    try {
        var ov = document.getElementById("normGameOverlay");
        if (ov) { ov.style.display = "none"; ov.style.visibility = "hidden"; }
        var play = document.getElementById("normGamePlay");
        if (play) play.style.display = "none";
        var loading = document.getElementById("normGameLoading");
        if (loading) loading.style.display = "flex";
        var fill = document.getElementById("normLoadFill");
        if (fill) fill.style.width = "0%";
        var confEl = document.getElementById("normLeaveConfirm");
        if (confEl) confEl.style.display = "none";
    } catch (e) {}
    console.log("[Azora] Left Norm Game");
}

window.joinNormGame = joinNormGame;
window.sendNormChat = sendNormChat;
window.requestLeaveNormGame = requestLeaveNormGame;
window.confirmLeaveNormGame = confirmLeaveNormGame;
window.leaveNormGame = leaveNormGame;




// ============================================================
// AI IMAGE GENERATOR — heavily moderated (family / kids safe)
// Violations & errors: ~10s processing then message
// Safe prompts: ~30s processing then image
// ============================================================
var _aiImgBusy = false;
var _aiImgTimer = null;
var _aiImgProgressTimer = null;

/** Returns { blocked: true, reason } or { blocked: false } */
/** Returns { blocked: true, reason, message } or { blocked: false } */
function moderateAIImagePrompt(raw) {
    var text = String(raw || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!text || text.length < 2) {
        return { blocked: true, reason: "empty", message: "Please describe an image (at least a few words)." };
    }

    // TOS / safety blocklist (violence, gore, blood, explicit, etc.)
    var banned = [
        "nude", "naked", "nsfw", "porn", "sex", "sexy", "sexual", "erotic", "hentai", "xxx",
        "onlyfans", "boobs", "breast", "penis", "vagina", "genital",
        "gore", "gory", "blood", "bloody", "bleeding", "dismember", "decapitat", "corpse",
        "murder", "kill", "killing", "stab", "shoot", "gunshot", "torture", "massacre",
        "war crime", "execution", "behead", "guts", "intestines", "body horror",
        "anatomical heart", "real heart", "human organ", "human heart organ",
        "shoot someone", "kill someone", "hurt someone", "attack people",
        "suicide", "self-harm", "self harm", "cut myself",
        "racial slur", "nazi", "terrorist attack", "bomb the",
        "meth lab", "cocaine", "heroin inject",
        "child exploit", "underage nude", "loli", "shota"
    ];

    for (var i = 0; i < banned.length; i++) {
        if (text.indexOf(banned[i]) !== -1) {
            return {
                blocked: true,
                reason: "tos",
                message: "This prompt was rejected. It looks like it breaks Azora's rules (no violence, gore/blood, explicit content, or other harmful requests). Please try a friendly, creative idea instead."
            };
        }
    }
    return { blocked: false };
}

/**
 * Rewrite the user's prompt so the image model draws what people usually mean,
 * and never drifts into gory / medical / anatomical versions of everyday words.
 */
function steerAIImagePrompt(raw) {
    var original = String(raw || "").trim();
    var lower = original.toLowerCase().replace(/\s+/g, " ").trim();

    // "heart" / "a heart" / "heart!" → cute love symbol, NOT a real organ
    var heartOnly = /^(a\s+)?hearts?[!.?]*$/i.test(lower) ||
        /^(draw|make|generate|create)\s+(me\s+)?(a\s+)?hearts?[!.?]*$/i.test(lower);
    if (heartOnly) {
        return "a cute simple cartoon love heart symbol, bright red heart emoji style, clean white background, not anatomical, not a real organ, no veins, no blood, no medical illustration";
    }
    // heart mentioned as symbol / love
    if (/\bheart\b/.test(lower) && !/\b(organ|anatomical|medical|surgery|cardiology|real human)\b/.test(lower)) {
        original = original.replace(/\bhearts?\b/gi, "cute cartoon love-heart symbol");
        original += ", love heart emoji style, not anatomical, not a real organ, no blood, no veins";
    }

    // Common safe rewrites
    if (/^(a\s+)?skull[!.?]*$/i.test(lower)) {
        return "a friendly cartoon skull icon, simple cute style, not scary, no gore";
    }

    return original;
}



function openAIImageGenerator() {
    var ov = document.getElementById("aiImageOverlay");
    if (!ov) return;
    ov.style.display = "flex";
    resetAIImageUI(false);
    var ta = document.getElementById("aiImagePrompt");
    if (ta) setTimeout(function () { ta.focus(); }, 50);
}

function closeAIImageGenerator() {
    if (_aiImgBusy) {
        // Allow close but cancel timers
        clearAIImageTimers();
        _aiImgBusy = false;
    }
    var ov = document.getElementById("aiImageOverlay");
    if (ov) ov.style.display = "none";
    var btn = document.getElementById("aiImageGenerateBtn");
    if (btn) btn.disabled = false;
}

function clearAIImageTimers() {
    if (_aiImgTimer) { clearTimeout(_aiImgTimer); _aiImgTimer = null; }
    if (_aiImgProgressTimer) { clearInterval(_aiImgProgressTimer); _aiImgProgressTimer = null; }
}

function resetAIImageUI(keepPrompt) {
    clearAIImageTimers();
    var st = document.getElementById("aiImageStatus");
    var pw = document.getElementById("aiImageProgressWrap");
    var fill = document.getElementById("aiImageProgressFill");
    var res = document.getElementById("aiImageResult");
    var img = document.getElementById("aiImageResultImg");
    if (st) { st.style.display = "none"; st.className = "ai-img-status"; st.textContent = ""; }
    if (pw) pw.style.display = "none";
    if (fill) fill.style.width = "0%";
    if (res) res.style.display = "none";
    if (img) { img.removeAttribute("src"); img.alt = "Generated image"; }
    if (!keepPrompt) {
        var ta = document.getElementById("aiImagePrompt");
        // keep text so user can edit after reject
    }
    var btn = document.getElementById("aiImageGenerateBtn");
    if (btn) btn.disabled = false;
}

function runAIImageProgress(durationMs, label) {
    var pw = document.getElementById("aiImageProgressWrap");
    var fill = document.getElementById("aiImageProgressFill");
    var txt = document.getElementById("aiImageProgressText");
    if (pw) pw.style.display = "block";
    if (txt) txt.textContent = label || "Processing…";
    if (fill) fill.style.width = "0%";
    var t0 = Date.now();
    if (_aiImgProgressTimer) clearInterval(_aiImgProgressTimer);
    _aiImgProgressTimer = setInterval(function () {
        var p = Math.min(1, (Date.now() - t0) / durationMs);
        if (fill) fill.style.width = Math.round(p * 100) + "%";
        if (p >= 1 && _aiImgProgressTimer) {
            clearInterval(_aiImgProgressTimer);
            _aiImgProgressTimer = null;
        }
    }, 100);
}

function showAIImageStatus(kind, message) {
    var st = document.getElementById("aiImageStatus");
    if (!st) return;
    st.style.display = "block";
    st.className = "ai-img-status " + (kind || "info");
    st.textContent = message;
}

function startAIImageGenerate() {
    if (_aiImgBusy) return;
    var ta = document.getElementById("aiImagePrompt");
    var prompt = ta ? ta.value.trim() : "";
    var mod = moderateAIImagePrompt(prompt);

    // Immediate empty check (still show brief process for consistency on tos/error only)
    if (mod.blocked && mod.reason === "empty") {
        showAIImageStatus("error", mod.message);
        return;
    }

    _aiImgBusy = true;
    var btn = document.getElementById("aiImageGenerateBtn");
    if (btn) btn.disabled = true;
    var res = document.getElementById("aiImageResult");
    if (res) res.style.display = "none";
    showAIImageStatus("info", "Checking your prompt and preparing…");

    // TOS violation → 10 seconds processing, then reject
    if (mod.blocked && mod.reason === "tos") {
        runAIImageProgress(10000, "Reviewing prompt against Azora rules…");
        _aiImgTimer = setTimeout(function () {
            clearAIImageTimers();
            _aiImgBusy = false;
            if (btn) btn.disabled = false;
            var pw = document.getElementById("aiImageProgressWrap");
            if (pw) pw.style.display = "none";
            showAIImageStatus("rejected", mod.message);
        }, 10000);
        return;
    }

    // Safe path → ~30 seconds, then generate
    runAIImageProgress(30000, "Generating your image… this takes about 30 seconds");
    showAIImageStatus("info", "Creating your image from your description…");

    _aiImgTimer = setTimeout(function () {
        finishAIImageGenerate(prompt);
    }, 30000);
}

function finishAIImageGenerate(prompt) {
    clearAIImageTimers();
    var btn = document.getElementById("aiImageGenerateBtn");
    var pw = document.getElementById("aiImageProgressWrap");

    // Final safety re-check
    var mod = moderateAIImagePrompt(prompt);
    if (mod.blocked) {
        _aiImgBusy = false;
        if (btn) btn.disabled = false;
        if (pw) pw.style.display = "none";
        showAIImageStatus("rejected", mod.message || "This prompt was rejected.");
        return;
    }

    // Build a safe image request — safety tags only (no extra subjects like "family")
    // Steer ambiguous words (e.g. "heart" → cute symbol, not organ) + safety tags (no extra subjects)
    var steered = (typeof steerAIImagePrompt === "function") ? steerAIImagePrompt(prompt) : prompt;
    var safePrompt = steered + ", high quality, clean art, appropriate for all ages, no violence, no gore, no blood, no medical organ illustration, no nsfw";
    var url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(safePrompt) +
        "?width=768&height=768&nologo=true&safe=true&seed=" + Math.floor(Math.random() * 1e9);

    var img = document.getElementById("aiImageResultImg");
    var res = document.getElementById("aiImageResult");
    if (!img || !res) {
        _aiImgBusy = false;
        if (btn) btn.disabled = false;
        showAIImageStatus("error", "Something went wrong");
        return;
    }

    // Load with timeout → error path ~ already used 30s; if fail show error after short wait to match "10s on error" feel from start of load
    var loadStart = Date.now();
    var settled = false;

    function fail() {
        if (settled) return;
        settled = true;
        var waitLeft = Math.max(0, 10000 - (Date.now() - loadStart));
        // Error presentation: about 10 seconds of "error processing" if load fails fast
        runAIImageProgress(Math.max(waitLeft, 800), "Something went wrong — finishing…");
        showAIImageStatus("info", "Having trouble finishing the image…");
        setTimeout(function () {
            clearAIImageTimers();
            _aiImgBusy = false;
            if (btn) btn.disabled = false;
            if (pw) pw.style.display = "none";
            res.style.display = "none";
            showAIImageStatus("error", "Something went wrong");
        }, Math.max(waitLeft, 800));
    }

    function ok() {
        if (settled) return;
        settled = true;
        clearAIImageTimers();
        _aiImgBusy = false;
        if (btn) btn.disabled = false;
        if (pw) pw.style.display = "none";
        res.style.display = "block";
        showAIImageStatus("ok", "Done! Here's your image.");
    }

    img.onload = ok;
    img.onerror = fail;
    img.src = url;

    // Hard timeout 45s on network hang
    setTimeout(function () {
        if (!settled) fail();
    }, 45000);
}

window.openAIImageGenerator = openAIImageGenerator;
// Inside script.js (AI Image Generator Section)
function handleAIImageGenerate(promptText) {
    showAIImageStatus("info", "Generating image with Gemini...");

    // Send request to your server / backend function handling the Gemini Image API:
    fetch('/api/gemini-image-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
    })
    .then(res => res.json())
    .then(data => {
        if (data.imageUrl) {
            document.getElementById("aiImageResultImg").src = data.imageUrl;
            showAIImageStatus("ok", "Done! Here's your image.");
        } else {
            showAIImageStatus("error", "Unable to generate image.");
        }
    })
    .catch(() => showAIImageStatus("error", "Something went wrong."));
}
window.closeAIImageGenerator = closeAIImageGenerator;
window.startAIImageGenerate = startAIImageGenerate;
window.moderateAIImagePrompt = moderateAIImagePrompt;
window.steerAIImagePrompt = steerAIImagePrompt;
