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
var file = "LongWingdb.db";
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
  db.run("CREATE TABLE Car (carplate TEXT PRIMARY KEY, carmake TEXT, carmodel TEXT, caryear TEXT, username TEXT, city TEXT, starttime TIMESTAMP, endtime TIMESTAMP, ifreserve TEXT)");
  db.run("CREATE TABLE Reserve (carplate TEXT PRIMARY KEY, username TEXT, starttime TIMESTAMP, endtime TIMESTAMP)");
  console.log("Creating User table in LongWing database.");
}
});

// REST API as described in http://pgbovine.net/rest-web-api-basics.html

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

app.post('/reserves', function (req, res) {
  var postBody = req.body;
  var carplate = postBody.carplate;
  var starttime = postBody.starttime;
  var endtime = postBody.endtime;
  var usern = req.cookies.usern;
  var argu2 = "UPDATE Car SET ifreserve='1' WHERE carplate='"+carplate+"'";
  if (!usern) {
    res.send('ERROR');
    return; 
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO Reserve VALUES (?,?,?,?)");
    stmt.run(carplate,usern, starttime, endtime);
    stmt.finalize();
    db.run(argu2);
  });
  console.log("Inserting a reserve in database.");
  res.send('OK');
});

app.post('/cars', function (req, res) {
  var postBody = req.body;
  var myCar = postBody.carmake;
  console.log(postBody.starttime);
  console.log(postBody.endtime);

  if (!myCar) {
    res.send('ERROR');
    return; 
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO Car VALUES (?,?,?,?,?,?,?,?,?)");
    stmt.run(postBody.carplate, myCar, postBody.carmodel, postBody.caryear, postBody.username, postBody.city,postBody.starttime, postBody.endtime, '0');
    stmt.finalize();
  });
  console.log("Inserting a car in database.");
  res.send('OK');
});


// READ profile data for a user
app.get('/cars/*', function (req, res) {
    var postBody = req.params[0].split(" ");
    var retcity = postBody[0];
    var retst = postBody[1].split("-");
    var retet = postBody[2].split("-");
    var argu = "SELECT carmake, carmodel ,caryear, username, starttime, endtime FROM Car WHERE city='"+retcity+"' AND ifreserve='0'";
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
              var retval = {carm: row[i].carmake, carmo: row[i].carmodel, cary: row[i].caryear, usern: row[i].username, city: retcity, starttime: row[i].starttime, endtime: row[i].endtime};
              var tempst = row[i].starttime.split("-");
              var tempet = row[i].endtime.split("-");
              if( ( new Date(tempst[0],tempst[1],tempst[2]) <= new Date(retst[0],retst[1],retst[2]) ) && ( new Date(tempet[0],tempet[1],tempet[2]) >= new Date(retet[0],retet[1],retet[2]) )){
                carlist.push( retval );
              }
            }
            
            //res.send(res.json(carlist));
            var retcarlist = {CarRecords: carlist};
            res.send(retcarlist);
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
            res.cookie('usern',retname, {expires : new Date(new Date().getTime() + 60*1000*100)});
            res.cookie('passw',retpass, {expires : new Date(new Date().getTime() + 60*1000*100)});
            res.cookie('fulln',retfullname, {expires : new Date(new Date().getTime() + 60*1000*100)});
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

//Update a user
app.put('/users/*', function (req, res) {
  var postBody = req.params[0].split(" ");
  var usern = req.cookies.usern;
  var fulln = postBody[0];
  var telep = postBody[0];
  var email = postBody[2];
  var arg = "UPDATE User SET fullname='"+fulln+"', email='"+email+"',telephone='"+telep+"' WHERE username='"+usern+"'";

  db.serialize(function(){
    db.run(argu, function(err){
        if(err !== null){
          console.log(err);
          res.send('ERROR');
        }else{
          res.send('OK');
        }
    });
  });
});
// DELETE a user
app.delete('/users/*', function (req, res) {
  var nameToLookup = req.params[0]; // this matches the '*' part of '/users/*' above
  // try to look up in fakeDatabase
  var argu = "DELETE FROM User WHERE username='"+nameToLookup+"'";
  db.serialize(function(){
    db.run(argu, function(err){
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

app.delete('/reserves/*', function (req, res) {
  var carplate = req.params[0]; // this matches the '*' part of '/users/*' above
  
  var argu = "DELETE FROM Reserve WHERE carplate='"+carplate+"'";
  var argu2 = "UPDATE Car SET ifreserve='0' WHERE carplate='"+carplate+"'";
  db.serialize(function(){
    db.run(argu2);
    db.run(argu, function(err){
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