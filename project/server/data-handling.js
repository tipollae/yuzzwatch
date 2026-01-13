
const bcrypt = require("bcrypt");

let nodemailer = require('nodemailer');

const characters = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I",
    "J", "K", "L", "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W", "X", "Y", "Z", "1",
    "2", "3", "4", "5", "6", "7", "8", "9", "0"
]


module.exports = {

    recieveMongoDataBase: async function(clientReference, returnData){

        try {

            //data base link set up
            const database = clientReference.db("admin_database");
            const collection = database.collection("admin_users");
            const result = await collection.find({}).toArray();

            //returns data base if needed
            if (typeof returnData == "boolean" && returnData){ return result }

        }

        catch (error) {

            console.log("disconnecting from data base");
            clientReference.close();
            throw Error(error);
        }

    },

    createUserData: async function(clientReference, createdUsername, createdPassword, givenEmail){

        //data base link set up
        const database = clientReference.db("admin_database");
        const collection = database.collection("admin_users");

        const processingRounds = 10;

        //hashes the password
        const hashedPassword = await bcrypt.hash(createdPassword, processingRounds);

        //adds new user to the data base with the hashed password
        await collection.insertOne(
        { 
            "username": createdUsername,
            "password": hashedPassword,
            "email": givenEmail

        });

        console.log(`Added user: ${createdUsername}`);
    },

    checkNewAccountDetails: async function(clientReference, createdUsername, createdPassword, givenEmail, verificationCodes){

        const database = clientReference.db("admin_database");
        const collection = database.collection("admin_users");

        const usernameValidation = await validateUserDataInput(collection, "username", createdUsername);
        const passwordValidation = await validateUserDataInput(collection, "password", createdPassword);

        if (!usernameValidation[0] || !passwordValidation[0]){ return [usernameValidation, passwordValidation, null]; }

        let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'yuzzwatch@gmail.com',
            pass: 'xpup aadb slis sngh'
        }
        });

        let verificationCode = createVerificationCode();
        while ((verificationCodes.find(code => code["code"] === verificationCode))){

            verificationCode = createRoomCode();

        }

        let mailOptions = {
            from: 'yuzzwatch@gmail.com',
            to: givenEmail,
            subject: 'Verify your yuzzwatch account',
            text: `Here is your verification code: ${verificationCode}. This code will expire around the next 10 minutes.
            Please don't share this with anyone else.`,
            html: `<p>Your verification code: <strong>${verificationCode}</strong>
            <p>This code will expire around the next 10 minutes. <br> <strong>Do not share this code with anyone else.</strong>`

        };

        try{

            const extractedData = await module.exports.recieveMongoDataBase(clientReference, true);
            const existingEmail = extractedData.find(user => user.email == givenEmail);

            if (!existingEmail){

                const foundCodeEmail = verificationCodes.findIndex(code => code["email"] === givenEmail);
                const foundCodeUsername = verificationCodes.findIndex(code => code["username"] === createdUsername);
                if (foundCodeEmail > -1){ verificationCodes.splice(foundCodeEmail, 1) }
                if (foundCodeUsername > -1){ verificationCodes.splice(foundCodeUsername, 1) }

                const info = await transporter.sendMail(mailOptions);
                console.log("Email has been sent: ", info.response);
                verificationCodes.push({

                    "verification code": verificationCode,
                    "username": createdUsername,
                    "password": createdPassword,
                    "email": givenEmail,
                    "time created": Date.now()

                });

                return [usernameValidation, passwordValidation, [true, "Valid email format"], verificationCodes]

            }

            else{ return [usernameValidation, passwordValidation, [false, "Email is already in use"]] }

        } catch(error){
            console.log("Error: ", error)
            return [usernameValidation, passwordValidation, [false, "Invalid email format"]]
        }

    },

    comparePasword: async function(clientReference, givenUsername, givenPassword){

        //extracts mongo data base, set to true for data to be returned
        const extractedData = await module.exports.recieveMongoDataBase(clientReference, true);

        const existingUser = extractedData.find(user => user.username == givenUsername);
        
        if (existingUser){

            matchingPassword = await bcrypt.compare(givenPassword, existingUser.password);
            if (!matchingPassword) return [false, "Problem: wrong password"]
            else return [true, "Valid login"];

        }

        else return [false, "Problem: user does not exist"]

    },

    deleteAccount: async function(clientReference, givenUsername){

        const extractedData = await module.exports.recieveMongoDataBase(clientReference, true);
        const existingUser = extractedData.find(user => user.username == givenUsername);  
        
        if (existingUser){

            const database = clientReference.db("admin_database");
            const collection = database.collection("admin_users");

            await collection.deleteOne({username: givenUsername});

            return true;

        }

        return false;

    }

}


async function validateUserDataInput(collectionReference, inputType, input){

    let minCharacters = 3;
    let maxCharacters = 20;

    if (input.trim() == "") return [false, "Problem: Invalid syntax."]

    console.log(inputType)

    if (inputType == "username"){

        if (input.includes(" ")) return [false, "Problem: Username contains spaces"] 
        if (String(input).length < minCharacters) return [false, "Problem: Minimum characters is 3.<br> Username too short."] 
        if (String(input).length > maxCharacters) return [false, "Problem: Maximum characters is 20.<br> Username too long."]

        console.log("finding username...")

        //finds if created user already exists
        confirmedExisting = await collectionReference.findOne(
        { username: input },
        { projection: { username: 1, password: 1, } }
        );
        
        if (confirmedExisting) return [false, "Problem: User exists."]
    }

    else if (inputType == "password"){
        
        if (input.includes(" ")){ return [false, "Problem: Password contains spaces"] }
        if (String(input).length < minCharacters) return [false, "Problem: Minimum characters is 3.<br> Password too short."] 

    }

    else
        throw Error("Invalid input type. Must be username or password.");
        

    //returns true if input passes all checks
    return [true, "Valid"]


}

function wait (waitTime){

    return new Promise(resolve => setTimeout(resolve, waitTime))

}

function createVerificationCode(){

    let verificationCode = "";

    for (let i = 0; i < 17; i++){

        let chosenCharacter = Math.floor(Math.random()*characters.length);
        verificationCode += characters[chosenCharacter];

    }

    return verificationCode

}