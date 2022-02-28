//------------------IMPORTS------------------//
const sqlite3 = require("sqlite3").verbose();
const crypto = require('crypto');
const axios = require("axios");
const random = require("random");
//Github API
const githubAPI = async(githubUser, password) => {
    const githubData = await axios.get(`https://api.github.com/users/${githubUser}`, {
        method:'get',
        headers: {
            "Content-Type": "application/json",
        },
        auth: {
            username:githubUser,
            password:password
        }
    })
    .then((res) => {
        console.log(res)
        let publicRepos = res.data.public_repos
        console.log(publicRepos)
    })
    .catch((error) => {
        console.log(error.message)
    })
}
function setupRankings(name, collectionID) {
    console.log(`create rankings of  ${name}!`)
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
        if (error) return console.log(error.message);
        });
    //create table
    db.run(`CREATE TABLE ${name}Rankings(collectionID, )`)
    // close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
// githubAPI("cahillylundeen", "1")

//------------------CRYPTOGRAPHY_AND_RANDOM------------------//
function makeID(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
function hash(input) {
    return createHash('sha256').update(input).digest('hex');
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max + 1 - min) + min)
}

//------------------DEFINITIONS------------------//
const databaseSetup = function() {
    console.log("setup db!")
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
        if (error) return console.log(error.message);
        });
    //create tables
    db.run(`CREATE TABLE users(userID, profilePhoto, username, password, email)`);
    db.run(`CREATE TABLE items(name, itemID, ownerID, collectionID, mediaLink, mediaType, mintDate)`);
    db.run(`CREATE TABLE trades(tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID, sendUserApproval, receiveUserApproval, completion, date)`);
    db.run(`CREATE TABLE collections(collectionID, artist, name, releaseDate, description, photo, websiteLink)`);
    db.run(`CREATE TABLE sessions(userID, key, date)`)
    // close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
const createItem = function(name, ownerID, collectionID, mediaLink, mediaType) {
    console.log(`generating item!`)
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    });
    //define parameters
    var mintDate = new Date()
    console.log(mintDate)
    var itemID = makeID(16)
    db.run(`INSERT INTO items (name, itemID, ownerID, collectionID, mediaLink, mediaType, mintDate) VALUES(?,?,?,?,?,?,?)`,[name, itemID, ownerID, collectionID, mediaLink, mediaType, mintDate]), (error) => {
        if (error) return console.log(error.message);
    }
    // close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
const createCollection = function(name, artist, releaseDate, collectionID, description, photo, websiteLink) {
    console.log("generate collection!")
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    });
    if (collectionID == null) {collectionID = makeID(16)}
    db.run(`INSERT INTO collections (collectionID, artist, name, releaseDate, description, photo, websiteLink) VALUES(?,?,?,?,?,?,?)`,[collectionID, artist, name, releaseDate, description, photo, websiteLink]), (error) => {
        if (error) return console.log(error.message);
    }
    //close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
const createTrade = function(tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID, sendUserApproval, receiveUserApproval, completion, date) {
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    });
    if (sendUserApproval == true && receiveUserApproval == false) {
        db.run(`INSERT INTO trades (tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID, sendUserApproval, receiveUserApproval, completion, date) VALUES(?,?,?,?,?,?,?,?,?)`,[tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID, sendUserApproval, receiveUserApproval, completion, date]), (error) => {
            if (error) return console.log(error.message);
        }
    }
    //close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
const createSession = function(sessionKey, userID) {
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    });
    let date = new Date()
    db.run(`INSERT INTO sessions (userID, key, date) VALUES(?,?,?)`,[userID, sessionKey, date]), (error) => {
        if (error) return console.log(error.message);
    }
    //close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}
