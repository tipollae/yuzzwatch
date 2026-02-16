
const socket = io()

const form = document.getElementById("form");
const usernameError = document.getElementById("usernameError");
const password1Error = document.getElementById("password1Error");
const password2Error = document.getElementById("password2Error");
const emailError = document.getElementById("emailError");
const submitButton = document.getElementById("submitButton");
const verificationCodeError = document.getElementById("verificationCodeError");
const resendCode = document.getElementById("resendCode");
const inputCode = document.getElementById("verificationCode");
const codeButton = document.getElementById("codeButton");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    sendFormData();

});

socket.on("invalidUserData", (errors)=>{

    submitButton.style.filter = "brightness(100%)";
    submitButton.style.pointerEvents = "auto";

    resendCode.style.filter = "brightness(100%)";
    resendCode.style.pointerEvents = "auto";

    if (!errors[0][0]){

        usernameError.innerHTML = errors[0][1]

    }

    else { usernameError.innerHTML = "" }
        
    if (!errors[1][0]){

        password1Error.innerHTML = errors[1][1]

    }

    else { password1Error.innerHTML = "" }
        
    if (errors[2]){

        if (!errors[2][0]){
            emailError.innerHTML = errors[2][1]
        }

        else { emailError.innerHTML = "" }

    }

    form.style.display = "block";
    document.getElementById("accountVerificationContainer").style.display = "none";
    verificationCodeError.innerHTML = "";

    console.log(errors[2])

})

socket.on("validUserData", ()=>{

    form.style.display = "none";
    document.getElementById("accountVerificationContainer").style.display = "block";

    codeButton.style.filter = "brightness(100%)";
    codeButton.style.pointerEvents = "auto";

    resendCode.style.filter = "brightness(100%)";
    resendCode.style.pointerEvents = "auto";


})

socket.on("validVerificationCode", ()=>{

    verificationCodeError.innerHTML = "Valid code. Your account has been made!"
    verificationCodeError.style.color = "#20bf55";

    setTimeout(()=>{

        window.location = "index.html"

    }, 1000)

})

socket.on("invalidVerificationCode", ()=>{

    const codeButton = document.getElementById("codeButton");

    verificationCodeError.innerHTML = "Invalid code.";
    codeButton.style.filter = "brightness(100%)";
    codeButton.style.pointerEvents = "auto";

    resendCode.style.filter = "brightness(100%)";
    resendCode.style.pointerEvents = "auto";

})

function verifyAccount(){

    codeButton.style.filter = "brightness(60%)";
    codeButton.style.pointerEvents = "none";

    resendCode.style.filter = "brightness(60%)";
    resendCode.style.pointerEvents = "none";

    socket.emit("verifyAccount", inputCode.value)

}

function sendFormData(){

    const formData = new FormData(form);

    const data = Object.fromEntries(formData); 
    if (data.password1 !== data.password2){ password2Error.innerHTML = "Passwords are not the same" }
    else{ 
        password2Error.innerHTML = "";
        submitButton.style.filter = "brightness(60%)";

        resendCode.style.filter = "brightness(60%)";
        resendCode.style.pointerEvents = "auto";

        submitButton.style.pointerEvents = "none";

        codeButton.style.filter = "brightness(60%)";
        codeButton.style.pointerEvents = "none";

        resendCode.style.filter = "brightness(60%)";
        resendCode.style.pointerEvents = "none";

        socket.emit("checkUserData", data.username, data.password2, data.email)
    }

}