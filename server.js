var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var url = require('url');
var path=require('path');
var http = require('http');
var formidable = require('formidable');
var fs = require('fs');
const multer = require('multer');


const PORT = 8000;
const __dir = "/Users/mvalaee/ICS workspaces/businessPlan";
const upload = multer({dest: __dir + '/images'});
app.use(express.static(__dir + '/images'));
app.use(cookieParser());
 

const MongoClient = require('mongodb').MongoClient;
const ACCOUNT_DB_URL = "mongodb://localhost:27017";
const ACCOUNT_DB_NAME = 'ACCOUNTDB';
const ACCOUNT_COLLECTION = 'usernames';

const POST_DB_URL = "mongodb://localhost:27018";
const POST_DB_NAME = 'POSTDB';
const POST_COLLECTION = 'titles';

const COOKIE_EXPIRY_TIME = 60 * 60 *1000;

let cookieTable = [];


var server = app.listen(PORT, () => {
	console.log(':::::::::::::::::::::::::::::::::::::::');
	console.log(':::::::::::::::::::::::::::::::::::::::');
	console.log(`Server is listening on port ${ PORT }`);
});


app.get('/', function(req,res){
	var message = "Welcome to the app";
	createPage('loginpage_template.html', 'loginpage.html', message, () => {
		res.sendFile(__dir+'/loginpage.html');
	});
});


app.route('/login_page.html').get(function(req,res){
    var q = url.parse(req.url, true); 	
	var cookie = req.cookies.sessionID; 
	var userName = q.query.username;	

	checkPassword(q, function(result) {
		if (result) { // user found
			addToCookieTable (result, cookie);
			var message = ' ' + result.firstname + ' ' + result.lastname;
		   createPage('homePage_template.html', 'homePage.html', message, () => {
			   fs.readFile('homePage.html', function(err, data) {
					if (err) throw err;
					sendPacketWithCookie (res, cookie, data);
				});
		   });
		   
		} else { // user not found
			var message = "No such user! You may register a new account.";
			createPage('loginPage_template.html', 'loginPage.html', message, () => {
				res.sendFile(__dir+'/loginPage.html');
			});
		}
	});	
});	


app.route('/register.html').get((req,res) => {
	res.sendFile(__dir+'/registeringPage.html');
});


app.route('/registering_page.html').get(function(req,res){

    var q = url.parse(req.url, true);
    var firstName = q.query.firstname;
    var lastName  = q.query.lastname;
    var userName  = q.query.username;
	var passWord  = q.query.password;

	var blockSchedule = [['','','','',''], ['','','','',''], ['','','','',''], ['','','','','']];


	var myQuery = {username: userName};

	fetchUserFromDB ( myQuery, ACCOUNT_DB_URL, ACCOUNT_DB_NAME, ACCOUNT_COLLECTION, (result) => {
	 	if (result) { // user name already exists
			res.writeHead(200, {'Content-Type': 'text/html'});
			// var message = "That username is already in use. Please choose another one";
			// createPage('loginpage_template.html', 'loginpage.html', message, () => {
			// 	res.sendFile(__dir+'/loginpage.html');
			// });
  			// res.write('The username "'+ result.username + '" already exists in the database. <br>');
  			// res.write('Please use another "username"')
  			res.end();
	 	} else {
			var myObj = { 
						firstname: firstName, 
						lastname: lastName, 
						username: userName, 
						password: passWord
					};

			write2DB (myObj, ACCOUNT_DB_URL, ACCOUNT_DB_NAME, ACCOUNT_COLLECTION);

			var message = "You have successfully registered to deskPlan";
			createPage('loginPage_template.html', 'loginPage.html', message, () => {
				res.sendFile(__dir+'/loginPage.html');
			});
	 	}
	})
});



