//importing fs system module
const fs = require("fs");

//importing mongoDB
const { MongoClient } = require("mongodb")

//importing bcrypt
const bcrypt = require("bcrypt");

//importing node mailer
let nodemailer = require('nodemailer');

//http request library for getting the youtube video titles
const axios = require('axios');

//importing express and creating a new express app instance
const express = require("express");
const path = require('path');
const app = express();

// Serve static files
app.use(express.static("../public"));

// CSP header — everything in one string
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com; " +
    "img-src 'self' data: https://i.ytimg.com https://www.youtube.com; " +
    "connect-src 'self' https://www.youtube.com https://s.ytimg.com https://youtube.googleapis.com;"
  );
  next();
});

// Serve your index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//creates an http server using the created express app and attaches socket io
const server = require("http").Server(app);
const io = require("socket.io")(server);

const port = 3000;

//other imported and self created scripts go here
const userHandler = require("./user-handling.js")
const dataHandler = require("./data-handling.js");
const { error } = require("console");
const { cachedDataVersionTag } = require("v8");
//initiates server if server is not on
if (!server.listening){

    //initiates the server with the port and the IP 0.0.0.0
    server.listen(port, "0.0.0.0", () => {

        console.log(`Server has been initiated at http://localhost:${port}`)

    })

}

else {console.log("Server has already been initiated")}

//mongodb set up
require('dotenv').config();
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

//simple self calling async function to connect to mongo data base
(async()=>{
if (!client.isConnected?.() && !client.topology?.isConnected()){

    await client.connect();
    console.log("Connected to MongoDB");

}
})();

//retrieves data and prints it
asyncFunctionCallBack(dataHandler.recieveMongoDataBase, client, true).then((returnedData)=>{
    //console.log(returnedData)
});

//asyncFunctionCallBack(dataHandler.comparePasword, client, "poop", "Dodona2a").then((value)=>{console.log(value)}) //<-- password compare function
//asyncFunctionCallBack(dataHandler.createUserData, client, "epic", "gayboy", "loltim26@gmail.com").then((value)=>{console.log(value)}) //<-- creating user function

//runs BEFORE a user has fully connected
/*io.use((socket, next)=>{

    //allows user to fully connect to server
    next();

})*/

const characters = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I",
    "J", "K", "L", "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W", "X", "Y", "Z", "1",
    "2", "3", "4", "5", "6", "7", "8", "9", "0"
]

//TOKENS-----
var tokens = [];
var verificationCodes = []
var rooms = [];
/*room object :

{
    "room code": "ABCD",
    "active-users": [ {username: "username", tocken: tokenID, socketID: socketID} ],
    host: "some username",
    hostTokenID: some token id
    hostSocketID: "some socket id"
    playlist: [];
}

*/

