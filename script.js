// Global Client State Management Matrix
let currentLoggedInUser = null;
let balances = { coins: 100, diamonds: 0, cubes: 0 };
let userCreatedGames = []; // Stores the database array of built games

// Mock database for checking existing local profiles
function saveUserProfileToPlatform() {
    if (!currentLoggedInUser) return;
    
    const profileData = {
        balances: balances,
        games: userCreatedGames
    };
    
    // Save to browser database under the unique user handle key
    localStorage.setItem(`azora_profile_${currentLoggedInUser.toLowerCase()}`, JSON.stringify(profileData));
    console.log(`💾 Platform Sync: Data safely committed for player [${currentLoggedInUser}]`);
}

function loadUserProfileFromPlatform(username) {
    const backupData = localStorage.getItem(`azora_profile_${username.toLowerCase()}`);
    
    if (backupData) {
        const parsed = JSON.parse(backupData);
        balances = parsed.balances || { coins: 100, diamonds: 0, cubes: 0 };
        userCreatedGames = parsed.games || [];
        console.log(`🛸 Platform Matrix: Profile data successfully restored for [${username}] without loss.`);
    } else {
        // Fresh brand new user profile initialization parameters
        balances = { coins: 100, diamonds: 0, cubes: 0 };
        userCreatedGames = [];
        console.log(`✨ Welcome! New platform save node instantiated for [${username}].`);
    }
    
    refreshBalanceDisplay();
}

// Custom security verification matrix for input profiles
const AZAFN_BLOCKED_KEYWORDS = ["hack", "exploit", "nuke", "bypass", "crash", "stolen"];

let azaFnState = {
    distributionSystem: null,
    dimensionMode: null,
    gameDescription: "",
    saveSystemChoice: null
};

function toggleAzaFnPopup() {
    const popup = document.getElementById("azafnPopup");
    if (!popup) return;

    if (popup.style.display === "none" || popup.style.display === "") {
        popup.style.display = "flex";
    } else {
        popup.style.display = "none";
    }
}
function pushChatMessage(sender, text) {
    const stream = document.getElementById("azafnChatStream");
    const msg = document.createElement("div");
    msg.style.padding = "10px";
    msg.style.borderRadius = "8px";
    msg.style.maxWidth = "85%";
    msg.style.fontSize = "14px";
    msg.style.lineHeight = "1.4";
    
    if (sender === "ai") {
        msg.style.background = "rgba(0, 191, 255, 0.15)";
        msg.style.borderLeft = "3px solid #00bfff";
        msg.style.alignSelf = "flex-start";
        msg.innerHTML = `<strong>🤖 AzaFn-1.0:</strong> ${text}`;
    } else {
        msg.style.background = "rgba(255, 255, 255, 0.1)";
        msg.style.borderRight = "3px solid #fff";
        msg.style.alignSelf = "flex-end";
        msg.innerHTML = `<strong>👤 You:</strong> ${text}`;
    }
    
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
}

