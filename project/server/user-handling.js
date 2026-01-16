

module.exports = {

    generateToken: function() {

        let token = Math.random().toString(36).substring(2, 10);
        return token;

    },


    loginUser: async function(socket, generatedToken, givenUsername, foundToken, tokens){

            console.log(`Login sucessfull!`);
            console.log(loginStatus)

            if (!foundToken){

                console.log("user doesn't exist in token database yet")
                tokens.push({"token": generatedToken, "username": givenUsername, "active-sockets": [socket.id], 
                "active-rooms": []})

                socket.data.token = generatedToken;
                socket.data.username = givenUsername;
                console.log(`This is the given token: ${socket.data.token}`)

            }

            else {

                console.log("user already has a token");
                const tokensMap = new Map(tokens.map(user => [user.username, user]));
                const foundUser = tokensMap.get(givenUsername)
                const foundSocketID = foundUser["active-sockets"].indexOf(socket.id);
                if (foundSocketID >= 0){

                    console.log("socket already exists in token database")

                }

                else{

                    console.log("socket doesn't exist yet, adding new socket...")
                    foundToken["active-sockets"].push(socket.id)
                    socket.data.token = foundToken["token"];
                    socket.data.username = foundToken["username"]
                    console.log(`This is the given token: ${socket.data.token}`)

                }

            }

            socket.emit("log-user-in", socket.data.token, socket.data.username)
        
    }

}

function wait (waitTime){

    return new Promise(resolve => setTimeout(resolve, waitTime))

}