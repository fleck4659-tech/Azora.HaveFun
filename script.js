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

// Create the container automatically
const container = document.createElement('div');
container.id = 'falling-text-container';
document.body.appendChild(container);

// Function to spawn a random word
function spawnWord() {
    if (!fallingTextActive) return;

    const word = document.createElement('div');
    word.classList.add('falling-word');
    word.innerText = phrases[Math.floor(Math.random() * phrases.length)];

    const startX = Math.random() * (window.innerWidth - 100);
    const fontSize = Math.random() * 16 + 16;
    
    word.style.left = startX + 'px';
    word.style.top = '-50px';
    word.style.fontSize = fontSize + 'px';

    container.appendChild(word);

    let currentY = -50;
    let currentRotation = Math.random() * 360;
    const rotSpeed = (Math.random() - 0.5) * rotationSpeed * 2;

    function animate() {
        if (!fallingTextActive) {
            word.remove();
            return;
        }

        currentY += fallSpeed;
        currentRotation += rotSpeed;

        word.style.top = currentY + 'px';
        word.style.transform = `rotate(${currentRotation}deg)`;

        if (currentY < window.innerHeight) {
            requestAnimationFrame(animate);
        } else {
            word.remove();
        }
    }

    requestAnimationFrame(animate);
}

function startFallingText() {
    if (!spawnInterval) {
        spawnInterval = setInterval(spawnWord, 800);
    }
}

function stopFallingText() {
    clearInterval(spawnInterval);
    spawnInterval = null;
    container.innerHTML = '';
}

// ------------------------------------
// Authentication & Account System Mode
// ------------------------------------
let isLoginMode = false;

function openCreateAccount() {
    isLoginMode = false;
    document.getElementById("popupTitle").innerText = "Join Azora";
    document.getElementById("popupSubtitle").style.display = "block";
    document.getElementById("confirmPassword").style.display = "block";
    document.getElementById("email").style.display = "block";
    document.querySelector(".checkbox").style.display = "flex";
    document.getElementById("accountSubmitBtn").innerText = "Create Account";
    document.getElementById("switchText").innerText = "Already have an account?";
    document.getElementById("switchLink").innerText = "Log In";
    document.getElementById("accountError").innerText = "";
    document.getElementById("accountOverlay").style.display = "flex";
}

function openLogin() {
    isLoginMode = true;
    document.getElementById("popupTitle").innerText = "Log In to Azora";
    document.getElementById("popupSubtitle").style.display = "none";
    document.getElementById("confirmPassword").style.display = "none";
    document.getElementById("email").style.display = "none";
    document.querySelector(".checkbox").style.display = "none";
    document.getElementById("accountSubmitBtn").innerText = "Log In";
    document.getElementById("switchText").innerText = "Don't have an account?";
    document.getElementById("switchLink").innerText = "Sign Up";
    document.getElementById("accountError").innerText = "";
    document.getElementById("accountOverlay").style.display = "flex";
}

function toggleAccountMode(e) {
    e.preventDefault();
    if (isLoginMode) {
        openCreateAccount();
    } else {
        openLogin();
    }
}

function closeAccountModal() {
    document.getElementById("accountOverlay").style.display = "none";
}

function openTOS(e) {
    e.preventDefault();
    document.getElementById("tosOverlay").style.display = "flex";
}

function closeTOS() {
    document.getElementById("tosOverlay").style.display = "none";
}

function handleAccountSubmit() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;
    const confirmPass = document.getElementById("confirmPassword").value;
    const tos = document.getElementById("tosCheckbox").checked;
    const err = document.getElementById("accountError");

    if (!user || !pass) {
        err.innerText = "Please fill in all required fields.";
        return;
    }

    if (!isLoginMode) {
        if (pass !== confirmPass) {
            err.innerText = "Passwords do not match.";
            return;
        }
        if (!tos) {
            err.innerText = "You must agree to the Terms of Service.";
            return;
        }

        // Store account mock details
        const accountData = {
            username: user,
            avatar: { head: "#ffcc00", torso: "#1e60ff", leftArm: "#ffcc00", rightArm: "#ffcc00", leftLeg: "#00ebd4", rightLeg: "#00ebd4" }
        };
        localStorage.setItem("azoraAccount", JSON.stringify(accountData));
        localStorage.setItem("loggedIn", "true");
    } else {
        localStorage.setItem("loggedIn", "true");
    }

    closeAccountModal();
    location.reload();
}

function handleLogout() {
    localStorage.removeItem("loggedIn");
    location.reload();
}