//runs once a user has FULLY connected to the server
io.on("connection", async (socket)=>{

    console.log(`a user has connected! socket id: ${socket.id}, client id: ${socket.client.id}`)

    socket.emit("established-connection")

    socket.on("connection-protocal", async (giventoken)=>{

        const foundToken = tokens.find(object => object.token === giventoken);

        if (foundToken){

            await asyncFunctionCallBack(userHandler.loginUser, socket, foundToken["token"], foundToken["username"], foundToken, tokens)

        }

        else{

            socket.emit("expired-token-protocal")
            console.log("token is expired")

        }

    })

    socket.on("login-details", async (givenUsername, givenPassword)=>{

        loginStatus = await asyncFunctionCallBack(dataHandler.comparePasword, client, givenUsername, givenPassword);
        const generatedToken = String(Math.random().toString(36).substring(2));
        const foundToken = tokens.find(object => object.username === givenUsername);
        socket.emit("give-login-status", loginStatus)
        if (loginStatus[0]){

            await asyncFunctionCallBack(userHandler.loginUser, socket, generatedToken, givenUsername, foundToken, tokens)

        }

        else{ 
            console.log(`Failed to login`); 
            console.log(loginStatus);
        }

    })

    socket.on("deleteAccount", async (username, token)=>{

        let authorizedDeletion = tokens.find(object => object.token === socket.data.token && object.username === username);

        if (!authorizedDeletion) return;
        
        let deletedAccount = await asyncFunctionCallBack(dataHandler.deleteAccount, client, username)

        if (deletedAccount) {

            for (let i = 0; i < authorizedDeletion["active-sockets"].length; i++){

                io.to(authorizedDeletion["active-sockets"][i]).disconnectSockets();

            }

            tokens.splice(tokens.indexOf(authorizedDeletion),1);
        }
        
        else socket.emit("failed-to-delete-account")

    })

    //searching for a room
    socket.on("search-room", (givenRoomCode)=>{

        const foundRoom = rooms.find(room => room["room code"] === String(givenRoomCode));

        if (foundRoom){

            const foundUser = tokens.find(object => object.token === socket.data.token);

            console.log(foundRoom["room code"])
            console.log(foundUser["active-rooms"])

            if ((foundUser["active-rooms"].indexOf(foundRoom["room code"])) == -1){

                foundUser["active-rooms"].push(foundRoom["room code"])
                socket.emit("valid-room", foundUser["active-rooms"], foundRoom["room code"])
                console.log("Valid room, joining room...")

            }

            else{

                socket.emit("already-in-room")

            }

        }

        else{

            socket.emit("invalid-room")

        }

    })

    //joining room
    socket.on("joinRoom", async (givenRoomCode)=>{

        socket.join(givenRoomCode);
        console.log(`joinRoom called in process ${process.pid}`);
        const foundRoom = rooms.find(room => room["room code"] === String(givenRoomCode));

        let existingUser;
        
        if (foundRoom){

            existingUser = foundRoom["active-users"].findIndex(user =>
            user.username === socket.data.username &&
            user.token === socket.data.token)

        }

        if (existingUser == -1){

            foundRoom["active-users"].push({"username": socket.data.username, "token": socket.data.token, 
                "socketID": socket.id})

            if (!(foundRoom.hostSocketID) && (foundRoom.hostTokenID === socket.data.token)){ 
                foundRoom.hostSocketID = socket.id;
            }

            socket.data.isInRoom = true;

            const foundRoomUsersList = [];
            for (let i = 0; i < foundRoom["active-users"].length; i++){
                foundRoomUsersList.push(foundRoom["active-users"][i].username);
            }

            socket.emit("user-successfully-joined-room", {
                "room code": foundRoom["room code"],
                "active-users": foundRoomUsersList,
                "host": foundRoom["host"],
            })

            socket.to(foundRoom["room code"]).emit("update-user-list",{
                "room code": foundRoom["room code"],
                "active-users": foundRoomUsersList,
                "host": foundRoom["host"],
            })

            console.log("added user to room")
            console.log(`Active users length: ${foundRoom["active-users"].length}`)

            let extractedRoomData = extractRoomData();
            socket.to(foundRoom["room code"]).emit("greet-user", socket.data.username)
            socket.emit("greet-user", socket.data.username)
            socket.broadcast.emit("server-active-rooms", extractedRoomData);

        }

        //console.log(rooms)

    })

    //creating a room
    socket.on("createRoom", ()=>{

        console.log("creating room...")

        let roomCode = createRoomCode();

        while ((rooms.find(room => room["room code"] === roomCode))){

            roomCode = createRoomCode();

        }

        if (socket.data.username){

            rooms.push
            ({
                "room code": roomCode,
                "active-users": [],
                host: socket.data.username,
                hostTokenID: socket.data.token,
                hostSocketID: null,
                playlist: [],
                playlistActive: false,
                shouldMoveToNextVid: false,
            })
            const foundUser = tokens.find(object => object.token === socket.data.token);
            if (foundUser){

                foundUser["active-rooms"].push(roomCode)
                socket.join(roomCode)
                socket.emit("valid-room", foundUser["active-rooms"], roomCode)

            }

            console.log(rooms)
            
            let extractedRoomData = extractRoomData();
            socket.broadcast.emit("server-active-rooms", extractedRoomData);

        }

        else{

            socket.emit("failed-to-create-room")

        }

    })

    //requesting rooms
    socket.on("request-active-rooms", ()=>{

        let extractedRoomData = extractRoomData();

        socket.emit("server-active-rooms", extractedRoomData);

    })

    //live room info handling
    socket.on("update-others-playerState", async (hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, givenTime, givenRoomCode)=>{

        const foundRoom = rooms.find(room => room["room code"] === givenRoomCode);

        if (foundRoom){

            if (socket.id == foundRoom.hostSocketID){

                let serverTime = Date.now();
                let timeToServer = (serverTime - givenTime);

                if (foundRoom.playlist.length === 0){

                    foundRoom.playlistActive = false;

                }

                if (hostState === 0){

                    let data = {
                        socketID: socket.id,
                        givenRoomCode: givenRoomCode
                    };

                    foundRoom.shouldMoveToNextVid = true;

                    await wait(2500);
                    if (foundRoom.shouldMoveToNextVid) nextVideo(data);

                }

                else{

                    if (foundRoom.shouldMoveToNextVid){
                        foundRoom.shouldMoveToNextVid = false;
                    }

                }

                socket.to(givenRoomCode).emit("update-playerState", hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, timeToServer, serverTime);

            }

            else{

                const foundHost = foundRoom["active-users"].find(user => user.username === foundRoom.host);
                if (foundHost){ io.to(foundHost["socketID"]).emit("request-host-data", socket.id) }

            }

        }

    })

    socket.on("update-specific-user", (hostState, hostTimeStamp, hostVideoID, playBackSpeed, senderSocketID, givenRoomCode, givenTime)=>{

        const foundRoom = rooms.find(room => room["room code"] === givenRoomCode);
        const foundHost = foundRoom["active-users"].find(user => user.socketID === socket.id);

        if (foundHost){

            let serverTime = Date.now();
            let timeToServer = (serverTime - givenTime)

            io.to(senderSocketID).emit("recieve-requested-data", 
            hostState, hostTimeStamp, hostVideoID, playBackSpeed, timeToServer, serverTime) 

        }

    })

    socket.on("send-message", (sentMessage, givenRoomCode)=>{

        io.to(givenRoomCode).emit("emit-message-to-all", sentMessage, socket.data.username);
        if (sentMessage[0] === "/"){

            let data = {
                message: sentMessage,
                socketID: socket.id,
                givenRoomCode: givenRoomCode
            };

            checkCommands(data)
        }

    })

    //disconnect handling
    socket.on("disconnect", ()=>{

        console.log(`a user has disconnected! socket id ${socket.id}`);

        console.log(`SOCKET DATA: ${socket.data.isInRoom}`)

        if (socket.data.isInRoom == true){

            for (let i = 0; i < rooms.length; i++){

                const foundUser = rooms[i]["active-users"].findIndex(user => user.socketID === socket.id);
                const foundTokenUser = tokens.find(user => user.token === socket.data.token);
                if (foundUser >= 0 && foundTokenUser !== undefined){

                    let activeUsersReference = rooms[i]["active-users"];
                    activeUsersReference.splice(foundUser, 1)

                    const foundActiveRoom = foundTokenUser["active-rooms"].indexOf(rooms[i]["room code"])
                    foundTokenUser["active-rooms"].splice(foundActiveRoom, 1);

                    var foundRoomUsersList = [];
                    for (let i = 0; i < activeUsersReference.length; i++){
                        foundRoomUsersList.push(activeUsersReference[i].username);
                    }

                    if (socket.data.username === rooms[i]["host"]){

                        socket.to(rooms[i]["room code"]).emit("host-left-room");

                        //final clean up---
                        for (let usersIndex = 0; usersIndex < rooms[i]["active-users"].length; usersIndex++){

                            if (rooms[i]["active-users"][i]["socketID"]){

                                if (io.sockets.sockets.has(rooms[i]["active-users"][i]["socketID"])){

                                    io.in(rooms[i]["active-users"][i]["socketID"]).disconnectSockets(true);

                                }

                            }
                        }
                        setTimeout(()=>{ rooms = rooms.filter(room => room["active-users"].length > 0); }, 2000)

                    }

                    else{

                        socket.to(rooms[i]["room code"]).emit("goodbye-user", socket.data.username)
                        socket.to(rooms[i]["room code"]).emit("update-user-list",{
                            "room code": rooms[i]["room code"],
                            "active-users": foundRoomUsersList,
                            "host": rooms[i]["host"],
                        });


                    }

                    console.log("REMOVED SOCKET FROM ROOM");

                }

            }

            const foundSocketUser = tokens.find(object => object.token === socket.data.token);
            console.log(foundSocketUser)
            if (foundSocketUser){

                setTimeout(()=>{

                    console.log("deleting socket from token database");

                    let i;
                    while ((i = foundSocketUser["active-sockets"].indexOf(socket.id)) > -1) {
                        foundSocketUser["active-sockets"].splice(i, 1);
                    }

                    console.log("successfully deleted instances of the socket")
                    console.log(foundSocketUser)

                    if (foundSocketUser["active-sockets"].length == 0){

                        tokens.splice(tokens.indexOf(foundSocketUser), 1)
                        console.log("deleting token")

                    }

                }, 10000)

            }

        }

        else{

            console.log("socket was not in a room")
            
            setTimeout(()=>{

                const foundSocketUser = tokens.find(object => object.token === socket.data.token);
                console.log(foundSocketUser)
                if (foundSocketUser){

                    console.log("deleting socket from token database");

                    while ((i = foundSocketUser["active-sockets"].indexOf(socket.id)) > -1) {
                        foundSocketUser["active-sockets"].splice(i, 1);
                    }

                    console.log("successfully deleted instances of the socket")
                    console.log(foundSocketUser)

                    let activeRooms = rooms.filter(room => room["active-users"].find(user => user.token === socket.data.token))
                    let temporaryRoomsHolder = []
                    for (let roomIndex = 0; roomIndex < activeRooms.length; roomIndex++){

                        temporaryRoomsHolder.push(String(activeRooms[roomIndex]["room code"]))

                    }

                    foundSocketUser["active-rooms"] = temporaryRoomsHolder;

                    if (foundSocketUser["active-sockets"].length == 0){

                        tokens.splice(tokens.indexOf(foundSocketUser), 1)
                        console.log("deleting token")

                    }

                }

            }, (1.5*60*60000))//1.5 hours

        }

    });

    socket.on("checkUserData", (createdUsername, createdPassword, givenEmail)=>{

        asyncFunctionCallBack(dataHandler.checkNewAccountDetails, client, createdUsername, createdPassword,
        givenEmail, verificationCodes).then((userDataStatus)=>{

            let hasError = false;
            for (i = 0; i < userDataStatus.length; i++){

                if (userDataStatus[i] !== null){
                    if (!userDataStatus[i][0]){
                        hasError = true;
                    }
                }

            }

            if (userDataStatus[3]){

                verificationCodes = userDataStatus[3];
                userDataStatus.splice(3, 1)

            }

            if (hasError){ socket.emit("invalidUserData", userDataStatus) }

            else{ socket.emit("validUserData") }

            console.log(userDataStatus)
        });

    });

    socket.on("verifyAccount", (inputCode)=>{

        const foundCode = verificationCodes.find(code => code["verification code"] === String(inputCode));
        console.log(foundCode)
        if (foundCode){

            asyncFunctionCallBack(dataHandler.createUserData, client, foundCode["username"], foundCode["password"], foundCode["email"]);
            verificationCodes = verificationCodes.filter(code => code["email"] !== foundCode["email"]);
            verificationCodes = verificationCodes.filter(code => code["username"] !== foundCode["username"]);
            socket.emit("validVerificationCode")

        }

        else{

            socket.emit("invalidVerificationCode")

        }

    })

})

