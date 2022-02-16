// Heroku Link: https://mintdrop.herokuapp.com/
// Author: Lundeen Cahilly
// Sources: 
//  1) https://www.youtube.com/watch?v=xDYx5UdHwv0
//       Used to in the setup of this app's SQL database
//  2) https://www.codegrepper.com/code-examples/javascript/generate+random+key+javascript
//       used to generate ids for the user, items, trades, etc
//  3) https://www.youtube.com/watch?v=NuyzuNBFWxQ
//       used to see how passwords and other sensitive data should be encrypted
//  4) https://getbootstrap.com/
//      used to massively accelerate and improve front-end development
//  5) https://waelyasmina.medium.com/a-guide-into-using-handlebars-with-your-express-js-application-22b944443b65
//      really helpful to learn 'helpers' in handlebars; was used in displaying inventories, for example
//  6) https://opensea.io/
//      primarily used to make collections, but also used as a design reference
//  7) https://www.youtube.com/watch?v=TDe7DRYK8vU and https://www.section.io/engineering-education/what-are-cookies-nodejs/
//      making cookies & sessions for user login
//  8) https://coolors.co/f2e279-d1495b-e9f2eb-0081a7-8acb88-089673
//      project color palette

//--------------Setup--------------//

const express = require("express");
const session = require("express-session");
const cookieParser = require('cookie-parser');
const querystring = require('querystring');
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
app.use(express.static(__dirname));
app.use(express.urlencoded());
const axios = require("axios");
const options = {root: path.join(__dirname)}
const sqlite3 = require("sqlite3").verbose();
const { createHash } = require("crypto")
const { scriptSync, randomBytes } = require("crypto")
const handlebars = require("express-handlebars");
const { render } = require("sass");
const Handlebars = handlebars.create({
  extname: '.html',
  defaultLayout: null
})
const { databaseSetup, createItem, createCollection, createTrade, checkTrades } = require('./db-setup');
const { query } = require("express");
const { resolveSoa } = require("dns");
app.engine('html', Handlebars.engine)
app.set('view engine', 'html')
app.set('/views')

//---------CRYPTOGRAPHY_SETUP---------//
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
//---------DB_SETUP---------//
// databaseSetup()

//--------------Middleware--------------//
app.use(
  session({
  secret: 'key that signs cookie',
  resave: false,
  saveUninitialized: false
  })
);

app.use(cookieParser());
app.use(helmet());

