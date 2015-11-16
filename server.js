var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();

// required to support parsing of POST request bodies
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cookieParser());
app.use(express.static('static_files'));


var fs = require("fs");
var file = "/Users/kezhenchen/Documents/cs/cs210/project/LongWingdb.db";
var exists = fs.existsSync(file);
if(!exists){
  console.log("Creating LongWing database file.");
  fs.openSync(file,"w");
}
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);
db.serialize(function(){
if(!exists){
  db.run("CREATE TABLE User (username TEXT PRIMARY KEY, password TEXT, fullname TEXT, email TEXT, telephone TEXT)");
  db.run("CREATE TABLE Car (carmake TEXT, caryear TEXT, username TEXT, city TEXT)");
  console.log("Creating User table in LongWing database.");
}
});

// REST API as described in http://pgbovine.net/rest-web-api-basics.htm

// CREATE a new user

app.post('/users', function (req, res) {
  var postBody = req.body;
  var myName = postBody.name;

  // must have a name!
  if (!myName) {
    res.send('ERROR');
    return; // return early!
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO User VALUES (?,?,?,?,?)");
    stmt.run(myName, postBody.password, postBody.fullname,postBody.email, postBody.telephone);
    stmt.finalize();
  });
  console.log("Creating a user in database.");
  res.send('OK');
});

app.post('/cars', function (req, res) {
  var postBody = req.body;
  var myCar = postBody.carmake;

  // must have a name!
  if (!myCar) {
    res.send('ERROR');
    return; // return early!
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO Car VALUES (?,?,?,?)");
    stmt.run(myCar, postBody.caryear, postBody.username, postBody.city);
    stmt.finalize();
  });
  console.log("Creating a user in database.");
  res.send('OK');
});


// READ profile data for a user
//
// To test with curl, run:
//   curl -X GET http://localhost:3000/users/Philip
//   curl -X GET http://localhost:3000/users/Jane
app.get('/cars/*', function (req, res) {
    var postBody = req.params[0];
    var argu = "SELECT carmake, caryear, username FROM Car WHERE city='"+postBody+"'";
    db.serialize(function(){
      db.all(argu, function(err,row){
          if(err !== null){
            console.log(err);
            res.send('{}');
          }
          if(row.length==0){
            res.send('{}');
          }else{
            var carlist = [];
            for(i=0; i<row.length; i++){
              var retval = {carm: row[i].carmake, cary: row[i].caryear, usern: row[i].username, city: row[i].city};
              carlist.push( retval );
            }
            res.send(res.json(carlist));
          }
      });
    });
    
});


app.get('/users/*', function (req, res) {
  if(!req.cookies.usern){
    var postBody = req.params[0].split(" ");
    var nameToLookup = postBody[0];
    var passToLookup = postBody[1];
    var argu = "SELECT username, password, fullname FROM User WHERE username='"+nameToLookup+"' AND password='"+passToLookup+"'";
    db.serialize(function(){
      db.all(argu, function(err,row){
          if(err !== null){
            console.log(err);
            res.send('{}');
          }
          if(row.length==0){
            res.send('{}');
          }else{
            var retname = row[0].username;
            var retpass = row[0].password;
            var retfullname = row[0].fullname;
            var retval = {name: retname, password: retpass};
            res.cookie('usern',retname);
            res.cookie('passw',retpass);
            res.cookie('fulln',retfullname);
            res.send(retval);
          }
      });
    });}
    else{
      var usern = req.cookies.usern;
      var argu2 = "SELECT password FROM User WHERE username='"+usern+"'";
      db.serialize(function(){
      db.all(argu2, function(err,row){
            var retpass = row[0].password;
            var retval = {name: usern, password: retpass};
            res.send(retval);
      });
    });
    }
});

// DELETE a user
app.delete('/users/*', function (req, res) {
  var nameToLookup = req.params[0]; // this matches the '*' part of '/users/*' above
  // try to look up in fakeDatabase
  var argu = "DELETE FROM User WHERE username='"+nameToLookup+"'";
  db.serialize(function(){
    db.run(argu, function(err,row){
        //var retval = {name: row.username, password: row.password};
        //console.log(retval);
        if(err !== null){
          console.log(err);
          res.send('ERROR');
        }else{
          res.send('OK');
        }
    });
  });

});


// start the server on http://localhost:3000/
var server = app.listen(3000, function () {
  var port = server.address().port;
  console.log('Server started at http://localhost:%s/', port);
});