async function roomCheckLoop(){

    if (rooms.length > 0){

        rooms = rooms.filter(room => room["active-users"].length > 0);
        rooms = rooms.filter(room => room["host"] !== "undefined" || 
        room["host"] !== undefined ||
        room["host"] !== "null" ||
        room["host"] !== null);

    }

    let extractedRoomData = extractRoomData();
    io.sockets.emit("server-active-rooms", extractedRoomData);

    console.log(rooms);

    await wait(25000);

    roomCheckLoop();
    
}

roomCheckLoop();

async function verificationCodeLoop(){

    if (verificationCodes.length > 0){

        const hours = 1;
        const expiryTime = hours * 3600000; // converting hours to miliseconds
        const currentTime = Date.now();
        verificationCodes = verificationCodes.filter(code => 
        (currentTime - code["time created"]) < expiryTime);

    }

    await wait(25000);
    verificationCodeLoop();
    
}

verificationCodeLoop()

//re-usable functions
async function asyncFunctionCallBack(givenFunction, ...params){

    try{

        const functionValue = await givenFunction(...params);
        if (functionValue !== undefined){ return functionValue }

    }

    catch (error){

        console.error(`[asyncFunctionCallBack ERROR in ${givenFunction.name}]:`, error);

    }

}

function wait (waitTime){

    return new Promise(resolve => setTimeout(resolve, waitTime))

}

