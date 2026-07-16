// Configuration - Adjust these to change speed and phrases
const fallSpeed = 2; // Higher number = faster fall
const rotationSpeed = 0.5; // Higher number = faster rotation
const phrases = ["wow!", "this is cool!", "awesome!", "amazing!", "leemoon!"];

// Create the container automatically
const container = document.createElement('div');
container.id = 'falling-text-container';
document.body.appendChild(container);

// Function to spawn a random word
function spawnWord() {
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
setInterval(spawnWord, 10000);

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
function openCreateAccount() {
    document.getElementById("accountOverlay").style.display = "flex";
    document.getElementById("popupTitle").innerHTML = "Join Azora";
    document.getElementById("popupSubtitle").style.display = "block";
    document.getElementById("confirmPassword").style.display = "block";
    document.getElementById("email").style.display = "block";
    document.querySelectorAll(".checkbox").forEach(el => el.style.display = "block");
    document.getElementById("mainButton").innerHTML = "Create Account";
    document.getElementById("switchMode").innerHTML = "Log In";
    document.querySelector(".popup p").childNodes[0].textContent = "Already have an account? ";
}

function openLogin() {
    document.getElementById("accountOverlay").style.display = "flex";
    document.getElementById("popupTitle").innerHTML = "Welcome Back!";
    document.getElementById("popupSubtitle").style.display = "none";
    document.getElementById("confirmPassword").style.display = "none";
    document.getElementById("email").style.display = "none";
    document.querySelectorAll(".checkbox").forEach(el => el.style.display = "none");
    document.getElementById("mainButton").innerHTML = "Log In";
    document.getElementById("switchMode").innerHTML = "Create Account";
    document.querySelector(".popup p").childNodes[0].textContent = "Don't have an account? ";
}

function createAccount() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Please fill out all required fields!");
        return;
    }

    const account = {
        username: username,
        password: password,
        avatar: {
            head: "#ffcc00",
            torso: "#1e60ff",
            pants: "#00ebd4",
            face: "default"
        }
    };

    localStorage.setItem("azoraAccount", JSON.stringify(account));
    localStorage.setItem("loggedIn", "true");

    alert("🎉 Welcome to Azora, " + username + "!");
    location.reload(); 
}

// Attach main account modal button action
document.getElementById("mainButton").addEventListener("click", function () {
    if (this.innerHTML === "Create Account") {
        createAccount();
    } else {
        const username = document.getElementById("username").value.trim();
        if (username) {
            localStorage.setItem("loggedIn", "true");
            alert("👋 Welcome back, " + username + "!");
            location.reload();
        }
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

// Close popup when clicking outside the box
document.getElementById("accountOverlay").addEventListener("click", function (e) {
    if (e.target === this) {
        this.style.display = "none";
    }
});

// --- Creator site handling ---
function handleCreateClick() {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
        window.open("https://your-creator-website-link.com", "_blank");
    } else {
        alert("⚠️ You need an account to save your games! Please sign up first.");
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

// --- Color Moderation Rules ---
const RESTRICTED_COLORS = {
    white: ["#ffffff", "#f0f0f0", "#e6e6e6"],
    red: ["#ff0000", "#e60000", "#cc0000"],
    blue: ["#0000ff", "#0000e6", "#0000cc"]
};

function moderateCharacterColors(headColor, torsoColor, legsColor) {
    const head = headColor.toLowerCase();
    const torso = torsoColor.toLowerCase();
    const legs = legsColor.toLowerCase();

    let safeTorso = torso;
    let moderated = false;

    for (const colorGroup in RESTRICTED_COLORS) {
        const restrictedList = RESTRICTED_COLORS[colorGroup];
        if (restrictedList.includes(head) && 
            restrictedList.includes(torso) && 
            restrictedList.includes(legs)) {
            
            safeTorso = "#1e293b"; // Dark slate torso
            moderated = true;
            break;
        }
    }

    return {
        head: head,
        torso: safeTorso,
        legs: legs,
        wasModerated: moderated
    };
}

// --- 3D Avatar Global Variables & Scene ---
let scene, camera, renderer, headMesh, torsoMesh, leftLegMesh, rightLegMesh;

function init3DAvatar() {
    const container = document.getElementById("avatar3d-canvas");
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const characterGroup = new THREE.Group();

    // 1. Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.1;
    characterGroup.add(headMesh);

    // 2. Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x1e60ff });
    torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 0.3;
    characterGroup.add(torsoMesh);

    // 3. Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x00ebd4 });
    leftLegMesh = new THREE.Mesh(legGeo, legMat);
    leftLegMesh.position.set(-0.2, -0.6, 0);
    characterGroup.add(leftLegMesh);

    rightLegMesh = new THREE.Mesh(legGeo, legMat);
    rightLegMesh.position.set(0.2, -0.6, 0);
    characterGroup.add(rightLegMesh);

    scene.add(characterGroup);

    function animate() {
        requestAnimationFrame(animate);
        characterGroup.rotation.y += 0.008; // Idle rotation
        renderer.render(scene, camera);
    }
    animate();
}

function updateAvatarColors() {
    const rawHead = document.getElementById("colorHead").value;
    const rawTorso = document.getElementById("colorTorso").value;
    const rawLegs = document.getElementById("colorLegs").value;

    const validated = moderateCharacterColors(rawHead, rawTorso, rawLegs);

    headMesh.material.color.set(validated.head);
    torsoMesh.material.color.set(validated.torso);
    leftLegMesh.material.color.set(validated.legs);
    rightLegMesh.material.color.set(validated.legs);

    const warning = document.getElementById("modWarning");
    if (validated.wasModerated) {
        warning.style.display = "block";
    } else {
        warning.style.display = "none";
    }
}

function saveAvatar() {
    const account = JSON.parse(localStorage.getItem("azoraAccount"));
    if (!account) {
        alert("⚠️ Please log in or create an account to save your custom 3D avatar!");
        return;
    }

    const validated = moderateCharacterColors(
        document.getElementById("colorHead").value,
        document.getElementById("colorTorso").value,
        document.getElementById("colorLegs").value
    );

    account.avatar = {
        head: validated.head,
        torso: validated.torso,
        pants: validated.legs,
        face: "default"
    };

    localStorage.setItem("azoraAccount", JSON.stringify(account));
    alert("💾 3D Avatar saved successfully to your Azora account!");
}

// --- App Start ---
window.addEventListener("DOMContentLoaded", () => {
    init3DAvatar();
    
    // Check if user logged in & load state
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
        const account = JSON.parse(localStorage.getItem("azoraAccount"));
        if (account) {
            document.getElementById("guestButtons").style.display = "none";
            document.getElementById("userPanel").style.display = "block";
            document.getElementById("profileButton").innerHTML = "👤 " + account.username;
            
            // Populate Avatar Form colors
            if (account.avatar) {
                document.getElementById("colorHead").value = account.avatar.head || "#ffcc00";
                document.getElementById("colorTorso").value = account.avatar.torso || "#1e60ff";
                document.getElementById("colorLegs").value = account.avatar.pants || "#00ebd4";
                updateAvatarColors();
            }
        }
    }
    
    // Load character service switch setting state
    const charServiceEnabled = localStorage.getItem("charServiceEnabled");
    if (charServiceEnabled === "true" && document.getElementById("charServiceToggle")) {
        document.getElementById("charServiceToggle").checked = true;
    }
});