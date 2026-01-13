
const socket = io();

var localToken = localStorage.getItem("token");
var localUsername = localStorage.getItem("username");
var localRooms = localStorage.getItem("active-rooms");
var localRoomData = "";
var isInRoom = false;

//-----
var player;

var keys = {}
var entered_pressed = false;

socket.on('disconnect', function() {
    alert("You have been disconnected from the server");
    window.location = "rooms.html"
});


socket.on("established-connection", ()=>{

    socket.emit("connection-protocal", localToken)

})

socket.on("log-user-in", (givenToken, givenUsername)=>{

    localStorage.setItem("username", givenUsername)
    localStorage.setItem("token", givenToken)

    console.log(`You have logged in. Username ${givenUsername}, token: ${givenToken}`)

    joinRoom()

})

socket.on("expired-token-protocal", ()=>{

    alert("Invalid token")
    localStorage.clear();
    window.location = "index.html";

})

socket.on("user-successfully-joined-room", (roomData)=>{

    isInRoom = true;
    //alert(`Welcome to room ${roomData["room code"]}`)
    localRoomData = roomData;
    updateUsersList(localRoomData);

    socket.emit("update-specific-user", player.getPlayerState(), 
    player.getCurrentTime(), String(videoId), parseFloat(player.getPlaybackRate()), senderSocketID, localRoomData["room code"])

})

socket.on("host-left-room", ()=>{

    alert("The host has left!")
    window.location = "rooms.html";

})

socket.on("update-user-list", (roomData)=>{

    localRoomData = roomData
    updateUsersList(localRoomData)

})

socket.on("request-host-data", (senderSocketID)=>{

    var videoUrl = player.getVideoUrl();
    var videoId = new URL(videoUrl).searchParams.get('v');

    let currentTime = Date.now()

    socket.emit("update-specific-user", player.getPlayerState(), 
    player.getCurrentTime(), String(videoId), parseFloat(player.getPlaybackRate()), senderSocketID, localRoomData["room code"], currentTime)

})

socket.on("recieve-requested-data", (hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime)=>{

    updateClientPlayer(hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime)
    console.log(timeToServer)

})

socket.on("update-playerState", (hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime)=>{

    updateClientPlayer(hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime)
    console.log(timeToServer)

})

socket.on("emit-message-to-all", (sentMessage, username)=>{

    const chatReference = document.getElementById("chat");
    let verticalScroll = chatReference.scrollTop;
    const maxScroll = chatReference.scrollHeight - chatReference.clientHeight;
    chatReference.innerHTML += `<h1 style = "display: flex; width: 100%;"><p style = "color: #FCA311">${username}:&nbsp;</p>
    <p class = "message" style = "color: white">${sentMessage}</p></h1>`

    if (verticalScroll >= maxScroll - 100){

        chatReference.scrollTop = chatReference.scrollHeight;

    }

    console.log(`scroll: ${verticalScroll}`);

})

socket.on("greet-user", (joinedUser)=>{

    const chatReference = document.getElementById("chat");
    let verticalScroll = chatReference.scrollTop;
    const maxScroll = chatReference.scrollHeight - chatReference.clientHeight;
    chatReference.innerHTML += `<h1 class = "serverNote" style = "display: flex; width: 100%;"><p style = "color: white">${String(joinedUser)}&nbsp;</p>
    <p style = "color: #FCA311">has joined the room :D</p></h1>`

    if (verticalScroll >= maxScroll - 100){

        chatReference.scrollTop = chatReference.scrollHeight;

    }

    console.log(`scroll: ${verticalScroll}`);

})

socket.on("goodbye-user", (leftUser)=>{

    const chatReference = document.getElementById("chat");
    let verticalScroll = chatReference.scrollTop;
    const maxScroll = chatReference.scrollHeight - chatReference.clientHeight;
    chatReference.innerHTML += `<h1 class = "serverNote" style = "display: flex; width: 100%;"><p style = "color: white">${String(leftUser)}&nbsp;</p>
    <p style = "color: #FCA311">has left the room :(</p></h1>`

    if (verticalScroll >= maxScroll - 100){

        chatReference.scrollTop = chatReference.scrollHeight;

    }

    console.log(`scroll: ${verticalScroll}`);

})

socket.on("account-deletion-success", function(){

    alert("Your account was successfully deleted");
    socket.disconnect();
    window.location = "index.html";

})

function joinRoom(){

    const roomCode = String(window.location.href.split("#")[1]);
    socket.emit("joinRoom", roomCode)

    setTimeout(()=>{

        if (!isInRoom){

            alert("There was a problem joining the room");
            window.location = "rooms.html"

        }

    }, 7000)

}

function updateUsersList(roomData){

    let usersContainerReference = document.getElementById("usersContainer");

    let addedHTML = "";

    for (let i = 0; i < roomData["active-users"].length; i++){

        addedHTML += `<h2 id = "${roomData["active-users"][i]}">${String(roomData["active-users"][i])}</h2>`;

    }

    usersContainerReference.innerHTML = addedHTML;

}