const checkTrades = function() {
    //open db
    var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
        if (error) return console.log(error.message);
        });
    var query = `
    SELECT tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID FROM trades 
    WHERE sendUserApproval=true AND receiveUserApproval=true AND completion=false`
    db.all(query, function (error, rows) {
        if (error) return console.log(error.message);
        if (rows.length == 0) {return 'all trades are completed!'}
        for (let i = 0; i < rows.length; i++) {
            let tradeID = rows[i].tradeID
            let sendItemID = rows[i].sendItemID
            let receiveItemID = rows[i].receiveItemID
            let sendUserID = rows[i].sendUserID
            let receiveUserID = rows[i].receiveUserID
            //swap sender's item for receiver's item
            db.run(`UPDATE items SET ownerID="${sendUserID}" WHERE itemID="${receiveItemID}"`)
            db.run(`UPDATE items SET ownerID="${receiveUserID}" WHERE itemID="${sendItemID}"`)
            //set date in the trades table
            let date = new Date()
            db.run(`UPDATE trades SET date="${date}" WHERE tradeID="${tradeID}"`)
            db.run(`UPDATE trades SET completion=${true} WHERE tradeID="${tradeID}"`)
            console.log('trade completed!')
        }
    })
    //close db
    db.close((error) => {
        if (error) return console.log(error.message);
    })
}

//------------------EXPORTS------------------//
exports.databaseSetup = databaseSetup
exports.createItem = createItem
exports.createCollection = createCollection
exports.createTrade = createTrade
exports.checkTrades = checkTrades
exports.createSession = createSession

