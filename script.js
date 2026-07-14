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
function openCreateAccount(){

document.getElementById("accountOverlay").style.display="flex";

document.getElementById("popupTitle").innerHTML="Join Azora";

document.getElementById("mainButton").innerHTML="Create Account";

}

function openLogin(){

function createAccount(){

    const username =
        document.getElementById("usernameBox").value;

    const password =
        document.getElementById("passwordBox").value;

    const account = {

        username: username,

        password: password,

        avatar:{

            head:"default",

            shirt:"default",

            pants:"default",

            face:"default"

        }

    };

    console.log(account);

}
document.getElementById("mainButton").addEventListener("click", function () {

    if (document.getElementById("mainButton").innerHTML === "Create Account") {

        createAccount();

    }

});
document.getElementById("accountOverlay").style.display="flex";

document.getElementById("popupTitle").innerHTML="Welcome Back!";

document.getElementById("mainButton").innerHTML="Log In";

}
