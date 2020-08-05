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
const DB_URL = "mongodb://localhost:27017";
const DB_NAME = 'ACCOUNTDB';
const ACCOUNT_COLLECTION = 'usernames';
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
    var eMail = q.query.email;
    var school = q.query.school;
    var aCCountType = q.query.accountType;
    
	var myQuery = {username: userName};

	fetchUserFromDB ( myQuery, ACCOUNT_COLLECTION, (result) => {
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
                        password: passWord,
                        email: eMail,
                        school: school,
                        accountType: aCCountType
					};

			write2DB (myObj, ACCOUNT_COLLECTION);

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
    console.log(cookieTable);
});

app.route('/create_post.html').get((req,res) => {
	res.sendFile(__dir+'/createPost.html');
});

app.route('/creatingPost_page.html').get(function(req,res){
    var q = url.parse(req.url, true);
    var cookie = req.cookies.sessionID;

    var title = q.query.title;
    var location  = q.query.location;
    var age = q.query.age;
    var contactInfo = q.query.contactInfo;
    var webLink = q.query.webLink;
    var supervisor  = q.query.supervisor;
    var description  = q.query.description;
    // var keyWords = q.query.keyWords;

    var myObj = { 
        title: title,
        // user: cookie,
        location: location,
        supervisor: supervisor,
        description: description,
        date: getDate()
    };

    write2DB (myObj, POST_COLLECTION);



    //  showFullDB(POST_DB_URL, POST_DB_NAME, POST_COLLECTION);

    // var message = "You have successfully registered to deskPlan";

    findCookie(cookie, res, (row) => {
		if (row) {
            extendExpiry(cookie);
            displayPosts(POST_COLLECTION, res);
            // res.send("Post has been created...");
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
            // var x = displayPosts(POST_COLLECTION);
           displayPosts(POST_COLLECTION, res);

            // res.send("Posts");
            // res.sendFile(__dir+'/postPage.html');
			// createPage('postPage_template.html', 'postPage.html', displayPosts(POST_COLLECTION), () =>{
			// 	res.sendFile(__dir + '/postPage.html');
			// })
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });

    
//    console.log(displayPosts(POST_COLLECTION));

    // displayPosts(POST_COLLECTION);
});

app.route('/profile_page.html').get(function(req, res){
	var cookie = req.cookies.sessionID;

	findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			createProfilePage('profilePage_template.html', 'profilePage.html', row, () =>{
				res.sendFile(__dir + '/profilePage.html');
			})
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});
});

app.route('/profile_update.html').get(function(req, res){

	var q = url.parse(req.url, true);
    var newFirstName = q.query.firstname;
    var newLastName  = q.query.lastname;
    var newUserName  = q.query.username;
    var newPassWord  = q.query.password;
    var newEmail = q.query.email;
    var newSchool = q.query.school;
    var newAccountType = q.query.accountType;
	var myNewObj = { $set: {    firstname: newFirstName,
								lastname: newLastName,
								username: newUserName,
                                password: newPassWord,
                                email: newEmail,
                                school: newSchool,
                                accountType: newAccountType }
							};

	var cookie = req.cookies.sessionID; 

	findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					var oldUserName  = result.username;
					var myQuery = {username: oldUserName};
					updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			})

			var d = new Date();
			var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
			var expireGMT  = d.toGMTString();
			var row = [	cookie,
						expiryTime,
						expireGMT,
						newFirstName,
						newLastName,
						newUserName,
                        newPassWord,
                        newEmail,
                        newSchool,
                        newAccountType ];

			updateCookie(row, (newRow) => {
				createProfilePage('profilePage_template.html', 'profilePage.html', row, () =>{
					res.sendFile(__dir + '/profilePage.html');		
				});
			});	

		} else {
			sendReloginPage(res);
		}
	});

	// console.log(" req.url =")
	// console.log(q.query.filetoupload)

	// var fileToUpload = q.query.filetoupload;
	// console.log("filetoupload = ")
	// console.log(fileToUpload)
});