//--------------Routes--------------//
app.get("/", function (req, res) {
  let username = req.cookies.username;
  res.render('index', {
    username:username, 
    loggedIn:true
  })
})
app.get("/db/:table", function (req, res) {
    req.params;
    let table = req.params['table']
    //OPEN database
    const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
        if (error) return console.log(error.message);
        console.log("database connected")
    });
    //print users table
    db.all(`SELECT * FROM ${table}`, [], (error,rows) => {
        if (error) return console.log(error.message);
        res.json(rows)
    })
    //CLOSE database
    db.close((error) => {
        if (error) return console.log(error.message);
    })
})
app.get("/about", function (req, res) {
  let html = "/source/about.html"
  res.sendFile(html, options, function(error) {
    if (error) {res.sendStatus(404)}
  })
})
app.get("/create/user", function (req,res) {
  let html = "/source/create_user.html"
  res.sendFile(html, options, function(error) {
    if (error) {res.sendStatus(404)}
  })
})
app.post("/create/user", function (req,res) {
    req.body;
    let username = req.body["username"]
    let email = req.body["email"]
    let password = req.body["password"]
    let userID = makeID(8)
    let profilePhoto = 'https://cdn.glitch.global/c59af7b5-3457-4ad7-a609-9ba55d160e31/defaultProfilePic.png?v=1644712398289'

    let emailHash = hash(email)
    let passwordHash = hash(password)
    //OPEN database 
    const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
        if (error) return console.log(error.message);
        console.log("database connected")
    });
    //add new user to database
    //catch error if userrname is already taken
    db.all(`SELECT COUNT(*) FROM users WHERE username="${username}"`, function (error, row) {
        if (error) return console.log(error.message);
        if (row[0]['COUNT(*)'] > 0) {
            res.send('username taken')
        } else {
          db.run(`INSERT INTO users (userID, profilePhoto, username, password, email) VALUES(?,?,?,?,?)`,[userID, profilePhoto, username, passwordHash, emailHash]), (error) => {
              if (error) return console.log(error.message);
          }
          res.redirect('/')
        }
    })    
    //CLOSE database
    db.close((error) => {
        if (error) return console.log(error.message);
    })
})
app.get("/login", function (req,res) {
    let html = "/source/login.html"
    res.sendFile(html, options, function(error) {
      if (error) {res.sendStatus(404)}
    })
})
app.post("/login", function (req,res) {
  let username = req.body["username"]
  let password = req.body["password"]
  let passwordHash = hash(password)
  //open db
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });
  //verify login
  db.all(`SELECT password FROM users WHERE username="${username}"`), function (error, row) {
    if (error) return res.send('error occurred');
    let passwordHashDb = row[0]["password"]
    if (passwordHash == passwordHashDb) {
      console.log('logged in')
      res.cookie("username", username, {
        maxAge: 5000,
        secure: false,
        httpOnly: true, 
        sameSite: 'lax'
      })
      res.redirect("/")
    } else {
      res.redirect("/login")
    }
  }
  //close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.get("/collections", function (req, res) {
  //OPEN database
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });  
  query1 = `
  SELECT collectionID, name, releaseDate, artist, description, photo, websiteLink 
  FROM collections
  ORDER BY releaseDate DESC`
  db.all(query1, function(error, collections){
    if (error) {return res.render('collections', {dataExists:false, collectionInfo:null})}
    for (let i = 0; i < collections.length; i++) {
      let exactTime = new Date(collections[i]['releaseDate'])
      let releaseDate = exactTime.toDateString()
      collections[i]['releaseDate'] = releaseDate
    }
    console.log(collections)
    res.render('collections', {
      dataExists:true, 
      collectionInfo:collections
    })
  })
  //CLOSE database
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.get("/collections/:collectionID", function (req,res) {
  req.params;
  let collectionID = req.params['collectionID']
  //open db
  var db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });
  //item count, items info (name, mediaLink, mediaType, itemID), collection info(name, artist(s), description, website link, photo)
  let query = `
  SELECT collections.name AS collectionName, collections.releaseDate, collections.artist, collections.description, collections.photo, collections.websiteLink, items.itemID, items.name, items.mediaType, items.mediaLink, items.mintDate
  FROM collections
  INNER JOIN items ON collections.collectionID = items.collectionID
  WHERE items.collectionID="${collectionID}"`
  db.all(query, function (error, itemInfo) {
    if (error) {return res.render('collection', {dataExists:false, collectionInfo:null, itemInfo:null})};
    for (let i = 0; i < itemInfo.length; i++) {
      let exactMintTime = new Date(itemInfo[i]['mintDate'])
      let mintDate = exactMintTime.toDateString()
      let exactReleaseTime = new Date(itemInfo[i]['releaseDate'])
      let releaseDate = exactReleaseTime.toDateString()
      itemInfo[i]['mintDate'] = mintDate
      itemInfo[i]['releaseDate'] = releaseDate
    }
    var collectionInfo = itemInfo[0]
    console.log(collectionInfo)
    res.render('collection', {
      dataExists:true,
      collectionInfo:collectionInfo,
      itemInfo:itemInfo
    })
  })
  // close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.get("/collections/:collectionId/rankings", function (req, res) {
    req.params; 
    let collectionId = req.params["collectionId"]

    // send stylelized html file w/ the collection and its current rankings by hours listened
})
//trade page, to allow users to see
app.get('/trades', function (req,res) {
  checkTrades()
  res.render('trades', {
    tradeSent:false, 
    loginError:false, 
    wrongAddress:false,
    notLoggedIn:true,
    tradeInfoExists:false,
    receiveUserInfo:null,
    sendUserInfo:null
  })
})
app.post('/trades/send', function (req,res) {
  var sendUserUsername = req.body['username']
  var password = hash(req.body['password'])
  var sendItemID = req.body['sendItemID']
  var receiveUserUsername = req.body['receiveUserUsername']
  var receiveItemID = req.body['receiveItemID']
  //open db
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  //verify login of sender
  //verify ownership of sender + items
  //verify existence & ownership of receiver + items
  var query1 = `
      SELECT userID FROM users
      INNER JOIN items ON items.ownerID = users.userID
      WHERE password="${password}" AND username="${sendUserUsername}" AND itemID="${sendItemID}"`
  var query2 = `
      SELECT userID FROM users
      INNER JOIN items ON items.ownerID = users.userID
      WHERE username="${receiveUserUsername}" AND itemID="${receiveItemID}"`
  db.all(query1, function (error, row1) {
      if (error) return res.render('trades', {tradeSent:false, loginError:true, wrongAddress:false, notLoggedIn:true, tradeInfoExists:false, receiveUserInfo:null, sendUserInfo:null})
      if (error) return console.log(error)
      console.log(row1)
      var sendUserID = row1[0]['userID']
      db.all(query2, function(error, row2) {
          if (error) return res.render('trades', {tradeSent:false, loginError:false, wrongAddress:true, notLoggedIn:true, tradeInfoExists:false, receiveUserInfo:null, sendUserInfo:null})
          if (error) return console.log(error)
          console.log(row2)
          console.log('here2')
          var receiveUserID = row2[0]['userID']
          //create trade in db
          var tradeID = makeID(16)
          var sendUserApproval = true
          var receiveUserApproval = false
          var completion = false
          var date = null
          createTrade(tradeID, sendItemID, receiveItemID, sendUserID, receiveUserID, sendUserApproval, receiveUserApproval, completion, date)
          res.render(`trades`, {tradeSent:true, loginError:true, wrongAddress:false, tradeInfoExists:false, notLoggedIn:true, receiveUserInfo:null, sendUserInfo:null})
      })
    })
  })
  //close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.post('/trades/inbox', function (req,res) {
  let receiveUserUsername = req.body["username"]
  let password = hash(req.body["password"])
  //open db
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });
  db.all(`SELECT userID FROM users WHERE username="${receiveUserUsername}" AND password="${password}"`, function (error, row) {
    if (error) return console.log(error.message);
    var receiveUserID = row[0]['userID']
    let query1 = `
        SELECT receiveUsers.sendUserID, users.profilePhoto, items.name, items.itemID, items.mediaType, items.mediaLink, items.mintDate, collections.name AS collectionName
        FROM (
          SELECT receiveUserID, receiveItemID, sendItemID, sendUserID FROM trades
          WHERE receiveUserID="${receiveUserID}" AND completion=${false}
        ) AS receiveUsers
        INNER JOIN items ON receiveUsers.sendItemID = items.itemID
        INNER JOIN collections ON collections.collectionID = items.collectionID
        INNER JOIN users ON receiveUsers.receiveUserID = users.user
        WHERE userID="${receiveUserID}"`
    db.all(query1, function(error, tradeInfo) {
      if (error) {console.log(error.message)}
      console.log(tradeInfo)
      res.json(tradeInfo)
    })
    //find out what the receieve user sends
    // db.all(query1, function(error, rows1) {
    //   if (error) return res.render('trades', {tradeSent:false, loginError:false, wrongAddress:false,notLoggedIn:false,tradeInfoExists:false,receiveUserInfo:null,sendUserInfo:null});
    //   if (rows1.length == 0) {
    //     return res.render('trades', {tradeSent:false, loginError:false, wrongAddress:false,notLoggedIn:false,tradeInfoExists:false,receiveUserInfo:null,sendUserInfo:null})
    //   } else {
    //     var sendUserID = rows1[0]['sendUserID']
    //   }
    //   let query2 = `
    //     SELECT users.username, users.profilePhoto, items.name, items.itemID, items.mediaType, items.mediaLink, items.mintDate, collections.name AS collectionName
    //     FROM (
    //       SELECT sendUserID, receiveItemID FROM trades
    //       WHERE sendUserID="${sendUserID}"
    //     ) AS sendUsers
    //     INNER JOIN items ON sendUsers.receiveItemID = items.itemID
    //     INNER JOIN collections ON collections.collectionID = items.collectionID
    //     INNER JOIN users ON sendUsers.sendUserID = users.userID
    //     WHERE userID="${sendUserID}"`
    //   db.all(query2, function(error, rows2) {
    //     if (error) return res.render('trades', {tradeSent:false, loginError:false, wrongAddress:false,notLoggedIn:false,tradeInfoExists:false,receiveUserInfo:null,sendUserInfo:null});
    //     if (rows2.length == 0) {
    //       return res.render('trades', {tradeSent:false, loginError:false, wrongAddress:false,notLoggedIn:false,tradeInfoExists:false,receiveUserInfo:null,sendUserInfo:null})
    //     } else {
    //       for (let i = 0; i < rows1.length; i++) {
    //         let exactTime = new Date(rows1[i]['mintDate'])
    //         let date = exactTime.toDateString()
    //         rows1[i]['mintDate'] = date
    //       }
    //       for (let i = 0; i < rows2.length; i++) {
    //         let exactTime = new Date(rows2[i]['mintDate'])
    //         let date = exactTime.toDateString()
    //         rows2[i]['mintDate'] = date
    //       }
    //       res.render('trades', {
    //         tradeSent:false, 
    //         loginError:false, 
    //         wrongAddress:false,
    //         notLoggedIn:false,
    //         tradeInfoExists:rows1.length > 0 && rows2.length > 0,
    //         receiveUserInfo:rows1,
    //         sendUserInfo:rows2
    //       })
    //     }
    //   })
    // })
  })
  //close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.post("/trades/confirm", function (req,res) {
  var receiveUserUsername = req.body['receiveUserUsername']
  var receiveItemID = req.body['receiveItemID']
  var sendUserUsername = req.body['sendUserUsername']
  var sendItemID = req.body['sendItemID']
  //open db
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });
  //authentication of ownerships
  var query1 = `
      SELECT userID FROM users
      INNER JOIN items ON items.ownerID = users.userID
      WHERE username="${sendUserUsername}" AND itemID="${sendItemID}"`
  var query2 = `
      SELECT userID FROM users
      INNER JOIN items ON items.ownerID = users.userID
      WHERE username="${receiveUserUsername}" AND itemID="${receiveItemID}"`
  db.all(query1, function (error, row1) {
    if (error) return console.log(error.message)
    if (error) return console.log(error)
    console.log(row1)
    var sendUserID = row1[0]['userID']
    db.all(query2, function(error, row2) {
      if (error) return console.log(error.message)
      var receiveUserID = row2[0]['userID']
      db.run(`UPDATE trades SET receiveUserApproval=${true} WHERE sendUserID="${sendUserID}" AND sendItemID="${sendItemID}" AND receiveUserID="${receiveUserID}" AND receiveItemID="${receiveItemID}"`)
      checkTrades()
      res.redirect('/trades')
    })
  })
  //close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})
