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
    
    // Random horizontal position across the screen (0% to 90%)
    word.style.left = Math.random() * 90 + 'vw';
    word.style.top = '-50px'; // Start just above the screen
    
    container.appendChild(word);
    
    let currentTop = -50;
    let currentRotation = 0;
    // Randomly decide to rotate left (-1) or right (1)
    const rotationDirection = Math.random() > 0.5 ? 1 : -1; 

    // Animation loop for this specific word
    const interval = setInterval(() => {
        currentTop += fallSpeed;
        currentRotation += rotationSpeed * rotationDirection;
        
        word.style.top = currentTop + 'px';
        word.style.transform = `rotate(${currentRotation}deg)`;
        
        // Remove the word once it falls past the bottom of the screen
        if (currentTop > window.innerHeight) {
            clearInterval(interval);
            word.remove();
        }
    }, 20);
}

// Spawn a new word every 10.0 seconds (10000 milliseconds)
setInterval(spawnWord, 10000);

// --- Popup Modal Logic ---

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
            head: "default",
            shirt: "default",
            pants: "default",
            face: "default"
        }
    };

    localStorage.setItem("azoraAccount", JSON.stringify(account));
    localStorage.setItem("loggedIn", "true");

    alert("🎉 Welcome to Azora, " + username + "!");
    location.reload(); // Refresh to update UI panel state
}

// Attach main button logic once (not inside functions)
document.getElementById("mainButton").addEventListener("click", function () {
    if (this.innerHTML === "Create Account") {
        createAccount();
    } else {
        // Log in action
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

// Check if the user is already logged in
window.onload = function () {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn === "true") {
        const account = JSON.parse(localStorage.getItem("azoraAccount"));
        if (account) {
            document.getElementById("guestButtons").style.display = "none";
            document.getElementById("userPanel").style.display = "block";
            document.getElementById("profileButton").innerHTML = "👤 " + account.username;
        }
    }
};
// A list of "restricted" colors that cannot be used as a full naked body suit
const RESTRICTED_COLORS = {
    white: ["#ffffff", "#f0f0f0", "#e6e6e6"],
    red: ["#ff0000", "#e60000", "#cc0000"],
    blue: ["#0000ff", "#0000e6", "#0000cc"]
};

/**
 * Checks if the chosen character colors are safe.
 * If the head, torso, and legs are all the same restricted color,
 * it automatically forces the torso to a safe, dark charcoal gray.
 */
function moderateCharacterColors(headColor, torsoColor, legsColor) {
    const head = headColor.toLowerCase();
    const torso = torsoColor.toLowerCase();
    const legs = legsColor.toLowerCase();

    let safeTorso = torso;
    let moderated = false;

    // Check if head, torso, and legs are all matching a restricted color
    for (const colorGroup in RESTRICTED_COLORS) {
        const restrictedList = RESTRICTED_COLORS[colorGroup];
        
        if (restrictedList.includes(head) && 
            restrictedList.includes(torso) && 
            restrictedList.includes(legs)) {
            
            // Force the torso to a dark, safe neutral color (like charcoal gray)
            safeTorso = "#1e293b"; 
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

// --- Example Test Run ---
// If a user tries to make a fully white character:
const result = moderateCharacterColors("#ffffff", "#ffffff", "#ffffff");
console.log(result); 
// Output: { head: "#ffffff", torso: "#1e293b", legs: "#ffffff", wasModerated: true }
function handleCreateClick() {
    const loggedIn = localStorage.getItem("loggedIn");

    if (loggedIn === "true") {
        // If logged in, open the separate creator website in a new tab
        window.open("https://your-creator-website-link.com", "_blank");
    } else {
        // If not logged in, prompt them to join first!
        alert("🔒 You need an account to save your games! Please sign up first.");
        openCreateAccount(); // Opens your signup modal automatically
    }
}
// --- TOS Modal Toggle Logic ---
function openTOS(event) {
    event.preventDefault(); // Prevents page from jumping back to top when link is clicked
    document.getElementById("tosOverlay").style.display = "flex";
}

function closeTOS() {
    document.getElementById("tosOverlay").style.display = "none";
}