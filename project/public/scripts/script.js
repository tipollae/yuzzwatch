
const socket = io();

var localToken = localStorage.getItem("token");
var localUsername = localStorage.getItem("username");

socket.emit("connection-protocal", localToken)

socket.on("log-user-in", (givenToken, givenUsername)=>{

    localStorage.setItem("username", givenUsername)
    localStorage.setItem("token", givenToken)

    console.log(`You have logged in. Username ${givenUsername}, token: ${givenToken}`)

    document.getElementById("loginButton").disabled = true;

    setTimeout(()=>{

        window.location = "rooms.html";

    },800)

})

socket.on("give-login-status", (loginMessage)=>{

    if (!loginMessage[0]){

        document.getElementById("error").style.color = "red"
        document.getElementById("recoverAccount").style.display = "block";

    }

    else{

        document.getElementById("error").style.color = "#20bf55";
        document.getElementById("recoverAccount").style.display = "none";

    }

    document.getElementById("error").innerHTML = loginMessage[1];

})

function sendLoginDetails(){

    var username = document.getElementById("inputUSERNAME").value;
    var password = document.getElementById("inputPASSWORD").value;

    socket.emit("login-details", username, password);

}
