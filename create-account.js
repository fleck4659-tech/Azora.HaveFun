
function createAccount(){

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const confirm =
        document.getElementById("confirmPassword").value;

    const message =
        document.getElementById("message");

    if(username.length < 3){

        message.innerHTML =
        "😊 Sorry! Your username must be at least 3 characters.";

        return;
    }

    if(password.length < 10){

        message.innerHTML =
        "😊 Sorry! Your password must be at least 10 characters.";

        return;
    }

    if(password !== confirm){

        message.innerHTML =
        "😊 Sorry! Your passwords do not match.";

        return;
    }

    message.innerHTML =
    "🎉 Success! Account creation works! (Saving accounts comes next.)";

}
