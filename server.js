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
  db.run("CREATE TABLE User (username TEXT PRIMARY KEY, password TEXT, fullname TEXT, email TEXT, telephone TEXT, image TEXT)");
  db.run("CREATE TABLE Car (carplate TEXT, carmake TEXT, carmodel TEXT, caryear TEXT, username TEXT, city TEXT, state TEXT , starttime TIMESTAMP, endtime TIMESTAMP, description TEXT , ifreserve TEXT)");
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
    var stmt = db.prepare("INSERT INTO User VALUES (?,?,?,?,?,?)");
    stmt.run(myName, postBody.password, postBody.fullname,postBody.email, postBody.telephone, "http://i.telegraph.co.uk/multimedia/archive/03235/potd-husky_3235255k.jpg");
    stmt.finalize();
  });
  console.log("Creating a user in database.");
  res.send('OK');
});

app.post('/reserves', function (req, res) {
  var postBody = req.body;
  var carplate = postBody.carplate;
  var carmake = postBody.carmake;
  var carmodel = postBody.carmodel;
  var caryear = postBody.caryear;
  var city = postBody.city;
  var state = postBody.state;
  var carowner = postBody.carowner;
  var cardes = postBody.cardescription;
  var starttime = postBody.starttime;
  var endtime = postBody.endtime;
  var catstarttime = postBody.carstarttime;
  var catendtime = postBody.carendtime;
  var usern = postBody.username;
  var argu2 = "DELETE FROM Car WHERE carplate='"+carplate+"'";
  if (!usern) {
    res.send('ERROR');
    return; 
  }

  if(usern==carowner){
    res.send('You cannot rent your own Car');
    return;
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO Reserve VALUES (?,?,?,?)");
    stmt.run(carplate,usern, starttime, endtime);
    stmt.finalize();

    var cartempst = catstarttime.split("-");
    var cartempet = catendtime.split("-");
    var tempst = starttime.split("-");
    var tempet = endtime.split("-");
    db.run(argu2);
    if(  new Date(cartempst[0],cartempst[1],cartempst[2]) < new Date(tempst[0],tempst[1],tempst[2]) ){
      var stmt = db.prepare("INSERT INTO Car VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      stmt.run(carplate, carmake, carmodel, caryear, carowner, city, state, catstarttime, starttime, cardes,'0');
      stmt.finalize();
    }

    if( new Date(tempet[0],tempet[1],tempet[2]) < new Date(cartempet[0],cartempet[1],cartempet[2])  ){
      var stmt = db.prepare("INSERT INTO Car VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      stmt.run(carplate, carmake, carmodel, caryear, carowner, city, state, endtime, catendtime, cardes,'0');
      stmt.finalize();
    }
  });
  console.log("Inserting a reserve in database.");
  res.send('OK');
});

app.post('/cars', function (req, res) {
  var postBody = req.body;
  var myCar = postBody.carmake;
  var myCity = postBody.city.toLowerCase();
  console.log(postBody.starttime);
  console.log(postBody.endtime);

  if (!myCar) {
    res.send('ERROR');
    return; 
  }

  db.serialize(function(){
    var stmt = db.prepare("INSERT INTO Car VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    stmt.run(postBody.carplate, myCar, postBody.carmodel, postBody.caryear, postBody.username, myCity, postBody.state, postBody.starttime, postBody.endtime, postBody.description,'0');
    stmt.finalize();
  });
  console.log("Inserting a car in database.");
  res.send('OK');
});


// READ profile data for a user
app.get('/cars/*', function (req, res) {
    var postBody = req.params[0].split("+");
    var retcity = postBody[0].toLowerCase();
    var retstate = postBody[1];
    var retst = postBody[2].split("-");
    var retet = postBody[3].split("-");
    console.log(postBody);
    var argu = "SELECT carplate, carmake, carmodel ,caryear, username, starttime, endtime, description FROM Car WHERE city='"+retcity+"' AND state='"+retstate+"'";
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
              var retval = {carpla: row[i].carplate, carm: row[i].carmake, carmo: row[i].carmodel, cary: row[i].caryear, usern: row[i].username, city: retcity, state: retstate, starttime: row[i].starttime, endtime: row[i].endtime, description: row[i].description};
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


app.get('/cars_owner/*', function (req, res) {
    var postBody = req.params[0].split("+");
    console.log(postBody);
    var argu = "SELECT carplate, carmake, carmodel ,caryear, starttime, endtime, description FROM Car WHERE username='"+postBody+"'";
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
              var retval = {carpla: row[i].carplate, carm: row[i].carmake, carmo: row[i].carmodel, cary: row[i].caryear, starttime: row[i].starttime, endtime: row[i].endtime, description: row[i].description};
              //var tempst = row[i].starttime.split("-");
              //var tempet = row[i].endtime.split("-");
              carlist.push( retval );
              
            }
            
            //res.send(res.json(carlist));
            var retcarlist = {CarRecords: carlist};
            res.send(retcarlist);
          }
      });
    });
});