//commands-----

function helpCommand(givenData){

    let html = `
    <h1 class = "serverNote">
    <p class = "message" style = "color: white">Host commands:</p>
    <p class = "message" style = "color: white">• /add link1 link2 link3...</p>
    <p class = "message" style = "color: white">• /next</p>
    <p class = "message" style = "color: white">• /clear</p>
    <p class = "message" style = "color: white">• /kick username</p>
    <br>
    <p class = "message" style = "color: white">General commands:</p>
    <p class = "message" style = "color: white">• /getPlaylistLength</p>
    <p class = "message" style = "color: white">• /help</p>
    </h1>
    `;
    io.to(givenData.socketID).emit("server-message", html)

}

function addVideo(givenData){

    const roomCode = givenData.givenRoomCode;
    const foundRoom = rooms.find(room => room["room code"] === roomCode);

    if (foundRoom.hostSocketID !== givenData.socketID) return;

    var linksArr = givenData.message.split(" ");
    linksArr.splice(0,1);
    
    var extractedLinksID = extractVideoLinks(linksArr);

    let amountAdded = 0;

    for (let i = 0; i < extractedLinksID.length; i++){

        foundRoom.playlist.push(extractedLinksID[i]);
        amountAdded ++;

    }

    let html = `
    <h1 class = "serverNote">
    <p class = "message" style = "color: white">Added ${amountAdded} videos to playlist</p>
    </h1>
    `;
    io.to(givenData.givenRoomCode).emit("server-message", html)

}