app.route('/home_page.html').get((req, res) => {
    var q = url.parse(req.url, true); 	
	var cookie = req.cookies.sessionID; 
	var userName = q.query.username;	

	findCookie(cookie, res, (row) => {
		if (row) { // cookie valid
			extendExpiry(cookie);
			var message = ' ' + row[3] + ' ' + row[4] ;
		  	createPage('homePage_template.html', 'homePage.html', message, () => {
		  		res.sendFile(__dir + '/homePage.html');
		   });
		} else { // cookie invalid
			sendReloginPage(res);
		}
	})
});

app.route('/create_post.html').get((req,res) => {
	res.sendFile(__dir+'/createPost.html');
});

app.route('/creatingPost_page.html').get(function(req,res){
    var q = url.parse(req.url, true);
    var cookie = req.cookies.sessionID;

    var title = q.query.title;
    var location  = q.query.location;
    var supervisor  = q.query.supervisor;
    var description  = q.query.description;

    var myObj = { 
        title: title,
        location: location,
        supervisor: supervisor,
        description: description
    };

    write2DB (myObj, POST_DB_URL, POST_DB_NAME, POST_COLLECTION);

    var message = "You have successfully registered to deskPlan";

    findCookie(cookie, res, (row) => {
		if (row) {
            extendExpiry(cookie);
            res.send("Post has been created...");
			// createProfilePage('profile_template.html', 'profile_page.html', row, () =>{
			// 	res.sendFile(__dir + '/profile_page.html');
			// })
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});

    
    // res.send("Post has been created...")
    // createPage('loginPage_template.html', 'loginPage.html', message, () => {
    //     res.sendFile(__dir+'/loginPage.html');
    // });
});

app.route('/posts_page.html').get((req,res) => {
    var cookie = req.cookies.sessionID;

    findCookie(cookie, res, (row) => {
		if (row) {
            extendExpiry(cookie);
            res.sendFile(__dir+'/postPage.html');
			// createProfilePage('profile_template.html', 'profile_page.html', row, () =>{
			// 	res.sendFile(__dir + '/profile_page.html');
			// })
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});
});

////////////////////////////////////////
// functions related to DB management //
////////////////////////////////////////

function checkPassword(q, callback) {

	var userName = q.query.username;
	var passWord = q.query.password;
	var myQuery = { username: userName, password: passWord}; //, password: passWord };
	var myObject;
	fetchUserFromDB(myQuery, ACCOUNT_DB_URL, ACCOUNT_DB_NAME, ACCOUNT_COLLECTION, (result) => {
		console.log(result);
		if(result) {
			console.log("user found.");
		  	callback(result);
		} else {
			console.log("user not found.");
			callback(null);
		}
	})
	
}


function write2DB (myobj, url, db, collection){
	MongoClient.connect(url, 
		{ useUnifiedTopology: true }, 
		(err, client) => {
		 if (err) return console.log(err);

		 // Storing a reference to the database so you can use it later
		 var dbc = client.db(db).collection(collection);		  
		 dbc.insertOne(myobj, function(err, res) {
		  if (err) throw err;
		  console.log("Inserted document =", myobj);
		 })

		 dbc.find({}).toArray(function(err, result) {
			 if (err) throw err;
			 console.log(result);
			});

	})
}


function updateDB (myQuery, myobj, callback, url, db, collection) {
	MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
	 if (err) return console.log(err);

	 var dbc = client.db(db).collection(collection);		  
	 dbc.updateOne(myQuery, myobj, function(err, res) {
	  if (err) throw err;
	  console.log("Updated document =", myobj);
	 })
	 callback();
  	});
}


function showFullDB (url, db, collection){
	MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var dbc = client.db(db).collection(collection);		  
		dbc.find({}).toArray(function(err, result) {
			if (err) throw err;
			console.log(result);
		});
	});
}


function fetchUserFromDB (myQuery, url, db, collection, callback,) {
	MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var dbc = client.db(db).collection(collection);	
		dbc.findOne(myQuery).then(result => {
			if (result) {
				callback(result);	
			} else {
				callback(null);
			}
		})
	})	
}


///////////////////////////////////////////
// functions used for sending html files //
///////////////////////////////////////////