//------------------SAMPLE_ITEMS+COLLECTIONS------------------//
let explosionOfColor = [
    {"name": "Explosion of Color #85", "link": "https://lh3.googleusercontent.com/vK_ygCOYwZkRgY_dI2luFh31P4yXMLzIXe8PNpudGUoaoxq7SNUtIpWTVvmtzIX0OBzN-c4yNOtrroszwXaY2ICpNU2MziBIrb9irl4=w600"}, 
    {"name": "Explosion of Color #62", "link": "https://lh3.googleusercontent.com/F42vzQbYi5ZBtkSmog6lIk24dX1culrhhwojCfqlGS7lAwQ_YB5M8cd1f_XKkmIaAG8S8MxHiBKompFwb67eAJa-JR8Ec_qSI3C-9w=w600"},
    {"name": "Explosion of Color #94", "link": "https://lh3.googleusercontent.com/4mJU8EDwl72Co7TN4pzhNL9sfIpBEzNf_1Zm6vJuzjfClOVSuZNr5V-f5n9EIJPPiXlctAnP6RkmhL9322K-c1ODRCAq3r_KlKgj=w600"},
    {"name": "Explosion of Color #80", "link": "https://lh3.googleusercontent.com/FwEl7Nb5IMUQkW5WCMypLiLT84bc2uW1rnZZ3eWS3PDGraCUPU6-LCn8cewjDg_7HUjMDL6hdvgItixP1XxmnYDziH2zpgOl0hJVCA=w600"},
    {"name": "Explosion of Color #42", "link": "https://lh3.googleusercontent.com/5hvmPBoLvTCZ0jgxRNw2lR4sVnJvaKa4u-TYCLJ0gzBUkBCLi5RaodegLttT1iDjMi01CFD1ymrwlpTEp0MK2MunoNg-06Hlwpp3=w600"}
]
let etherBear = [
    {"name": "EtherBear #3946", "link": "https://lh3.googleusercontent.com/U22VWZHMP_3qgZMOBTqg3DEocSUkpnrbbZ1v1if9StDZQpztZvzCys8FmTnW11e4L-WT5LchAvftZAch8SdVOZMBwIfRiJ6VWo3vLQ=w600"}, 
    {"name": "EtherBear #1514", "link": "https://lh3.googleusercontent.com/rRalAJne01Br6Ri9J3s-YBSDhvYThGfz8KSi_RoAzoEmma_U-iLMj9GvpJW5ykbim_o6IivHGopeZQOoaajPWt2wCIeVBD-fU4_Zzw=w600"},
    {"name": "EtherBear #1271", "link": "https://lh3.googleusercontent.com/FtvmUqk4Xu-NrbXWJZ3LFnS89Eo5cDr6cu8xkqt4CW0PFLWFeytBsKyS3lQe8SBf4qe-F5cZjRTnXumWsdDPnU7f9FVUf6nyY8t0=w600"},
    {"name": "EtherBear #1596", "link": "https://lh3.googleusercontent.com/ugxI7LwvcudPduYuO-TxH_7a5fQRCIqF7saN5NK24wzr-4s2Oxg6L653-o5DMjLs2S9rv4CGffE4LDZC1yv4ZNvpixu4R1b3bLI5Gw=w600"},
    {"name": "EtherBear #1564", "link": "https://lh3.googleusercontent.com/Y08Zzn5YCd05o_ftB6-cZBVRAIzIdjR3ISu9nnII1vFsn_VY-OiYzTbzhA1LRudC2fsAmS94adz3Lktj3QC9KMIzgEPpNFK75qBRKA=w600"}
]
let lightAndDark = [
    {"name": "Light #24", "link": "https://lh3.googleusercontent.com/H6Sg-2e_HLhaUevvV4UFjZhOCtj1s7Q3-7TOCOG5BeQFUgXrHQUo7Kg96PSHzeOnS0NB-RYYq034luAtNiYaiEY5M-7ptE_P5Q0u-w=w600"},
    {"name": "Light #14", "link": "https://lh3.googleusercontent.com/R_nlQERHY8t48qFbB3PdECDDx8DOhAnGBu83vlKjXVR-Pk-KsLOsoSRTbk8XYMwEgVdWkMs9P6mOPBTVT1klXbU9x2Zn-gETqRE2Pw=w600"},
    {"name": "Light #34", "link": "https://lh3.googleusercontent.com/W4DRWn0cmZmuAt84Y9cQ3ULuc_DPtbUYBZZfwcKn6e195Qbp5Ygh1tVwSWVss5yfJIPIgDluTSicOMA3L9_ead6mi0KbmUXG-eCE724=w600"},
    {"name": "Light #41", "link": "https://lh3.googleusercontent.com/0eILE6UTJGEyXp5eRyTCcm_x6E2FJOaq3gzvkGHKHc43_zdbBY5Mpdqaz9WDi2pk0WlCUVXWhvowOJwNTA_GZGFy54PglFdMmihq=w600"},
    {"name": "Light #8", "link": "https://lh3.googleusercontent.com/_TdvWIGzwnwX8mYGmVcjUQtbwQpAbW8tKLK1nsUmgDU58GII3YuO6xamgDzw1AUCx1d0UuMQzUZTvY4QFPfksfTK00jtPW_JsZLJVbU=w600"}
]
let singularity = [
    {"name": "Singularity #992", "link": "https://lh3.googleusercontent.com/f7dnIE9ZFkJPwHTQJp5L13tSJZ9E1-29COwr4Iss9Na-l9vunsEnBBO_486m21vnAHh2XULoLxpt-tBdJIZtcxQBPTmjivD6VPi2=w600"},
    {"name": "Singularity #552", "link": "https://lh3.googleusercontent.com/57espY7xlFiBnhuOVsTVT1CiqbRLYY3PRIQfHlcKqi8BCGw7d2AnTj17ER2T0RqvfdObMrI7E9Euca5LFt26PdghijQaiOFP55aM=w600"},
    {"name": "Singularity #726", "link": "https://lh3.googleusercontent.com/ZTDVVcBAxap2_YR_Cj4Rhf6OmJnD1CQv9WvOwmVDl4lUvHMDoPjTnNlDy2Yc3jug0yaIiM7wt0_2Rr-t57jlQFzjQfvD7P1AO4zb=w600"},
    {"name": "Singularity #566", "link": "https://lh3.googleusercontent.com/BMMtcZAgzWY10bMiEtlXB_wSElNvJg_NIRI3s9JM61nV7NOMg8mS1uLGPCO8YqZVnN476BO3JMqVQ-UREwGFEnAD8KSjzu8NlTBc2lY=w600"},
    {"name": "Singularity #962", "link": "https://lh3.googleusercontent.com/hOe3nM-7XYv3l3C-qmsgH7iMbpxOLTAQiZM3T870GI4KCYc-SZijr-hB3Ws_fjvbld3UTeukvyh4rIA4ssyo7ItV6AdtJQlkeobA=w600"}
]
let cyberKongz = [
    {"name": "Ghost #1", "link": "https://lh3.googleusercontent.com/9-b4E-0FW1_-vILmG9ZZNbUgwBLJzdujaTF1HufPK4NawCyDdksdVL2FeSEYIU_vSWBFaLHNRweg59jXDDWro5rx9HrhrurhJXl8bQ=w600"},
    {"name": "CyberKong #2022", "link": "https://lh3.googleusercontent.com/TVYumCIRNXCeQrrx1bJPL5Z7y21CTolar5bq0_7L8Vo0x3NATtDiYrX_tA5d8bX8iRTHa6gFbSifiByJ2wbdWtR21drT0VTOy4NRCQ=w600"},    
    {"name": "CyberKong #187", "link": "https://lh3.googleusercontent.com/8RTcKJ_64arWk-ai6zDy868khAJinTFcHXGdI7d_qZdcpg_1I_iWFMvmL6MkdlZ79mKW-seCyek84eseSjTGutwJ0_eArmSrF12J0A=w600"},
    {"name": "CyberKong #128", "link": "https://lh3.googleusercontent.com/hqf4LyRSerGlCBatcZvXrvwnCPII1fAM8R2zkNSlCBtGDejCNUALmFe5NGfaOREDfBVi_cse6_cxmHhqWwgC2BEDGUj1usMMs6CQ9Q=w600"},
    {"name": "CyberKong #3687", "link": "https://lh3.googleusercontent.com/MR7ew0-3JGN2WaiEENN5xhH0_0NzWfrR5fEhz4qq7_qmr5rY8vMPIGfKcqKQrPnEdonA5GHiPxF943-TkVyWJXrNJeVPzt4VUOlttw=w600"}
]
let azuki = [
    {"name": "Azuki #4489", "link": "https://lh3.googleusercontent.com/2sLYPeGZg1hgv-vd3ZZfc4MDYsqm3cySai8wk56SO_Kb7rHizdT_cCxe739B_dGpCBeGa9Yl6CxV92zE9nXmHOJJlhX8n-rDy4z1PpY=w600"},
    {"name": "Azuki #6954", "link": "https://lh3.googleusercontent.com/lC4_BIgLPIt5hAXzuYQdepzIShqTpVXwqOsx0cy17A4WkTgiyrkQuxMQrDRhr1QA_XgUSIO-fHIzPBFMFSdACQAkSi57JT9SqPdN6Ic=w461"},
    {"name": "Azuki #5222", "link": "https://lh3.googleusercontent.com/YRwEFem99juECD6JQwsRWunLH0Hs1nTXuGVP2b-rv_w4PztTTsaCLT0ezOHTGNJ6kUQc6pHwHmM8q4CBUvkVMY1OVqzXUcylywWz=w461"},
    {"name": "Azuki #5558", "link": "https://lh3.googleusercontent.com/SuKHI6qbK6lNK7F8MjUIDR_MGvN0tX_rILT128qMam4fWCyq1wW-R5nTeMC7rYmQ53jk3n15yaYGwT_w0B9b_673SsSfubDcleXSnA=w461"},
    {"name": "Azuki #2174", "link": "https://lh3.googleusercontent.com/uYG_6uG3zb73Obf0F1-Erd95zv4302vmdURf9XtMl7ejscbL8VWKFRKZ3bb7mOCKNhyEbiw6RKvmizC1NwWHiQgyW13ncPdEMGTTyA=w461"}
]
// let undef = [
//     {"name": "", "link": ""},
//     {"name": "", "link": ""},    
//     {"name": "", "link": ""},
//     {"name": "", "link": ""},
//     {"name": "", "link": ""}
// ]
let collectionsLists = [explosionOfColor, etherBear, lightAndDark, singularity, cyberKongz, azuki]