function extractVideoLinks(linksArr) {
    const extractedLinks = [];

    for (let i = 0; i < linksArr.length; i++) {
        const link = linksArr[i];

        try {

            let videoID = null;

            if (link.includes("youtu.be")) {
                videoID = link.split("youtu.be/")[1].split("?")[0];
            } 
            
            else if (link.includes("youtube.com/watch")) {
                videoID = new URL(link).searchParams.get("v");
            }

            if (videoID) {
                extractedLinks.push(videoID);
            }

        } catch {
            continue;
        }
    }

    return extractedLinks;
}

function nextVideo(givenData){

    const roomCode = givenData.givenRoomCode;
    const foundRoom = rooms.find(room => room["room code"] === roomCode);

    if (foundRoom.hostSocketID !== givenData.socketID || foundRoom.playlist.length === 0) return;

    if (foundRoom.playlistActive) foundRoom.playlist.shift();
    else foundRoom.playlistActive = true;

    if (foundRoom.hostSocketID !== givenData.socketID || foundRoom.playlist.length === 0){ 

        let html = `
        <h1 class = "serverNote">
        <p class = "message" style = "color: white">Playlist is empty</p>
        </h1>
        `;
        io.to(givenData.socketID).emit("server-message", html);

        foundRoom.playlistActive = false;

        return;
    }

    io.to(givenData.socketID).emit("next-in-playlist", foundRoom.playlist[0])
    let html = `
    <h1 class = "serverNote">
    <p class = "message" style = "color: white">Moved to next video in playlist</p>
    </h1>
    `;
    io.to(givenData.givenRoomCode).emit("server-message", html)

}

