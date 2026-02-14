const socket = io()

const form = document.getElementById("form");
const emailError =  document.getElementById("emailError");
const submitButton = document.getElementById("submitButton");

const form2 = document.getElementById("form2");
const password1Error = document.getElementById("password1Error");
const password2Error = document.getElementById("password2Error");
const submitButton2 = document.getElementById("submitButton2");
const recoveryCodeError = document.getElementById("recoveryCodeError");
const resendCode = document.getElementById("resendCode");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    sendFormData();

});

form2.addEventListener("submit", function(event) {
    event.preventDefault();

    sendFormData2();

});

socket.on("notify", (found, message)=>{

    emailError.innerHTML = message;

    if (found) {
        emailError.style.color = "#20bf55";
        setTimeout(()=>{

            form.style.display = "none";
            form2.style.display = "block";

            submitButton2.style.filter = "brightness(100%)";
            submitButton2.style.pointerEvents = "auto";

            resendCode.style.filter = "brightness(100%)";
            resendCode.style.pointerEvents = "auto";

        }, 800)

    }
    else{
        submitButton.style.filter = "brightness(100%)";
        submitButton.style.pointerEvents = "auto";
    }
    

})

socket.on("notify2", (valid, codeErr, message)=>{

    if (valid) {
        form2.style.display = "none";
        document.getElementById("recoveryVerificationContainer").style.display = "block"
        setTimeout(()=>{

            window.location = "index.html"

        }, 1400)
    }
    else{

        if (codeErr){

            recoveryCodeError.innerHTML = message;

        }

        else{

            password1Error.innerHTML = message;

        }

        submitButton2.style.filter = "brightness(100%)";
        submitButton2.style.pointerEvents = "auto";

        resendCode.style.filter = "brightness(100%)";
        resendCode.style.pointerEvents = "auto";

    }
    

})

function sendFormData(){

    const formData = new FormData(form);
    const data = Object.fromEntries(formData); 

    emailError.innerHTML = "";
    submitButton.style.filter = "brightness(60%)";
    submitButton.style.pointerEvents = "none";

    submitButton2.style.filter = "brightness(60%)";

    resendCode.style.filter = "brightness(60%)";
    resendCode.style.pointerEvents = "auto";

    submitButton2.style.pointerEvents = "none";
    resendCode.style.pointerEvents = "none";

    socket.emit("recoverAccount", data.email);

}

function sendFormData2(){

    const formData = new FormData(form2);
    const data = Object.fromEntries(formData); 

    if (data.password1 !== data.password2){ password2Error.innerHTML = "Passwords are not the same" }
    else{ 
        password2Error.innerHTML = "";
        submitButton2.style.filter = "brightness(60%)";

        resendCode.style.filter = "brightness(60%)";
        resendCode.style.pointerEvents = "auto";

        submitButton2.style.pointerEvents = "none";
        resendCode.style.pointerEvents = "none";

        socket.emit("changePassword", data.password2, data.recoveryCode);
    }

}