let description1 = "Explosion of Color is the Genesis collection of AIIV, an AI art collaboration by Ravi Vora and Phil Bosua. 100 AI generated unique artworks exploring concepts and inspiring us to imagine a better life through art. \n Through the works in this collection we experience how our lives and the lives of others are connected. The goal is not just to create art, but to use art as a vessel to stimulate humanity. \n Explosion of Color - THE RESERVE: https://opensea.io/collection/explosionofcolorreserve \n AIIV is a part of the AIM Collective"
let description2 = "A happily grizzly bear named Ether , has his world turned upside down after he meets NFT world. It turns out that Ether can be different from other forest bears: wearing clothes, smoking cigarettes and doing whatever he wants. \n We decided to keep up with the automatically generated collections. Therefore, there have been changes in our collection. \n EtherBears #1 to #265 are handcrafted and unique. Starting from EtherBear #266, automatically generated bears with prescribed properties will be minted. I invite you to see what happens.\n Here will only ever be 5000 EtherBears in the world, and we've minted 5000/5000!"
let description3 = "Light and Dark is the genesis collection of AI artist Phil Bosua. \n 100 unique AI generated artworks. \n “There has always been light and dark. Light is love and dark is the lack of love. As individuals we must choose between self-knowledge with maturity and integrity, or validation from others. Explore your mind with everything you decide to think about. Be true to yourself and the world will have everything it needs.” \n AI Phil Bosua is a part of the AIM collective. \n https://www.aimc.ai/"
let description4 = "The Singularity Collection is the second release by AIIV, an AI art collaboration by Ravi Vora and Phil Bosua. \n 1000 AI generated unique artworks exploring the AI singularity through art. \n When we all inevitably experience singularity, what will it feel like? Could we all be constructing a subjective perspective of our current reality that constrains the true vision of the future? The thin veil between reality and our imagination disappears, and our experience of this world transforms from what it is - into what we want it to be. We free ourselves from the constraints of a world that is less than we hoped and step into a world that can be more than we imagine. Visions that feel familiar but also not of this world. \n Maybe the AI is telling us it is already here - if we only decide to see it. \n AIIV is part of the AIM Collective"
let description5 = "Welcome to an alternate reality, where evolution took a different route and weird apes roam the earth. Some appear normal. Some look weird. And some are just damn cool! Every CyberKong is unique and owns randomized items with different rarities. A few are super rare and even animated! Maybe some of them look familiar!"
let description6 = "A brand for the metaverse. Built by the community. View the collection at azuki.com/gallery. \n Azuki starts with a collection of 10,000 avatars that give you membership access to The Garden: a corner of the internet where artists, builders, and web3 enthusiasts meet to create a decentralized future. Azuki holders receive access to exclusive drops, experiences, and more. Visit azuki.com for more details. \n We rise together. We build together. We grow together. \n Ready to take the red bean?"