// ------------------------------------
// Social Dropdown & Developer Settings
// ------------------------------------
function toggleDropdown() {
    document.getElementById("socialDropdown").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function toggleCharacterService() {
    const toggle = document.getElementById("charServiceToggle");
    localStorage.setItem("charServiceEnabled", toggle.checked);
    alert(toggle.checked ? "BasicCharacterService Enabled!" : "BasicCharacterService Disabled!");
}

function handleCreateClick() {
    if (window.innerWidth <= 1024) {
        window.location.href = "creator.html";
    } else {
        window.open("creator.html", "_blank");
    }
}

// ------------------------------------
// Search Modal System
// ------------------------------------
function openSearchModal() {
    document.getElementById("searchOverlay").style.display = "flex";
    filterSearchResults();
}

function closeSearchModal() {
    document.getElementById("searchOverlay").style.display = "none";
}

function switchSearchTab(tab) {
    currentSearchTab = tab;
    document.getElementById("tabUsers").classList.toggle("active", tab === 'users');
    document.getElementById("tabGames").classList.toggle("active", tab === 'games');
    filterSearchResults();
}

function filterSearchResults() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = "";

    const items = database[currentSearchTab];
    const filtered = items.filter(item => {
        const title = item.username || item.title;
        return title.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="search-result-item">No ${currentSearchTab} found.</div>`;
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "search-result-item";
        if (currentSearchTab === "users") {
            div.innerHTML = `<span>👤 <strong>${item.username}</strong></span><a href="${item.profileLink}" target="_blank">View Profile</a>`;
        } else {
            div.innerHTML = `<span>🎮 <strong>${item.title}</strong> <small>by ${item.author}</small></span><a href="${item.link}">Play</a>`;
        }
        resultsContainer.appendChild(div);
    });
}

// ------------------------------------
// Settings Modal System
// ------------------------------------
function openSettingsModal() {
    document.getElementById("settingsOverlay").style.display = "flex";
}

function closeSettingsModal() {
    document.getElementById("settingsOverlay").style.display = "none";
}

function toggleFallingTextSetting() {
    const enabled = document.getElementById("fallingTextToggle").checked;
    fallingTextActive = enabled;
    if (enabled) {
        startFallingText();
    } else {
        stopFallingText();
    }
}

// ------------------------------------
// 3D Avatar Customizer Studio (Three.js)
// ------------------------------------
let scene, camera, renderer;
let avatarParts = {};

function openAvatarCustomizer() {
    const studio = document.getElementById("avatarStudio");
    studio.style.display = studio.style.display === "none" ? "block" : "none";

    if (studio.style.display === "block" && !scene) {
        init3DAvatar();
    }
}

function init3DAvatar() {
    const container = document.getElementById("avatarCanvasContainer");
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 1, 8);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(300, 300);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 4, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Create Blocky Character
    const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const torsoGeo = new THREE.BoxGeometry(1.4, 1.8, 0.8);
    const limbGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);

    avatarParts.head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
    avatarParts.head.position.y = 1.5;

    avatarParts.torso = new THREE.Mesh(torsoGeo, new THREE.MeshLambertMaterial({ color: 0x1e60ff }));
    avatarParts.torso.position.y = 0;

    avatarParts.leftArm = new THREE.Mesh(limbGeo, new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
    avatarParts.leftArm.position.set(-1.1, 0, 0);

    avatarParts.rightArm = new THREE.Mesh(limbGeo, new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
    avatarParts.rightArm.position.set(1.1, 0, 0);

    avatarParts.leftLeg = new THREE.Mesh(limbGeo, new THREE.MeshLambertMaterial({ color: 0x00ebd4 }));
    avatarParts.leftLeg.position.set(-0.4, -1.8, 0);

    avatarParts.rightLeg = new THREE.Mesh(limbGeo, new THREE.MeshLambertMaterial({ color: 0x00ebd4 }));
    avatarParts.rightLeg.position.set(0.4, -1.8, 0);

    const avatarGroup = new THREE.Group();
    Object.values(avatarParts).forEach(part => avatarGroup.add(part));
    scene.add(avatarGroup);

    function animate() {
        requestAnimationFrame(animate);
        avatarGroup.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

function updateAvatarColors() {
    if (!avatarParts.head) return;
    avatarParts.head.material.color.set(document.getElementById("colorHead").value);
    avatarParts.torso.material.color.set(document.getElementById("colorTorso").value);
    avatarParts.leftArm.material.color.set(document.getElementById("colorLeftArm").value);
    avatarParts.rightArm.material.color.set(document.getElementById("colorRightArm").value);
    avatarParts.leftLeg.material.color.set(document.getElementById("colorLeftLeg").value);
    avatarParts.rightLeg.material.color.set(document.getElementById("colorRightLeg").value);
}

function saveAvatarState() {
    const account = JSON.parse(localStorage.getItem("azoraAccount")) || {};
    account.avatar = {
        head: document.getElementById("colorHead").value,
        torso: document.getElementById("colorTorso").value,
        leftArm: document.getElementById("colorLeftArm").value,
        rightArm: document.getElementById("colorRightArm").value,
        leftLeg: document.getElementById("colorLeftLeg").value,
        rightLeg: document.getElementById("colorRightLeg").value
    };
    localStorage.setItem("azoraAccount", JSON.stringify(account));
    alert("Avatar colors saved successfully!");
}

// ------------------------------------
// Initialization
// ------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    startFallingText();

    // Check if user is logged in & load state
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
        const account = JSON.parse(localStorage.getItem("azoraAccount"));
        if (account) {
            document.getElementById("guestButtons").style.display = "none";
            document.getElementById("userPanel").style.display = "flex";
            document.getElementById("profileButton").innerHTML = "👤 " + account.username;
            
            if (account.avatar) {
                document.getElementById("colorHead").value = account.avatar.head || "#ffcc00";
                document.getElementById("colorTorso").value = account.avatar.torso || "#1e60ff";
                document.getElementById("colorLeftArm").value = account.avatar.leftArm || "#ffcc00";
                document.getElementById("colorRightArm").value = account.avatar.rightArm || "#ffcc00";
                document.getElementById("colorLeftLeg").value = account.avatar.leftLeg || "#00ebd4";
                document.getElementById("colorRightLeg").value = account.avatar.rightLeg || "#00ebd4";
                updateAvatarColors();
            }
        }
    } else {
        // Open Create Account modal at the 5-second mark
        setTimeout(() => {
            if (typeof openCreateAccount === "function") {
                openCreateAccount();
            } else {
                // Fallback display if helper function is absent
                const accountModal = document.getElementById("accountOverlay");
                if (accountModal) accountModal.style.display = "flex";
            }
        }, 5000);
    }
    
    const charServiceEnabled = localStorage.getItem("charServiceEnabled");
    if (charServiceEnabled === "true" && document.getElementById("charServiceToggle")) {
        document.getElementById("charServiceToggle").checked = true;
    }
});