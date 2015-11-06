var express = require('express');
var app = express();

// required to support parsing of POST request bodies
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static('static_files'));


var fs = require("fs");
var file = "/Users/jiangfan/Documents/Rochester/Fall2015/csc210/LongWing/LongWingdb.db";
var exists = fs.existsSync(file);
if(!exists){
  console.log("Creating LongWing database file.");
  fs.openSync(file,"w");
}
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);
db.serialize(function(){
if(!exists){
  db.run("CREATE TABLE User (username, password, fullname, email, telephone)");
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
  // check if user's name is already in database; if so, send an error
  /*
  for (var i = 0; i < fakeDatabase.length; i++) {
    var e = fakeDatabase[i];
    if (e.name == myName) {
      res.send('ERROR');
      return; // return early!
    }
  }
  fakeDatabase.push(postBody);
*/
  console.log("Creating a user in database.");
  res.send('OK');
});


// READ profile data for a user
//
// To test with curl, run:
//   curl -X GET http://localhost:3000/users/Philip
//   curl -X GET http://localhost:3000/users/Jane
app.get('/users/*', function (req, res) {
  var postBody = req.params[0].split(" ");
  var nameToLookup = postBody[0];
  var passToLookup = postBody[1];
  var argu = "SELECT username, password FROM User WHERE username='"+nameToLookup+"' AND password='"+passToLookup+"'";
  db.serialize(function(){
    db.all(argu, function(err,row){
        //var retval = {name: row.username, password: row.password};
        //console.log(retval);
        if(err !== null){
          console.log(err);
          res.send('{}');
        }
        if(row.length==0){
          res.send('{}');
        }else{
          var retname = row[0].username;
          var retpass = row[0].password;
          var retval = {name: retname, password: retpass};
          res.send(retval);
        }
    });
  });
});

/*
app.get('/users', function (req, res) {
  var allUsernames = [];

  for (var i = 0; i < fakeDatabase.length; i++) {
    var e = fakeDatabase[i];
    allUsernames.push(e.name); // just record names
  }

  res.send(allUsernames);
});
*/

// UPDATE a user's profile with the data given in POST
/*
app.put('/users/*', function (req, res) {
  var nameToLookup = req.params[0]; // this matches the '*' part of '/users/*' above
  // try to look up in fakeDatabase
  for (var i = 0; i < fakeDatabase.length; i++) {
    var e = fakeDatabase[i];
    if (e.name == nameToLookup) {
      // update all key/value pairs in e with data from the post body
      var postBody = req.body;
      for (key in postBody) {
        var value = postBody[key];
        e[key] = value;
      }

      res.send('OK');
      return; // return early!
    }
  }

  res.send('ERROR'); // nobody in the database matches nameToLookup
});
*/


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

/*
  for (var i = 0; i < fakeDatabase.length; i++) {
    var e = fakeDatabase[i];
    if (e.name == nameToLookup) {
      fakeDatabase.splice(i, 1); // remove current element at index i
      res.send('OK');
      return; // return early!
    }
  }
  */
});

app.get('/search/*', function(req, res) {
  var e = {name: 'Camery', make: 'Toyota', Owner: 'Hailey', Year: '2012'};
  console.log("Start search in database.");
  res.send(e);
  return;
})

// start the server on http://localhost:3000/
var server = app.listen(3000, function () {
  var port = server.address().port;
  console.log('Server started at http://localhost:%s/', port);
});