let collections = [
    {"name": "Explosion of Color", artist: "AIIV", description: description1, photo: "https://lh3.googleusercontent.com/5RFGaryuHk6LAFW4O33mDU6rBuxk9ox7dPUtZreQc9Myzg-MuOKQDr2uYMYZT1D9d0lfu1aeekcRLsVeTPY1qZIGHQdMzJhjriI17ro=s130", websiteLink: "https://www.aiiv.ai/"},
    {"name": "Ether Bears", artist: "EtherBear", description: description2, photo: "https://lh3.googleusercontent.com/F5zjPKSMpJ6X778YtOQXp304MCbUKxlFqt_gQL7GOr9zhJcwVDEI5ZW65Yjxt_ScXGtVzhQImdDvByL-c9GNiMXLrP_AO2xawgO1yxM=s130", websiteLink: "https://etherbears.club/"},
    {"name": "Light and Dark", artist: "Phil Bosua", description: description3, photo: "https://lh3.googleusercontent.com/3pYkFqiQrmqQFjtrEr3zogrHS4Q1MWBL-LXZchE-fCjc1boZMCOLa97BC8DOxhmTQX66Q3sinEsZR0M0t-1yYKxkPDYHvXgl7MvF4Yk=s130", websiteLink: "https://www.aimc.ai/"},
    {"name": "Singularity", artist: "AIIV", description: description4, photo: "https://lh3.googleusercontent.com/l6wZipAP-Ng1uXPz7BX0qY20PGg7YVlBIvBoepByOt7IejcoEibR69nmESvTX1UdWCkBhGSezKmw3Cy_VE4Jol-FccJrs17janLlsKk=s130", websiteLink: "https://www.aiiv.ai/"},
    {"name": "CyberKongz", artist: "000000", description: description5, photo: "https://lh3.googleusercontent.com/LIpf9z6Ux8uxn69auBME9FCTXpXqSYFo8ZLO1GaM8T7S3hiKScHaClXe0ZdhTv5br6FE2g5i-J5SobhKFsYfe6CIMCv-UfnrlYFWOM4=s130", websiteLink: "https://www.cyberkongz.com/"},
    {"name": "Azuki", artist: "TeamAzuki", description: description6, photo: "https://lh3.googleusercontent.com/H8jOCJuQokNqGBpkBN5wk1oZwO7LM8bNnrHCaekV2nKjnCqw6UB5oaH8XyNeBDj6bA_n1mjejzhFQUP3O1NfjFLHr3FOaeHcTOOT=s130", websiteLink: "https://www.azuki.com/"}
]