app.get('/reserves/*', function (req, res) {
    var postBody = req.cookies.usern;
    if(postBody==null){
      res.send('{}');
    }
    var argu = "SELECT username, carplate, starttime, endtime FROM Reserve WHERE username='"+postBody+"'";
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
              var retval = {carowner: row[i].username, carplate: row[i].carplate, starttime: row[i].starttime, endtime: row[i].endtime};
              carlist.push( retval );
            }
            
            //res.send(res.json(carlist));
            var retcarlist = {CarRecords: carlist};
            res.send(retcarlist);
          }
      });
    });
});

app.get('/users/*', function (req, res) {
    var postBody = req.params[0].split(" ");
    var nameToLookup = postBody[0];
    var passToLookup = postBody[1];
    console.log(nameToLookup + "+"+passToLookup);
    var argu = "SELECT username, password, fullname, email, telephone, image FROM User WHERE username='"+nameToLookup+"' AND password='"+passToLookup+"'";
    if(passToLookup===undefined){
      argu = "SELECT username, password, fullname, email, telephone, image FROM User WHERE username='"+nameToLookup+"'";
    }
    console.log(argu);
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
            var retemail = row[0].email;
            var rettele = row[0].telephone;
            var retimg = row[0].image;
            var retval = {name: retname, password: retpass, fullname: retfullname, email: retemail, telephone: rettele, image: retimg};
            if(req.cookies.usern==null){
            res.cookie('usern',retname, {expires : new Date(new Date().getTime() + 60*1000*100)});
            res.cookie('passw',retpass, {expires : new Date(new Date().getTime() + 60*1000*100)});
            res.cookie('fulln',retfullname, {expires : new Date(new Date().getTime() + 60*1000*100)});
          }
          console.log(retval);
            res.send(retval);
          }
      });
    });
});

//Update a user
app.put('/users/*', function (req, res) {
  var postBody = req.params[0].split("= =");
  var usern = req.cookies.usern;
  var fulln = postBody[0];
  var telep = postBody[1];
  var email = postBody[2];
  var image = postBody[3];
  var arg = "UPDATE User SET fullname='"+fulln+"', email='"+email+"',telephone='"+telep+"', image='"+image+"' WHERE username='"+usern+"'";
  //var arg = "UPDATE User SET fullname='"+fulln+"', email='"+email+"',telephone='"+telep+"' WHERE username='"+usern+"'";
  console.log(arg);
  if(usern==null){
    res.send('ERROR');
  }
  db.serialize(function(){
    db.run(arg, function(err){
        if(err !== null){
          console.log(err);
          res.send('ERROR');
        }else{
          res.send(image);
        }
    });
  });
});
// DELETE a user
app.delete('/users/*', function (req, res) {
  var nameToLookup = req.params[0]; 
  var argu = "DELETE FROM User WHERE username='"+nameToLookup+"'";
  db.serialize(function(){
    db.run(argu, function(err){
        //var retval = {name: row.username, password: row.password};
        //console.log(retval);
        if(err !== null){
          console.log('Error');
          res.send('ERROR');
        }else{
          console.log('OK');
          res.send('OK');
        }
    });
  });
});



app.delete('/cars/*', function (req, res) {
  var postBody = req.params[0].split("+"); 
  console.log(postBody);
  var carplate = postBody[0];
  var starttime = postBody[1];
  var endtime = postBody[2];

  var argu = "DELETE FROM Car WHERE carplate='"+carplate+"' AND starttime='"+starttime+"' AND endtime='"+endtime+"'";
  db.serialize(function(){
    db.run(argu, function(err){
        //var retval = {name: row.username, password: row.password};
        //console.log(retval);
        if(err !== null){
          console.log('Error');
          res.send('ERROR');
        }else{
          console.log('OK');
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
