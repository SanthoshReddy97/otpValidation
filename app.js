var app = require('express')()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , nStore = require('nstore')

  , speakeasy = require('speakeasy');
var twilio = require('twilio');
var accountSid = 'ACf606b030424952544d83161d1eee472c'; // Your Account SID from www.twilio.com/console
var authToken = '6313e5a4960396f948059fd5f084fb36';   // Your Auth Token from www.twilio.com/console

var twilio = require('twilio');
var client = new twilio(accountSid, authToken);


const ejs = require('ejs');

var users = nStore.new('data/users.db', function () {
  console.log("Loaded users.db");
});

server.listen(3000);

app.set('view engine', ejs)

app.get('/',function(req,res){
  res.render('home.ejs')
});

function createUser(phone_number, code, socket) {
    users.save(phone_number, {code: code, verified: false}, function (saverr) {
      if (saverr) { throw saverr; }
      client.messages.create({
          to: phone_number,
          from: '+12052933889',
          body: 'Your verification code is: ' + code
      }, function(twilioerr, responseData) {
        if (twilioerr) { 
          users.remove(phone_number, function(remerr) {if (remerr) { throw remerr; }});
          socket.emit('update', {message: "Invalid phone number!"});
        } else {
          console.log(responseData)
          socket.emit('code_generated');
        }
      });
    });
  }
      
      
      
      
      
      
    //   , function(twilioerr, responseData) {
    //     if (twilioerr) { 
    //       users.remove(phone_number, function(remerr) {if (remerr) { throw remerr; }});
    //       socket.emit('update', {message: "Invalid phone number!"});
    //     } else {
          
    //     }
    //   });
//     });
//   }
  
  function checkVerified(socket, verified, number) {
    if (verified == true) {
      socket.emit('reset');
      socket.emit('update', {message: "You have already verified " + number + "!"});
      return true;
    }
    return false;
  }

  io.sockets.on('connection', function(socket) {
    console.log('socket.io connected');
    socket.on('register', function(data) {
        console.log("emit register")
      var code = speakeasy.totp({secret: 'Thisis@SecR#t'});
      users.get(data.phone_number, function (geterr, doc, key) {
        if (geterr) {
          createUser(data.phone_number, code, socket);
        }
        else if (checkVerified(socket, doc.verified, data.phone_number) == false) {
          socket.emit('update', {message: "You have already requested a verification code for that number!"});
          socket.emit('code_generated');
        }
      });
  
    });
  
    socket.on('verify', function(data) {
      var code = Math.floor((Math.random()*999999)+111111);
      users.get(data.phone_number, function (geterr, doc, key) {
        if (geterr) {
          socket.emit('reset');
          socket.emit('update', {message: "You have not requested a verification code for " + data.phone_number + " yet!"});
        }
        else if (checkVerified(socket, doc.verified, data.phone_number) == false && doc.code == parseInt(data.code)) {
          socket.emit('verified');
          socket.emit('update', {message: "You have successfully verified " + data.phone_number + "!"});
          users.save(data.phone_number, {code: parseInt(data.code), verified: true}, function (saverr) { if (saverr) { throw saverr; }});
        }
        else {
          socket.emit('update', {message: "Invalid verification code!"});
        }
      });
  
    });
  });