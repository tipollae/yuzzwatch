const socket = io();

var localToken = localStorage.getItem("token");
var localUsername = localStorage.getItem("username");
var localRooms = localStorage.getItem("active-rooms")

socket.on('disconnect', function() {
    window.location = "index.html"
});


socket.on("established-connection", ()=>{

    socket.emit("connection-protocal", localToken)

})

socket.on("log-user-in", (givenToken, givenUsername)=>{

    localStorage.setItem("username", givenUsername)
    localStorage.setItem("token", givenToken)

    console.log(`You have logged in. Username ${givenUsername}, token: ${givenToken}`)

    socket.emit("request-active-rooms")

})

socket.on("expired-token-protocal", ()=>{

    alert("Invalid token");
    localStorage.clear();
    window.location = "index.html";

})

socket.on("account-deletion-success", function(){

    alert("Your account was successfully deleted");
    window.location = "index.html";

})

socket.on("failed-to-delete-account", function(){

    alert("Something went wrong. Failed to delete account.")

})


function openDeletePrompt(){

    document.getElementById("confirmDeleteWrapper").style.display = "block";
    document.getElementById("maskWholeScreen").style.display = "block";

}

function closeDeletePrompt(){

    document.getElementById("confirmDeleteWrapper").style.display = "none";
    document.getElementById("maskWholeScreen").style.display = "none";

}

function deleteAccount(){

    socket.emit("deleteAccount", localUsername, localToken)

}