function clearPlaylist(givenData){

    const roomCode = givenData.givenRoomCode;
    const foundRoom = rooms.find(room => room["room code"] === roomCode);

    if (foundRoom.hostSocketID !== givenData.socketID || foundRoom.playlist.length === 0) return;

    foundRoom.playlist.length = 0;
    foundRoom.playlistActive = false;
    foundRoom.shouldMoveToNextVid = false;

    let html = `
    <h1 class = "serverNote">
    <p class = "message" style = "color: white">Cleared playlist</p>
    </h1>
    `;
    io.to(givenData.givenRoomCode).emit("server-message", html)

}

function getPlaylistLength(givenData){

    const roomCode = givenData.givenRoomCode;
    const foundRoom = rooms.find(room => room["room code"] === roomCode);

    let html = `
    <h1 class = "serverNote">
    <p class = "message" style = "color: white">There are currently ${foundRoom.playlist.length} videos in the playlist</p>
    </h1>
    `;
    io.to(givenData.socketID).emit("server-message", html)

}

function kickCommand(givenData){

    const roomCode = givenData.givenRoomCode;
    const foundRoom = rooms.find(room => room["room code"] === roomCode);

    if (foundRoom.hostSocketID !== givenData.socketID) return;

    const messageArr = givenData.message.split(" ");
    const userToKick = messageArr[1];
    const foundUser = foundRoom["active-users"].find(user => user.username === userToKick);

    let html;

    if (foundUser){

        html = `
        <h1 class = "serverNote">
        <p class = "message" style = "color: white">Kicked ${foundUser.username} from room :o</p>
        </h1>
        `;

        io.to(foundUser.socketID).disconnectSockets();

    }

    else{

        html = `
        <h1 class = "serverNote">
        <p class = "message" style = "color: white">Couldn't find user in room.</p>
        </h1>
        `;

    }

    io.to(givenData.givenRoomCode).emit("server-message", html)

}

function checkCommands(data){

    let formedCommand = "";
    let sentMessageArr = data.message.split("");
    sentMessageArr.splice(0,1);
    
    const commandsMap = {

        "help": helpCommand,
        "kick": kickCommand,
        "add": addVideo,
        "next": nextVideo,
        "clear": clearPlaylist,
        "getPlaylistLength": getPlaylistLength,

    }

    console.log(sentMessageArr)

    for (let i = 0; i < sentMessageArr.length; i++){

        if (sentMessageArr[i] === " ") break;
        formedCommand += sentMessageArr[i];

    }

    if (commandsMap[formedCommand]) commandsMap[formedCommand](data);

}

function createRoomCode(){

    let roomCode = "";

    for (let i = 0; i < 4; i++){

        chosenCharacter = Math.floor(Math.random()*characters.length);
        roomCode += characters[chosenCharacter];

    }

    return roomCode

}

function extractRoomData(){

        let serverRoomData = [];

        for (let i = 0; i < rooms.length; i++){

            if (rooms[i]){

                let userCount = 0;

                while (userCount < rooms[i]["active-users"].length){ userCount ++; }

                serverRoomData.push({
                    "room code": rooms[i]["room code"],
                    "host": rooms[i]["host"],
                    "user count": userCount
                })

            }

        }

        return serverRoomData;

}