//importing fs system module
const fs = require("fs");

//importing mongoDB
const { MongoClient } = require("mongodb")

//importing bcrypt
const bcrypt = require("bcrypt");

//importing node mailer
let nodemailer = require('nodemailer');

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
const uri = "mongodb+srv://tipollae:Dodona2a@cluster0.pvnvqt1.mongodb.net/?appName=Cluster0"
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
    "active-users": [ ["username", "tokenID"] ],
    host: "some username",
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
    socket.on("update-others-playerState", (hostState, hostTimeStamp, hostVideoID, hostPlayBackSpeed, givenTime, givenRoomCode)=>{

        const foundRoom = rooms.find(room => room["room code"] === givenRoomCode);

        if (foundRoom){

            if (socket.data.username == foundRoom.host){

                let serverTime = Date.now();
                let timeToServer = (serverTime - givenTime)

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

            }, 10000)

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

        const expiryTime = 10 * 60 * 1000;
        const currentTime = Date.now()
        verificationCodes = verificationCodes.filter(code => 
        (currentTime - code["time created"]) < expiryTime);

    }

    //console.log(verificationCodes);
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