function sendPacketWithCookie(res, cookie, data){
		
	res.setHeader('Set-Cookie', sessionID = cookie, 'language=javascript');
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(data);
	res.end();
}


function createPage(inputFile, outputFile, message, callback){
	var data = fs.readFile(inputFile, function(err, data) {
		if (err) throw err;
    	var str = data.toString();
    	var res = str.replace('${message}', message);
    	fs.writeFile(outputFile, res,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function createProfilePage(inputFile, outputFile, myObj, callback){
	var data = fs.readFile(inputFile, function(err, data) {
    	
    	var str = data.toString();
    	var imagePath = __dir + "/images/" + myObj[5];
    	var imageFileName;

    	if (fs.existsSync(imagePath)) {
    		console.log("file exists")
    		imageFileName = myObj[5];
    	} else {
    		console.log("file does not exsit")
    		imageFileName = "avatar.jpg";
    	}
    	
	   var str0 =  str.replace('${imagename}', imageFileName);  		
	   var str1 = str0.replace('${firstname}', myObj[3]);
	   var str2 = str1.replace('${lastname}' , myObj[4]);
	   var str3 = str2.replace('${username}' , myObj[5]);
	   var str4 = str3.replace('${password}' , myObj[6]);
    	
    	fs.writeFile(outputFile, str4,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function sendReloginPage (res) {
	var message = "Your session has expired";
	createPage('loginpage_template.html', 'loginpage.html', message, () => {
		res.sendFile(__dir+'/loginpage.html');
	});
}


///////////////////////////////////
// Cookie manipulation functions //
///////////////////////////////////

function addToCookieTable (myobj, cookieValue){
	expireCookies();
	var d = new Date();
	var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
	var expireGMT  = d.toGMTString();

	cookieLine = [  cookieValue, 
					expiryTime, 
					expireGMT, 
					myobj.firstname, 
					myobj.lastname, 
					myobj.username, 
					myobj.password ];
	
	cookieTable.push(cookieLine);

}


function findCookie(cookie, res, callback) {
	expireCookies();
	if (cookieTable == 0) {
		sendReloginPage(res);
	} else {
		for (var i = 0; i < cookieTable.length; i++){
			if(cookie == parseInt(cookieTable[i][0])){
				callback(cookieTable[i]);
				return;
			}
		}

		callback(null);
	}
}


function cookieToDB(cookie, callback) {
	expireCookies();
	cookieTable.forEach(row => {
		if (cookie.toString() === row[0]) { // cookie found
			var userName = row[5];
			var myQuery = {username: userName};
			fetchUserFromDB(myQuery, ACCOUNT_DB_URL, ACCOUNT_DB_NAME, ACCOUNT_COLLECTION, (result) => {
				if(result) {
					callback(result);
				} else {
					console.log("User not found in database.");
				}
			})
		} else {
			callback(null);
		}
	});
}


function updateCookie(row, callback) {
	var d = new Date();
	var nowTime = d.getTime(); 
	for (var i=0; i < cookieTable.length; i++) {
		if ( row[0] == cookieTable[i][0]) {
			cookieTable[i][0] = row[0];
			cookieTable[i][1] = row[1];
			cookieTable[i][2] = row[2];
			cookieTable[i][3] = row[3];
			cookieTable[i][4] = row[4];
			cookieTable[i][5] = row[5];
			cookieTable[i][6] = row[6];
			var newRow = cookieTable[i];
		}
	}
	callback(newRow);
}


function expireCookies(){
	var d = new Date();
	var nowTime = d.getTime(); 
	var k =0;
	for (var i=0; i < cookieTable.length; i++) {
		if ( nowTime > cookieTable[i][1]) {
			k++;
		}
	}
	cookieTable.splice(0,k);
}


function extendExpiry(cookie) {
	var d = new Date();
	var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
	var expireGMT  = d.toGMTString();

	cookieTable.forEach(row => {
		if (cookie.toString() === row[0]) { // cookie found
			row[1] = expiryTime;
			row[2] = expireGMT;
		} else {
			console.log('Cookie Not Found');
		}
	});

}