function createSample(){
    for (let n = 0; n < collectionsLists.length; n++){
        const today = new Date()
        let collection = collectionsLists[n]
        let collectionMetaData = collections[n]
        let month = randInt(0,2), day = randInt(1,23), hour = randInt(0, 23), minutes = randInt(0, 59), seconds = randInt(0,59)
        let releaseDate = new Date(2022, month, day, hour, minutes, seconds)
        let collectionID = makeID(16)
        console.log(n)
        console.log(`collection ${collectionMetaData.name} created`)
        createCollection(collectionMetaData.name, collectionMetaData.artist, releaseDate, collectionID, collectionMetaData.description, collectionMetaData.photo, collectionMetaData.websiteLink)
        for (let i = 0; i < collection.length; i++) {
            console.log(`item ${collection[i].name} created`)
            //open db
            var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
                if (error) return console.log(error.message);
                        });
            //select random user
            db.all(`SELECT userID, username FROM users`, function (error, users) {
                let lucky = randInt(0,users.length - 1)
                console.log(lucky)
                let userID = users[lucky]["userID"]
                console.log(users[lucky]["username"])
                if (releaseDate > today) {
                    console.log('not released yet')
                    createItem(collection[i]['name'], null, `${collectionID}`, collection[i]['link'], "img")
                } else {
                    createItem(collection[i]['name'], userID, `${collectionID}`, collection[i]['link'], "img")
                }
            })
            //close db
            db.close((error) => {
                if (error) return console.log(error.message);
            })
        }
    }
}

let githubItems = [
    {"name": "Git's Bits #1", "link": "https://www.omgubuntu.co.uk/wp-content/uploads/2018/06/github-logo.jpeg"},
    {"name": "Git's Bits #2", "link": "https://www.omgubuntu.co.uk/wp-content/uploads/2018/06/github-logo.jpeg"},
    {"name": "Git's Bits #3", "link": "https://www.omgubuntu.co.uk/wp-content/uploads/2018/06/github-logo.jpeg"},
    {"name": "Git's Bits #4", "link": "https://www.omgubuntu.co.uk/wp-content/uploads/2018/06/github-logo.jpeg"},
    {"name": "Git's Bits #5", "link": "https://www.omgubuntu.co.uk/wp-content/uploads/2018/06/github-logo.jpeg"}
]
function createGit(){
    var collectionID = makeID(16)
    var gitReleaseDate = new Date(2022, 2, 25, 10, 10, 10)
    var githubDescription = "collaborate with github users to increase your chance of winning!"
    var githubLogo = "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
    createCollection("Git's Bits", 'Github', gitReleaseDate, collectionID, githubDescription, githubLogo, "https://github.com")
    githubItems.forEach ((item) => {
        console.log(item)
        let userID = null
        createItem(item.name, userID, `${collectionID}`, item.link, "img")
        console.log(`item ${item.name} created`)
    })
}

// databaseSetup()
// createSample()