app.route('/upload').post(function(req, res){

	var q = url.parse(req.url, true);
	var userName = q.query.username;

	var cookie = req.cookies.sessionID;

	findCookie(cookie, res, (row) => {
		var userName = row[5];

		var form = new formidable.IncomingForm();
	   form.parse(req, function (err, fields, files) {
	     var oldpath = files.photo.path;
	     var newpath = __dir + "/images/" + userName;

	     fs.rename(oldpath, newpath, function (err) {
	       if (err) throw err;
	       extendExpiry(cookie);
			createProfilePage('profilePage_template.html', 'profilePage.html', row, () =>{
				res.sendFile(__dir + '/profilePage.html');
			})
	     });

	 	});
	});
	
});

app.route('/logOut_page.html').get(function(req, res){
	var message = "You have succesfully logged out";
	createPage('loginPage_template.html', 'loginPage.html', message, () => {
		res.sendFile(__dir+'/loginPage.html');
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
	fetchUserFromDB(myQuery, ACCOUNT_COLLECTION, (result) => {
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


function write2DB (myobj, collection){
	MongoClient.connect(DB_URL, 
		{ useUnifiedTopology: true }, 
		(err, client) => {
		 if (err) return console.log(err);

		 // Storing a reference to the database so you can use it later
		 var dbc = client.db(DB_NAME).collection(collection);		  
		 dbc.insertOne(myobj, function(err, res) {
		  if (err) throw err;
		  console.log("Inserted document =", myobj);
		 })

		//  dbc.find({}).toArray(function(err, result) {
		// 	 if (err) throw err;
		// 	 console.log(result);
		// 	});

	})
}

function updateDB (myQuery, myobj, collection, callback) {
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
	 if (err) return console.log(err);

	 var dbc = client.db(DB_NAME).collection(collection);		  
	 dbc.updateOne(myQuery, myobj, function(err, res) {
	  if (err) throw err;
	  console.log("Updated document =", myobj);
	 })
	 callback();
  	});
}

function showFullDB (collection){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var dbc = client.db(DB_NAME).collection(collection);		  
		dbc.find({}).toArray(function(err, result) {
			if (err) throw err;
			console.log(result);
		});
	});
}


function fetchUserFromDB (myQuery, collection, callback) {
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var dbc = client.db(DB_NAME).collection(collection);	
		dbc.findOne(myQuery).then(result => {
			if (result) {
				callback(result);	
			} else {
				callback(null);
			}
		})
	})	
}

function displayPosts (collection, res) {
    MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
         if (err) return console.log(err);
         var str = "";

		 // Storing a reference to the database so you can use it later
         
         var dbc = client.db(DB_NAME).collection(collection);		  
		 dbc.find({}).toArray(function(err, result) {
             if (err) throw err;
             str += "<table>";
             
             for (var i = 0; i < result.length; i++) {
                 str += "<tr>";
                 for(var j = 0; j < 5; j++) {
                    str += "<td>";
                     if(j === 0){
                        str += ("Title: " + result[i].title);
                    } else if(j === 1){
                        str += ("Location: " + result[i].location);
                    } else if(j === 2){
                        str += ("Supervisor: " + result[i].supervisor);
                    } else if(j === 3){
                        str += ("Description: " + result[i].description);
                    } else {
                        str += ("Date: " + result[i].date);
                    }
                    str += "</td>";
                }
                str += "</tr>";
            }
            str += "</table>";
            createPage('postPage_template.html', 'postPage.html', str, () =>{
                	res.sendFile(__dir + '/postPage.html');
                });
            });
	})
}

function getDate() {
    var now = new Date();
    var year = now.getFullYear() + " ";
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var numMonth = now.getMonth();
    var month = months[numMonth] + " ";
    var date = now.getDate() + " ";
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var numDay = now.getDay();
    var day = days[numDay] + " ";
    var hour = now.getHours() + ":";
    var min = now.getMinutes() + " ";
    if(min < 10){
        min = "0" + min;
    }
    var d = "" + day + month + date + year + hour + min;
    return d;
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
        
        console.log(myObj);

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
       var str5 = str4.replace('${email}', myObj[7]);
       var str6 = str5.replace('${school}', myObj[8]);
    //    var str6 = str5.replace('${accountType}', myObj[8]);
       var str7 = str6.replace('${accountType}', myObj[9]);
    	
    	fs.writeFile(outputFile, str7,  function (err) {
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
                    myobj.password,
                    myobj.email,
                    myobj.school,
                    myobj.accountType ];
	
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
			fetchUserFromDB(myQuery, ACCOUNT_COLLECTION, (result) => {
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
            cookieTable[i][7] = row[7];
            cookieTable[i][8] = row[8];
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