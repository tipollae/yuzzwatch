
socket.on("valid-room", (serverRoomCode, joinedRoom)=>{

    localStorage.setItem("active-rooms", serverRoomCode);
    displayMessage("Room found!", "#20bf55")
    window.location = `watch.html#${joinedRoom}`;

})

socket.on("invalid-room", ()=>{

    displayMessage("Invalid room code", "red")

})

socket.on("failed-to-create-room", ()=>{

    displayMessage("Failed to create room.<br>Please try again", "red")

})

socket.on("already-in-room", ()=>{

    displayMessage("You are already in that room", "red")

})

socket.on("server-active-rooms", (roomsData)=>{

    let addedHTML = ""

    for (let i = 0; i < roomsData.length; i++){

        addedHTML += `<h1>Room code: ${roomsData[i]["room code"]}&nbsp;&nbsp;
        User count: ${roomsData[i]["user count"]}&nbsp;&nbsp;
        Host: ${roomsData[i]["host"]}</h1>`

    }

    document.getElementById("rooms").innerHTML = addedHTML;

})

function searchRoom(){

    var roomCode = document.getElementById("inputROOMCODE").value;
    socket.emit("search-room", roomCode);

}

function createRoom(){

    socket.emit("createRoom")

}

var messageTimeout = null;

function displayMessage(message, color){

    const msgDisplay = document.getElementById("messageDisplay");

    msgDisplay.innerHTML = `<center>${message}</center>`;
    msgDisplay.style.color = color;
    msgDisplay.style.display = "block";
    const TIME = 2500;

    if (messageTimeout === null){

        messageTimeout = setTimeout(function(){

            msgDisplay.innerHTML = "";
            msgDisplay.style.display = "none";

        }, TIME)

    }

    else{

        clearInterval(messageTimeout);
        messageTimeout = null;
        messageTimeout = setTimeout(function(){

            msgDisplay.innerHTML = "";
            msgDisplay.style.display = "none";

        }, TIME);

    }

}