function playerElementReady(){
    const playerContainer = document.getElementById("player");
    if (!playerContainer){playerElementReady(); return}

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: '7yRV9YyJLhs', // A default video to load
    playerVars: {
        'autoplay': 1, // This enables autoplay
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onPlaybackRateChange': onPlayerRateChange
    }
  });
}

function onPlayerReady(event) {
    const playerContainer = document.getElementById("player");
    if (!playerContainer || !player){onPlayerReady(); return}
    player.playVideo();
    onPlayerStateChange();

}

function onPlayerStateChange(event) {

    const playerContainer = document.getElementById("player");
    if (!playerContainer || !player){onPlayerStateChange(); return}

    // You can add logic here to handle different states (e.g., play, pause, end).
    var videoUrl = player.getVideoUrl();
    var videoId = new URL(videoUrl).searchParams.get('v');

    let currentTime = Date.now()

    socket.emit("update-others-playerState", player.getPlayerState(), 
    player.getCurrentTime(), String(videoId), parseFloat(player.getPlaybackRate()), currentTime, localRoomData["room code"]);

}

function onPlayerRateChange(event){

    const playerContainer = document.getElementById("player");
    if (!playerContainer){return}

    var videoUrl = event.target.getVideoUrl();
    var videoId = new URL(videoUrl).searchParams.get('v');

    let currentTime = Date.now()

    socket.emit("update-others-playerState", player.getPlayerState(), 
    player.getCurrentTime(), String(videoId), parseFloat(player.getPlaybackRate()), currentTime, localRoomData["room code"]);

}

function submitVdeoID(){

    const playerContainer = document.getElementById("player");
    if (!playerContainer){return}

    const submittedLink = document.getElementById("inputVIDEOID").value;

    if (String(submittedLink).includes("youtu.be")){

        const extractedLinkData = String(submittedLink).split("youtu.be/");
        const videoID = extractedLinkData[1].split("?")[0];

        player.cueVideoById(videoID);
        player.playVideo();

        document.getElementById("inputVIDEOID").value = ""
    

    }

    else{

        const extractedLinkData = String(submittedLink).split("v=");
        const videoID = extractedLinkData[1].split("&")[0];

        player.cueVideoById(videoID);
        player.playVideo();

        document.getElementById("inputVIDEOID").value = ""

    }

}

function updateClientPlayer(hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime){

    if (player){

        if ((player.getCurrentTime()) < hostTimeStamp - 5 || (player.getCurrentTime()) > hostTimeStamp + 5){

            let currentTime = Date.now();
            let delayFromServer = (currentTime - serverTime);
            let totalDelay = (timeToServer + delayFromServer)/1000
            player.seekTo((hostTimeStamp + totalDelay), true);

        }

        if (player.getVideoData().video_id !== hostVideoID && hostVideoID !== undefined || 
            player.getVideoData().video_id !== hostVideoID && hostVideoID !== "undefined" ||
            player.getVideoData().video_id !== hostVideoID && hostVideoID !== null ||
            player.getVideoData().video_id !== hostVideoID && hostVideoID !== "null"){

            player.cueVideoById(hostVideoID);
            player.playVideo();

        }

        if (player.getPlayerState() !== hostState){

            if (hostState === 1){ player.playVideo() }

            if (hostState == 2){ player.pauseVideo() }

        }

        if (parseFloat(player.getPlaybackRate()) !== parseFloat(hostPlayBackSpeed) &&
        player.getVideoData().video_id == hostVideoID){
            console.log(parseFloat(hostPlayBackSpeed), player.getPlaybackRate(), player.getPlayerState(), hostState)
            if (!(parseFloat(hostPlayBackSpeed))){return}

            player.setPlaybackRate(hostPlayBackSpeed);

            const chatReference = document.getElementById("chat");
            let verticalScroll = chatReference.scrollTop;
            const maxScroll = chatReference.scrollHeight - chatReference.clientHeight;
            chatReference.innerHTML += `<h1 class = "serverNote" style = "display: flex; 
            width: 100%;"><p style = "color: white">${localRoomData["host"]} (host)</p><p class = "serverMessage" style = "color: #FCA311">has changed the playback speed to ${hostPlayBackSpeed}</p></h1>`

            if (verticalScroll >= maxScroll - 100){

                chatReference.scrollTop = chatReference.scrollHeight;

            }

        }

    }

}

function sendMessage(){

    if (isInRoom){

        const chatInputReference = document.getElementById("chatInput");
        const message = chatInputReference.value;
        if (message.trim() !== ""){
            socket.emit("send-message", String(chatInputReference.value), localRoomData["room code"]);
        }

        chatInputReference.value = "";

    }

}

function updateTitle(){

    const roomCode = String(window.location.href).split("#");
    document.title = `yuzzwatch - room: ${roomCode[1]}`;
    
}



//jquery

$(document).keydown(function (e){

    if (e.which == 13){

        if (!entered_pressed){

            entered_pressed = true;
            sendMessage();

        }

    }

});







$(document).keyup(function (e) {

    if (e.which == 13){

        entered_pressed = false;

    }

});