app.get("/profile/:userId", function (req, res) {
  //route param for user
  req.params;
  let userId = req.params["userId"]
  
  let html = "/source/profile.html"
  res.sendFile(html, options, function(error) {
    if (error) {res.sendStatus(404)}
  })
})
app.get("/inventory", function (req, res) {
  res.render('inventory', {
    username:null,
    profilePhoto:null,
    items:null,
    itemsExist:false,
    dataExists:false, 
    dataNotExists:true
  })
})
app.post("/inventory", function (req, res) {
  req.body;
  res.redirect(`/inventory/${req.body['username']}`)
})
app.get("/inventory/:username", function (req, res) {
  req.params;
  var username = req.params["username"]
  //open db
  const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE, (error) => {
    if (error) return console.log(error.message);
    console.log("database connected")
  });
  let query = 
    `SELECT users.profilePhoto, items.name, items.itemID, items.mediaType, items.mediaLink, items.mintDate, collections.name AS collectionName FROM users 
    INNER JOIN items ON users.userID = items.ownerID 
    INNER JOIN collections ON collections.collectionID = items.collectionID 
    WHERE username="${username}"
    ORDER BY items.mintDate DESC`
  db.all(query, function (error, rows) {
    if (error) return res.render('inventory', {username:null, profilePhoto:null, items:null, itemsExist:false, dataExists:false, dataNotExists:true});
    if (rows.length == 0) {
      return res.render('inventory', {username:null, profilePhoto:null, items:null, itemsExist:false, dataExists:false, dataNotExists:true});
    } else {
      var itemsExist = true
      var dataNotExists = false
      for (let i = 0; i < rows.length; i++) {
        let exactTime = new Date(rows[i]['mintDate'])
        let date = exactTime.toDateString()
        rows[i]['mintDate'] = date
      }
      var profilePhoto = rows[0]["profilePhoto"]
    }
    console.log(rows)
    res.render('inventory', {
        username:username,
        profilePhoto:profilePhoto,
        items:rows,
        itemsExist:itemsExist,
        dataExists:true, 
        dataNotExists:dataNotExists
    })
  })
  //close db
  db.close((error) => {
    if (error) return console.log(error.message);
  })
})

//---------------Startup--------------//
app.listen(port);
console.log('server is listening');