function bootAzaFnSystem() {
    pushChatMessage("ai", "Connection established. I am ready to construct your project module. Select your target distribution format:");
    
    const interactiveArea = document.getElementById("azafnInteractions");
    interactiveArea.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <button onclick="handleSystemSelect('norm', 'Norm Game System')" style="text-align:left; padding:10px; background:#070a12; color:#fff; border:1px solid #00bfff; cursor:pointer; border-radius:6px;">🎯 Norm Game System (Standard Grid Layout)</button>
            <button onclick="handleSystemSelect('quick', 'Quick Games Feed')" style="text-align:left; padding:10px; background:#070a12; color:#fff; border:1px solid #00ebd4; cursor:pointer; border-radius:6px;">🚀 Quick Games Feed (Vertical TikTok Scroll Engine)</button>
        </div>
    `;
}

function handleSystemSelect(sysType, printableName) {
    azaFnState.distributionSystem = sysType;
    pushChatMessage("user", `I want to create a game using the ${printableName}.`);
    
    document.getElementById("azafnInteractions").innerHTML = "";
    document.getElementById("azafnInputContainer").style.display = "flex";
    
    setTimeout(() => {
        pushChatMessage("ai", "Understood! Type out what your game looks like, its core loops, or tell me to generate asset images:");
    }, 500);
}

function processUserTextPrompt() {
    const inputField = document.getElementById("azafnUserPrompt");
    const userText = inputField.value.trim();
    if (!userText) return;
    
    pushChatMessage("user", userText);
    inputField.value = ""; 
    
    // Safety Shield Check
    const cleanCheckText = userText.toLowerCase();
    let flaggedWord = "";
    let containsViolations = AZAFN_BLOCKED_KEYWORDS.some(word => {
        if (cleanCheckText.includes(word)) { flaggedWord = word; return true; }
        return false;
    });
    
    if (containsViolations) {
        const stream = document.getElementById("azafnChatStream");
        const errorMsg = document.createElement("div");
        errorMsg.style.padding = "10px";
        errorMsg.style.borderRadius = "8px";
        errorMsg.style.maxWidth = "85%";
        errorMsg.style.background = "rgba(255, 59, 48, 0.15)";
        errorMsg.style.borderLeft = "3px solid #ff3b30";
        errorMsg.style.color = "#ff8080";
        errorMsg.style.alignSelf = "flex-start";
        errorMsg.style.fontSize = "14px";
        errorMsg.innerHTML = `<strong>⚠️ AzaFn Shield Error:</strong> Generation request failed. Forbidden terminology detected ("${flaggedWord}"). Refinement needed for system creation.`;
        
        stream.appendChild(errorMsg);
        stream.scrollTop = stream.scrollHeight;
        return; 
    }
    
    azaFnState.gameDescription += " " + userText;
    document.getElementById("azafnInputContainer").style.display = "none";
    
    // Image Asset Matrix Engine Execution
    if (cleanCheckText.includes("image") || cleanCheckText.includes("picture") || cleanCheckText.includes("draw")) {
        pushChatMessage("ai", "🎨 Generating safe dynamic image matrix components based on prompt parameters...");
        
        setTimeout(() => {
            const stream = document.getElementById("azafnChatStream");
            const imgContainer = document.createElement("div");
            imgContainer.style.alignSelf = "flex-start";
            imgContainer.style.margin = "8px 0";
            imgContainer.style.border = "2px solid #00bfff";
            imgContainer.style.borderRadius = "8px";
            imgContainer.style.overflow = "hidden";
            imgContainer.style.maxWidth = "85%";
            
            imgContainer.innerHTML = `
                <div style="background:#00bfff; color:#000; padding:4px 8px; font-size:11px; font-weight:bold;">🤖 AzaFn Canvas Mesh Render</div>
                <div style="width: 220px; height: 130px; background: linear-gradient(135deg, #111827, #1f2937); display:flex; justify-content:center; align-items:center; color:#888; font-style:italic; font-size:12px; padding:10px; text-align:center;">
                    [2D/3D Concept Asset Geometry Array Compiled]
                </div>
            `;
            stream.appendChild(imgContainer);
            stream.scrollTop = stream.scrollHeight;
            
            evaluateDimensionParameters();
        }, 1200);
    } else {
        evaluateDimensionParameters();
    }
}

function evaluateDimensionParameters() {
    const fullConcept = azaFnState.gameDescription.toLowerCase();
    const mentions2D = fullConcept.includes("2d") || fullConcept.includes("two dimensional");
    const mentions3D = fullConcept.includes("3d") || fullConcept.includes("three dimensional");
    
    if (mentions2D && !mentions3D) {
        azaFnState.dimensionMode = "2d";
        pushChatMessage("ai", "Spatial layout matrix scanned: 2D viewports established.");
        triggerSaveSystemAnalysis();
    } else if (mentions3D && !mentions2D) {
        azaFnState.dimensionMode = "3d";
        pushChatMessage("ai", "Spatial layout matrix scanned: 3D depth meshes established.");
        triggerSaveSystemAnalysis();
    } else {
        pushChatMessage("ai", "I've logged your game parameters! However, I can't determine whether it's 2D or 3D gameplay. Select your platform matrix mode:");
        
        const interactiveArea = document.getElementById("azafnInteractions");
        interactiveArea.innerHTML = `
            <div style="display: flex; gap: 8px;">
                <button onclick="handleDimensionSelection('2d')" style="flex:1; padding:10px; background:#070a12; color:#fff; border:1px solid #ffd700; cursor:pointer; border-radius:6px;">🖼️ 2D Engine Mode</button>
                <button onclick="handleDimensionSelection('3d')" style="flex:1; padding:10px; background:#070a12; color:#fff; border:1px solid #ffd700; cursor:pointer; border-radius:6px;">📦 3D Engine Mode</button>
            </div>
        `;
    }
}

function handleDimensionSelection(dim) {
    azaFnState.dimensionMode = dim;
    pushChatMessage("user", `Set the framework engine constraints to ${dim.toUpperCase()}.`);
    document.getElementById("azafnInteractions").innerHTML = "";
    
    setTimeout(() => { triggerSaveSystemAnalysis(); }, 500);
}

function triggerSaveSystemAnalysis() {
    pushChatMessage("ai", "Would you like to have a Saving System inside your game? A Saving System on Azora automatically saves player progress inside and outside the game. When someone logs off, the engine securely handles data transfers for an extra 3 seconds on average before disconnecting.");
    
    const interactiveArea = document.getElementById("azafnInteractions");
    interactiveArea.innerHTML = `
        <div style="display: flex; gap: 8px;">
            <button onclick="handleSaveFinalization(true)" style="flex:1; padding:10px; background:#1b4332; color:#fff; border:1px solid #4cd964; font-weight:bold; cursor:pointer; border-radius:6px;">💾 Ingest Save Protocol</button>
            <button onclick="handleSaveFinalization(false)" style="flex:1; padding:10px; background:#4a1212; color:#fff; border:1px solid #ff3b30; cursor:pointer; border-radius:6px;">Skip System</button>
        </div>
    `;
}

function handleSaveFinalization(wantsSave) {
    azaFnState.saveSystemChoice = wantsSave;
    pushChatMessage("user", wantsSave ? "Confirming injection of the 3-second secure save module." : "Bypass data save integration modules.");
    document.getElementById("azafnInteractions").innerHTML = "";
    
    if (currentLoggedInUser) {
        userCreatedGames.push({
            name: "AI Project Bundle #" + (userCreatedGames.length + 1),
            type: azaFnState.distributionSystem,
            dimensions: azaFnState.dimensionMode,
            saveSystem: wantsSave
        });
        saveUserProfileToPlatform();
    }
    
    setTimeout(() => {
        pushChatMessage("ai", "Configuration locked! Click the builder compiler link below to begin designing workspace variables.");
        document.getElementById("launchStudioBtn").style.display = "block";
    }, 600);
}

// Taken usernames catalog for nice error notification verification
const registeredUsernames = ["603blox", "leemoon", "azora", "system", "administrator"];

// Clothing Inventory Uploaded by Official AI Account: "Azora"
const aiClothingCatalog = [
    { id: "c1", name: "Official Cyber Cloak", price: 25, type: "Shirt" },
    { id: "c2", name: "AI Enforcement Matrix Boots", price: 40, type: "Pants" },
    { id: "c3", name: "Moderator Oversight Cap", price: 15, type: "Hat" },
    { id: "c4", name: "Azora Admin Neon Hoodie", price: 50, type: "Shirt" },
    { id: "c5", name: "Quantum Security Trousers", price: 35, type: "Pants" }
];

document.addEventListener("DOMContentLoaded", () => {
    initThreeJsAvatar();
    refreshBalanceDisplay();
    generateMarketItems();
});

// --- Three.js Avatar Initialization Routine ---
let scene, camera, renderer, avatarCube;
function initThreeJsAvatar() {
    const container = document.getElementById("avatar-container");
    if (!container) return;

    container.innerHTML = "";

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1.5, 2, 0.8);
    const material = new THREE.MeshStandardMaterial({ color: 0x00bfff, roughness: 0.4, metalness: 0.2 });
    avatarCube = new THREE.Mesh(geometry, material);
    scene.add(avatarCube);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    animateThreeJsViewport();
}

function animateThreeJsViewport() {
    requestAnimationFrame(animateThreeJsViewport);
    if (avatarCube) {
        avatarCube.rotation.y += 0.01;
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.addEventListener("resize", () => {
    const container = document.getElementById("avatar-container");
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// --- Authentication Overlay Form Handlers ---
let authMode = "create";
function openAuthModal(mode) {
    authMode = mode;
    document.getElementById("accountOverlay").style.display = "flex";
    
    const title = document.getElementById("popupTitle");
    const sub = document.getElementById("popupSubtitle");
    const btn = document.getElementById("authSubmitBtn");
    
    if (mode === "create") {
        title.innerText = "Join Azora Platform";
        sub.innerText = "Create a custom node key entry to initialize network identity arrays.";
        btn.innerText = "Instantiate Account";
    } else {
        title.innerText = "Log In to Account";
        sub.innerText = "Provide valid credentials to hook current configuration settings.";
        btn.innerText = "Establish Login";
    }
}

function closeAccountModal() {
    document.getElementById("accountOverlay").style.display = "none";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

function handleAuthSubmission() {
    const userVal = document.getElementById("username").value.trim();
    const passVal = document.getElementById("password").value;

    if (!userVal || !passVal) {
        alert("Form processing exception: Username and password entries cannot remain vacant.");
        return;
    }

    if (authMode === "create") {
        if (registeredUsernames.includes(userVal.toLowerCase())) {
            alert(`⚠️ Core Security Intercept: The identity index "${userVal}" is already registered in our production table.`);
            return;
        }
        currentLoggedInUser = userVal;
        alert(`✨ Profile Node successfully generated: Welcome to Azora, ${userVal}!`);
    } else {
        currentLoggedInUser = userVal;
        alert(`🔑 Access Granted: Welcome back, ${userVal}. Configuration profiles successfully mounted.`);
    }

    closeAccountModal();
    document.getElementById("guestButtons").style.display = "none";
    document.getElementById("userPanel").style.display = "block";
    
    loadUserProfileFromPlatform(currentLoggedInUser);
}

function logoutUser() {
    alert(`🔌 Session Termination: Securely disconnecting profile context for [${currentLoggedInUser}].`);
    currentLoggedInUser = null;
    balances = { coins: 100, diamonds: 0, cubes: 0 };
    userCreatedGames = [];
    
    document.getElementById("userPanel").style.display = "none";
    document.getElementById("guestButtons").style.display = "block";
    
    refreshBalanceDisplay();
}

// --- Platform Asset Conversion Exchanges ---
function openConvertModal() {
    document.getElementById("convertOverlay").style.display = "flex";
}

function closeConvertModal() {
    document.getElementById("convertOverlay").style.display = "none";
    document.getElementById("convertAmount").value = "";
}

function processAssetConversion() {
    const amt = parseInt(document.getElementById("convertAmount").value);
    if (isNaN(amt) || amt <= 0) {
        alert("Conversion logic error: Input variable evaluation requires a valid integer integer count.");
        return;
    }

    if (balances.coins < amt) {
        alert("Transaction failed: Insufficient standard resource balances to process balance conversion arrays.");
        return;
    }

    balances.coins -= amt;
    const gainedDiamonds = Math.floor(amt / 10);
    balances.diamonds += gainedDiamonds;

    alert(`💱 Matrix Swap Complete: Converted ${amt} AzoraCoins into ${gainedDiamonds} high-tier AzoraDiamonds.`);
    saveUserProfileToPlatform();
    refreshBalanceDisplay();
    closeConvertModal();
}

// --- Storefront Interface Generators ---
function generateMarketItems() {
    const grid = document.getElementById("marketGrid");
    if (!grid) return;
    grid.innerHTML = "";

    aiClothingCatalog.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = "market-item";
        itemBox.innerHTML = `
            <h4>${item.name}</h4>
            <div class="market-author">Uploaded by: Azora AI 🤖</div>
            <p style="font-size:12px; margin:5px 0;">🏷️ Type: ${item.type}</p>
            <button style="font-size:11px; padding:4px 8px;" onclick="buyMarketItem('${item.name}', ${item.price})">🪙 ${item.price}</button>
        `;
        grid.appendChild(itemBox);
    });
}

function buyMarketItem(name, price) {
    if (!currentLoggedInUser) { alert("Please log in first."); return; }
    if (balances.coins < price) { alert("Insufficient AzoraCoins."); return; }
    balances.coins -= price;
    refreshBalanceDisplay();
    saveUserProfileToPlatform();
    alert(`🛍️ Successfully acquired "${name}" from official AI account "Azora"! Asset added to wardrobe matrix.`);
}

function refreshBalanceDisplay() {
    document.getElementById("displayCoins").innerText = balances.coins;
    document.getElementById("displayDiamonds").innerText = balances.diamonds;
    document.getElementById("displayCubes").innerText = balances.cubes;
}

// --- Hook for external System Appeals Interface Integration ---
window.submitAppealHook = function(username, text) {
    console.log("Transmission redirected to target system channel...");
    setTimeout(() => {
        alert(`📨 [System Account Auto-Response]: Hello ${username},\n\nYour ban/termination appeal context has been fully analyzed by the automated internal System ledger pipeline.\n\nVerdict Status: [ACCEPTED]. Your core permissions have been fully reinstated. Please adhere closely to safety catalog guidelines going forward.`);
    }, 1500);
};