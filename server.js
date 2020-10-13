var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var url = require('url');
var path=require('path');
var http = require('http');
var formidable = require('formidable');
var fs = require('fs');
const multer = require('multer');
var nodemailer = require('nodemailer');
const { brotliDecompress } = require('zlib');
const { ADDRGETNETWORKPARAMS } = require('dns');

const PORT = 8000;
const __dir = "/Users/mvalaee/ICS workspaces/newBusinessPlanPWA - Copy";
const upload = multer({dest: __dir + '/images'});
app.use(express.static(__dir + '/images'));
app.use(cookieParser());
 

const MongoClient = require('mongodb').MongoClient;
const DB_URL = "mongodb://localhost:27017";
const DB_NAME = 'NEWACCOUNTDB';
const ACCOUNT_COLLECTION = 'usernames';
const POST_COLLECTION = 'titles';
const QUESTION_COLLECTION = 'questions';
const TIPS_COLLECTION = 'tips';

const COOKIE_EXPIRY_TIME = 60 * 60 *1000;

let cookieTable = [];

var server = app.listen(PORT, () => {
	console.log(':::::::::::::::::::::::::::::::::::::::');
	console.log(':::::::::::::::::::::::::::::::::::::::');
	console.log(`Server is listening on port ${ PORT }`);
});


app.get('/', function(req,res){
	res.sendFile(__dir + '/index.html');
});

app.route('/login.html').get(function(req, res){
	var message = "Welcome to Osstia";
	createPage('loginPage_template.html', 'loginPage.html', message, () => {
		res.sendFile(__dir+'/loginPage.html');
	});
});

app.route('/login_page.html').get(function(req,res){
    var q = url.parse(req.url, true); 	
	var cookie = req.cookies.sessionID; 
	var userName = q.query.username;
	
	console.log(cookie);
	console.log(cookieTable);

	checkPassword(q, function(result) {
		if (result) { // user found
			addToCookieTable (result, cookie);
			console.log(cookieTable);
			var message = ' ' + result.firstname + ' ' + result.lastname;
		   createPage('homePage_template.html', 'homePage.html', message, () => {
			   fs.readFile('homePage.html', function(err, data) {
					if (err) throw err;
					var d = new Date();
					var nowTime = d.getTime();
					var cookie = nowTime;
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

app.route('/register.html').get(function(req, res){
	createPage('registerPage_template.html', 'registerPage.html', "", () => {
		res.sendFile(__dir+'/registerPage.html');
	});
});

app.route('/forgot_password.html').get(function(req, res){
	createPage('forgotPassword_template.html', 'forgotPassword.html', "", () =>{
		res.sendFile(__dir + '/forgotPassword.html')
	});
});

app.route('/email_check.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		
		var q = url.parse(req.url, true);
		var email = q.query.email;
		let maxm = 9999999;
		let minm = 1000000;
		var key = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
		
		var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
		dbc.findOne({email: email}, function(error, result) {
			if(error) return console.log(error);

			if(result){
				var transporter = nodemailer.createTransport({
					service: 'gmail',
					auth: {
					user: 'support@osstia.com',
					pass: 'support@osstia1'
					}
				});

				var mailOptions = {
					from: 'support@osstia.com',
					to: email,
					subject: 'OSSTIA Password Reset Key',
					text: 'This is your verification key: ' + key
				};

				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
					console.log(error);
					} else {
					console.log('Email sent: ' + info.response);
					let str = "<p id='line' class='centre'>Check your inbox for a verification code</p><form action='/resetting.html'><input type='hidden' name='key' value='" + key + "'><input type='hidden' name='email' value='" + email + "'><p class='centre'>Please enter the verification code:</p><br><input class='textInput' type='text' name='myKey' placeholder='Key' required><br><p class='centre' >Please enter a new password:</p><br><input type='text' placeholder='New Password' class='textInput' id='password' name='password' required><br><br><input id='setPass' type='submit' value='Set Password'></form>";
					createPage('forgotPassword_template.html', 'forgotPassword.html', str, () =>{
						res.sendFile(__dir + '/forgotPassword.html')
					});
					}
				});
			} else {
				createPage('forgotPassword_template.html', 'forgotPassword.html', "<p id='bold' class='centre'>The email you entered has no account linked to it</p>", () =>{
					res.sendFile(__dir + '/forgotPassword.html')
				});
			}
		});

	});
});

app.route('/resetting.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		var q = url.parse(req.url, true);
		var key = q.query.key;
		var email = q.query.email;
		var myKey = q.query.myKey;
		var newPass = q.query.password;
		if(key == myKey){
			var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
			dbc.findOne({email: email}, function(error, result) {
				if(error) return console.log(error);
				if(result){
					var myQuery = {email: email};
					var myNewObj = { $set: { password: newPass }};
					updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {
						var message = "Welcome to Osstia";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					});
				} else {
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			let str = "<p id='line' class='centre'>Check your inbox for a verification code</p><form action='/resetting.html'><input type='hidden' name='key' value='" + key + "'><input type='hidden' name='email' value='" + email + "'><p class='centre'>Please enter the verification code:</p><br><input class='textInput' type='text' name='myKey' placeholder='Key' required><br><p class='centre' >Please enter a new password:</p><br><input type='text' placeholder='New Password' class='textInput' id='password' name='password' required><br><br><input id='setPass' type='submit' value='Set Password'></form><p id='bold' class='centre'>The verification key is incorrect</p>";
			createPage('forgotPassword_template.html', 'forgotPassword.html', str, () =>{
				res.sendFile(__dir + '/forgotPassword.html')
			});
		}
	});
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
	var iMgName = q.query.username;
	var discipline = q.query.discipline;
	var followingList = [];
	var savedPosts = [];
    
	var myQuery = {username: userName};
	var secondCheck = {email: eMail};
	var myObj;

	fetchUserFromDB ( myQuery, ACCOUNT_COLLECTION, (result) => {
	 	if (result) { // user name already exists
			//res.writeHead(200, {'Content-Type': 'text/html'});
			var message = "That username is already in use. Please choose another one";
			console.log(message);
			createPage('registerPage_template.html', 'registerPage.html', message, () => {
				res.sendFile(__dir+'/registerPage.html');
				console.log(message);
			});
  			// res.write('The username "'+ result.username + '" already exists in the database. <br>');
  			// res.write('Please use another "username"')
  			//res.end();
	 	} else {
			fetchUserFromDB ( secondCheck, ACCOUNT_COLLECTION, (second) => {
				if (second) { // user name already exists
				  // res.writeHead(200, {'Content-Type': 'text/html'});
				   var message = "That email address is already in use. Please choose another one";
				   console.log(message);
				   createPage('registerPage_template.html', 'registerPage.html', message, () => {
						res.sendFile(__dir+'/registerPage.html');
					});
					 // res.write('The username "'+ result.username + '" already exists in the database. <br>');
					 // res.write('Please use another "username"')
					 //res.end();
				} else {
						myObj = { 
							firstname: firstName, 
							lastname: lastName, 
							username: userName, 
							password: passWord,
							email: eMail,
							school: school,
							accountType: aCCountType,
							imgName: iMgName,
							discipline: discipline,
							followingList: followingList,
							savedPosts: savedPosts
						};

					write2DB (myObj, ACCOUNT_COLLECTION);

					var message = (" " + myObj.firstname + " " + myObj.lastname);
					console.log(message);
					createPage('homePage_template.html', 'homePage.html', message, () => {
						fs.readFile('homePage.html', function(err, data) {
							if (err) throw err;
							var d = new Date();
							var nowTime = d.getTime();
							var cookie = nowTime;
							sendPacketWithCookie (res, cookie, data);
						});
					});
				}
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

app.route('/myFeed_page.html').get((req,res) => {
    var cookie = req.cookies.sessionID;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					// var currUser = result.accountType;
					myFeed(result, res);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/create_post.html').get((req,res) => {
	res.sendFile(__dir+'/createPost.html');
});

app.route('/creatingPost_page.html').get(function(req,res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		var q = url.parse(req.url, true);
		var cookie = req.cookies.sessionID;
		
		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						// var name = result.firstname + " " + result.lastname;
						// var username = result.username;
						var title = q.query.title;
						var address = q.query.address;
						var city = q.query.city;
						var country = q.query.country;
						var postalCode = q.query.postalCode;
						var age = q.query.age;
						var contactInfo = q.query.contactInfo;
						var oppType = q.query.oppType;
						var supervisor  = q.query.supervisor;
						var description  = q.query.description;
						// var keyWordsQuery = q.query.keyWords;
						var discipline = q.query.discipline;
						var virt = q.query.virt;
						// var keyWordsArr = keyWordsQuery.split(", ");
						var tempDate = new Date();
						var postId = "PO" + tempDate.getTime();

						var myObj = { 
							postID: postId,
							// name: name,
							// username: username,
							// imgName: result.imgName,
							userID: result.imgName,
							title: title,
							address: address,
							city: city,
							country: country,
							postalCode: postalCode,
							age: age,
							supervisor: supervisor,
							contactInfo: contactInfo,
							oppType: oppType,
							description: description,
							discipline: discipline,
							virt: virt,
							date: getDate(),
							// keyWords: keyWordsArr
						}

						add2DB(myObj, POST_COLLECTION, () => {
							res.redirect("http://localhost:8000/posts_page.html");
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				})
			} else {
				console.log("Inprofile page: cookie was expired")
				sendReloginPage(res);
			}
		});
	});
});

app.route('/posts_page.html').get((req,res) => {
    var cookie = req.cookies.sessionID;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					displayPosts(result, res);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/savePost.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var q = url.parse(req.url, true);
		var postID = q.query.post;
		var page = q.query.page;
		var cookie = req.cookies.sessionID;
		if(page === "opp"){
			var currProfile = q.query.profile;
		}
		var arr = [];

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);		  
		dbc.findOne({postID: postID}, function(err, result) {
			if (err) return console.log(err);
			console.log(result.title);
			console.log(result.oppType);

			findCookie(cookie, res, (row) => {
				if (row){
					extendExpiry(cookie);
					cookieToDB(cookie, (currUser) => {
						if(currUser) {
							for(let i = 0; i < currUser.savedPosts.length; i++){
								arr.push(currUser.savedPosts[i]);
							}
							arr.push(result.postID);

							var myNewObj = { $set: {savedPosts: arr}};
							var myQuery = {username: currUser.username};

							updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});

							console.log("Log This: " + currUser.savedPosts);

							if(page === "display"){
								displayPosts(currUser, res);
							} else if (page === "feed"){
								myFeed(currUser, res);
							} else if  (page === "opp"){
								myPosts(currUser, currProfile, res);
							} else if (page === "saved"){
								savedPosts(currUser, res);
							}
						} else {
							var message = "No such user! You may register a new account.";
							createPage('loginPage_template.html', 'loginPage.html', message, () => {
								res.sendFile(__dir+'/loginPage.html');
							});
						}
					});
				}
			});
		});
	});
});

app.route('/deletePost.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var q = url.parse(req.url, true);
		var postID = q.query.post;
		var page = q.query.page;
		var cookie = req.cookies.sessionID;
		if(page === "opp"){
			var currProfile = q.query.profile;
		}

		findCookie(cookie, res, (row) => {
			if (row){
				extendExpiry(cookie);
				cookieToDB(cookie, (currUser) => {
					if(currUser) {
						var dbc = client.db(DB_NAME).collection(POST_COLLECTION);		  
						dbc.deleteOne({postID: postID}, function(err, result) {
							if(err) return console.log(err);
							if(result){
								console.log("Deleted: " + result);
								if(page === "display"){
									displayPosts(currUser, res);
								} else if (page === "feed"){
									myFeed(currUser, res);
								} else if  (page === "opp"){
									myPosts(currUser, currProfile, res);
								} else if (page === "saved"){
									savedPosts(currUser, res);
								}
							}
						});
					}
				});
			}
		});
	});
});

app.route('/removePost.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var q = url.parse(req.url, true);
		var postID = q.query.post;
		var page = q.query.page;
		var cookie = req.cookies.sessionID;
		if(page === "opp"){
			var currProfile = q.query.profile;
		}
		var arr = [];

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);		  
		dbc.findOne({postID: postID}, function(err, result) {
			if (err) return console.log(err);
			console.log(result.title);
			console.log(result.oppType);

			findCookie(cookie, res, (row) => {
				if (row){
					extendExpiry(cookie);
					cookieToDB(cookie, (currUser) => {
						if(currUser) {
							for(let i = 0; i < currUser.savedPosts.length; i++){
								arr.push(currUser.savedPosts[i]);
							}

							for(let i = 0; i < arr.length; i++){
								if(arr[i] === postID){
									arr.splice(i, 1);
								}
							}

							var myNewObj = { $set: {savedPosts: arr}};
							var myQuery = {username: currUser.username};

							console.log("Log This: " + currUser.savedPosts);

							updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {
								if(page === "display"){
									displayPosts(currUser, res);
								} else if (page === "feed"){
									myFeed(currUser, res);
								} else if  (page === "opp"){
									myPosts(currUser, currProfile, res);
								}
							});

							
							
						} else {
							var message = "No such user! You may register a new account.";
							createPage('loginPage_template.html', 'loginPage.html', message, () => {
								res.sendFile(__dir+'/loginPage.html');
							});
						}
					});
				}
			});
		});
	});
});

app.route('/savedPosts_page.html').get(function(req, res){
	var cookie = req.cookies.sessionID;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					// var currUser = result.accountType;
					savedPosts(result, res);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/search.html').get((req,res) => {
	var q = url.parse(req.url, true);
	var cookie = req.cookies.sessionID;
	var virt = q.query.virt;
	var age = q.query.age;
	var position = q.query.position;
	var discipline = q.query.discipline;
	var city = q.query.city;
	var country = q.query.country;
	var page = "display";

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					filter('postPage_template.html', 'postPage.html', page, result, age, position, discipline, virt, city, country, res, (inputFile, outputFile, page, result, sortedArray, res) => {
						searchPost (inputFile, outputFile, page, result, sortedArray, res);
					});
					// console.log("X: " + x);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/feedSearch.html').get((req,res) => {
	var q = url.parse(req.url, true);
	var cookie = req.cookies.sessionID;
	var virt = q.query.virt;
	var age = q.query.age;
	var position = q.query.position;
	var discipline = q.query.discipline;
	var city = q.query.city;
	var country = q.query.country;
	var page = "feed";

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					filter('myFeed_template.html', 'myFeed.html', "feed", result, age, position, discipline, virt, city, country, res, (inputFile, outputFile, page, result, sortedArray, res) => {
						searchPost (inputFile, outputFile, page, result, sortedArray, res);
					});
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/oppSearch.html').get((req,res) => {
	var q = url.parse(req.url, true);
	var cookie = req.cookies.sessionID;
	var virt = q.query.virt;
	var age = q.query.age;
	var position = q.query.position;
	var discipline = q.query.discipline;
	var city = q.query.city;
	var country = q.query.country;
	var page = "opp";
	var profile = q.query.profile;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					filter('myPosts_template.html', 'myPosts.html', page, result, age, position, discipline, virt, city, country, res, (inputFile, outputFile, page, result, sortedArray, res) => {
						MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
							if (err) return console.log(err);
							var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
							dbc.findOne({imgName: profile}, function(err, person) {
								if(err) return console.log(err);
								if(person){
									searchMyPost (inputFile, outputFile, page, result, sortedArray, person, res);
								}
							});
						});
					});
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/userSearch.html').get((req,res) => {
	var q = url.parse(req.url, true);
	var cookie = req.cookies.sessionID;
	var myQuery = q.query.search;

    findCookie(cookie, res, (row) => {
		if (row) {
            extendExpiry(cookie);
           	searchProfile(myQuery, res);
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/profile_page.html').get(function(req, res){
	var cookie = req.cookies.sessionID;

	findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					let newRow = [];
					for(let i = 0; i < row.length; i++){
						newRow[i] = row[i];
					}
					newRow.push(result.email, result.school, result.accountType, result.imgName, "");
					if(result.accountType === "student"){
						createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
							res.sendFile(__dir + '/profilePage.html');		
						});
					} else if(result.accountType === "employer"){
						createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
							res.sendFile(__dir + '/profilePage.html');		
						});
					}
					
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			})
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});
});

app.route('/profile_update.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		var q = url.parse(req.url, true);
		var newFirstName = q.query.firstname;
		var newLastName  = q.query.lastname;
		var newUserName  = q.query.username;
		var newPassWord  = q.query.password;
		var newEmail = q.query.email;
		var newSchool = q.query.school;
		var newAccountType = q.query.accountType;
		var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
		
		var cookie = req.cookies.sessionID;

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var oldUserName  = result.username;
						if (oldUserName !== newUserName){
							console.log("first");
							dbc.findOne({username: newUserName}, function(err, array) {
								if(err) return console.log(error);
								// console.log("Array: " + array.username);
								if(array){
									let string = '';
									string += "The username " +  newUserName + " is taken\n";
									let newRow = [];
									var d = new Date();
									var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
									var expireGMT  = d.toGMTString();
									newRow.push(cookie,expiryTime,expireGMT,result.firstname,result.lastname,result.username,result.password,result.email, result.school, result.accountType, result.imgName, string)
									console.log("newRow: " + newRow);
									// newRow.push(result.email, result.school, result.accountType, result.imgName, string);
									// var oldUserName  = result.username;
									// var myQuery = {username: oldUserName};
									if(result.accountType === "student"){
										createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
											res.sendFile(__dir + '/profilePage.html');		
										});
									} else if (result.accountType === "employer"){
										createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
											res.sendFile(__dir + '/profilePage.html');		
										});
									}
								} else {
									if (result.email !== newEmail){
										dbc.findOne({email: newEmail}, function(err, array) {
											if(err) return console.log(error);
											// console.log("Array: " + array);
											if(array){
												let str = '';
												str += " The email " + newEmail + " is taken";
												let newerRow = [];
												var d = new Date();
												var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
												var expireGMT  = d.toGMTString();
												newerRow.push(cookie,expiryTime,expireGMT,result.firstname,result.lastname,result.username,result.password,result.email, result.school, result.accountType, result.imgName, str);
												console.log("newerRow: " + newerRow);
												console.log(" The email " + newEmail + " is taken");
												// newRow.push(result.email, result.school, result.accountType, result.imgName, string);
												// var oldUserName  = result.username;
												// var myQuery = {username: oldUserName};
												if(result.accountType === "student"){
													createProfilePage('studentProfilePage_template.html', 'profilePage.html', newerRow, () =>{
														res.sendFile(__dir + '/profilePage.html');		
													});
												} else if (result.accountType === "employer"){
													createProfilePage('employerProfilePage_template.html', 'profilePage.html', newerRow, () =>{
														res.sendFile(__dir + '/profilePage.html');		
													});
												}
											} else {
												var myQuery = {username: oldUserName};
												var myNewObj = { $set: {    firstname: newFirstName,
																			lastname: newLastName,
																			username: newUserName,
																			password: newPassWord,
																			email: newEmail,
																			school: newSchool,
																			accountType: newAccountType }
																		};
												updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});
			
												var d = new Date();
												var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
												var expireGMT  = d.toGMTString();
												var row = [	cookie,
															expiryTime,
															expireGMT,
															newFirstName,
															newLastName,
															newUserName,
															newPassWord ];
			
												updateCookie(row, (newRow) => {
													cookieToDB(cookie, (result) => {
														if (result) { //user found
															let string = " ";
															newRow.push(result.email, result.school, result.accountType, result.imgName, string);
																// var oldUserName  = result.username;
																// var myQuery = {username: oldUserName};
															if(result.accountType === "student"){
																createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
																	res.sendFile(__dir + '/profilePage.html');		
																});
															} else if (result.accountType === "employer"){
																createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
																	res.sendFile(__dir + '/profilePage.html');		
																});
															}
														} else { // user not found
															var message = "No such user! You may register a new account.";
															createPage('loginPage_template.html', 'loginPage.html', message, () => {
																res.sendFile(__dir+'/loginPage.html');
															});
														}
													});
												});
											}
										});
									} else {
										var myQuery = {username: oldUserName};
										var myNewObj = { $set: {    firstname: newFirstName,
																	lastname: newLastName,
																	username: newUserName,
																	password: newPassWord,
																	email: newEmail,
																	school: newSchool,
																	accountType: newAccountType }
																};
										updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});

										var d = new Date();
										var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
										var expireGMT  = d.toGMTString();
										var row = [	cookie,
													expiryTime,
													expireGMT,
													newFirstName,
													newLastName,
													newUserName,
													newPassWord ];

										updateCookie(row, (newRow) => {
											cookieToDB(cookie, (result) => {
												if (result) { //user found
													let string = " ";
													newRow.push(result.email, result.school, result.accountType, result.imgName, string);
														// var oldUserName  = result.username;
														// var myQuery = {username: oldUserName};
													if(result.accountType === "student"){
														createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
															res.sendFile(__dir + '/profilePage.html');		
														});
													} else if (result.accountType === "employer"){
														createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
															res.sendFile(__dir + '/profilePage.html');		
														});
													}
												} else { // user not found
													var message = "No such user! You may register a new account.";
													createPage('loginPage_template.html', 'loginPage.html', message, () => {
														res.sendFile(__dir+'/loginPage.html');
													});
												}
											});
										});
									}
								}
							});
						} else if (result.email !== newEmail){
							console.log("second");
							dbc.findOne({email: newEmail}, function(err, person) {
								if(err) return console.log(error);
								// console.log("Array: " + array);
								if(person){
									console.log("person")
									console.log("Array: " + person.email);
									console.log("Array: " + person.username);
									let thisString = '';
									thisString += " The email " + newEmail + " is taken";
									let thisRow = [];
									var d = new Date();
									var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
									var expireGMT  = d.toGMTString();
									thisRow.push(cookie,expiryTime,expireGMT,result.firstname,result.lastname,result.username,result.password,result.email, result.school, result.accountType, result.imgName, thisString)
									// console.log("newRow: " + newRow);
									// newRow.push(result.email, result.school, result.accountType, result.imgName, string);
									// var oldUserName  = result.username;
									// var myQuery = {username: oldUserName};
									if(result.accountType === "student"){
										createProfilePage('studentProfilePage_template.html', 'profilePage.html', thisRow, () =>{
											res.sendFile(__dir + '/profilePage.html');		
										});
									} else if (result.accountType === "employer"){
										createProfilePage('employerProfilePage_template.html', 'profilePage.html', thisRow, () =>{
											res.sendFile(__dir + '/profilePage.html');		
										});
									}
								} else {
									console.log("no find")
									var myQuery = {username: oldUserName};
									var myNewObj = { $set: {    firstname: newFirstName,
																lastname: newLastName,
																username: newUserName,
																password: newPassWord,
																email: newEmail,
																school: newSchool,
																accountType: newAccountType }
															};
									updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});

									var d = new Date();
									var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
									var expireGMT  = d.toGMTString();
									var row = [	cookie,
												expiryTime,
												expireGMT,
												newFirstName,
												newLastName,
												newUserName,
												newPassWord ];

									updateCookie(row, (newRow) => {
										cookieToDB(cookie, (result) => {
											if (result) { //user found
												let string = " ";
												newRow.push(result.email, result.school, result.accountType, result.imgName, string);
													// var oldUserName  = result.username;
													// var myQuery = {username: oldUserName};
												if(result.accountType === "student"){
													createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
														res.sendFile(__dir + '/profilePage.html');		
													});
												} else if (result.accountType === "employer"){
													createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
														res.sendFile(__dir + '/profilePage.html');		
													});
												}
											} else { // user not found
												var message = "No such user! You may register a new account.";
												createPage('loginPage_template.html', 'loginPage.html', message, () => {
													res.sendFile(__dir+'/loginPage.html');
												});
											}
										});
									});
								}
							});
						} else {
							var myQuery = {username: oldUserName};
							var myNewObj = { $set: {    firstname: newFirstName,
														lastname: newLastName,
														username: newUserName,
														password: newPassWord,
														email: newEmail,
														school: newSchool,
														accountType: newAccountType }
													};
							updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});

							var d = new Date();
							var expiryTime = d.getTime()+ COOKIE_EXPIRY_TIME;
							var expireGMT  = d.toGMTString();
							var row = [	cookie,
										expiryTime,
										expireGMT,
										newFirstName,
										newLastName,
										newUserName,
										newPassWord ];

							updateCookie(row, (newRow) => {
								cookieToDB(cookie, (result) => {
									if (result) { //user found
										let string = " ";
										newRow.push(result.email, result.school, result.accountType, result.imgName, string);
											// var oldUserName  = result.username;
											// var myQuery = {username: oldUserName};
										if(result.accountType === "student"){
											createProfilePage('studentProfilePage_template.html', 'profilePage.html', newRow, () =>{
												res.sendFile(__dir + '/profilePage.html');		
											});
										} else if (result.accountType === "employer"){
											createProfilePage('employerProfilePage_template.html', 'profilePage.html', newRow, () =>{
												res.sendFile(__dir + '/profilePage.html');		
											});
										}
									} else { // user not found
										var message = "No such user! You may register a new account.";
										createPage('loginPage_template.html', 'loginPage.html', message, () => {
											res.sendFile(__dir+'/loginPage.html');
										});
									}
								});
							});
						}
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else {
				sendReloginPage(res);
			}
		});
	});
});

app.route('/upload').post(function(req, res){

	var q = url.parse(req.url, true);
	// var userName = q.query.username;

	var cookie = req.cookies.sessionID;

	findCookie(cookie, res, (row) => {
		extendExpiry(cookie);
		cookieToDB(cookie, (result) => {
			if (result) { //user found
				let newRow = row;
				newRow.push(result.email, result.school, result.accountType, result.imgName, "");

				var imgName = row[10];

				var form = new formidable.IncomingForm();
				form.parse(req, function (err, fields, files) {
					var oldpath = files.photo.path;
					var newpath = __dir + "/images/" + imgName;

					fs.rename(oldpath, newpath, function (err) {
						if (err) throw err;
						createProfilePage('profilePage_template.html', 'profilePage.html', newRow, () =>{
							res.sendFile(__dir + '/profilePage.html');
						});
					}) 
				}) 
			} else { // user not found
				var message = "No such user! You may register a new account.";
				createPage('loginPage_template.html', 'loginPage.html', message, () => {
					res.sendFile(__dir+'/loginPage.html');
				});
			}
		});
	});
});

app.route('/addFollowing.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		// if (err) throw err;
		if (err) return console.log(err);

		var q = url.parse(req.url, true);
		var searchedProfile = q.query.searchedProfile;
		var cookie = req.cookies.sessionID; 
		var arr = [];

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var oldUserName  = result.username;
						for (var i = 0; i < result.followingList.length; i++){
							arr.push(result.followingList[i]);
						}
						arr.push(searchedProfile);

						var myQuery = {username: oldUserName};
						var myNewObj = { $set: { followingList: arr }};

						var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
						dbc.findOne({imgName: searchedProfile}, function(err, profile) {
							if (err) throw err;
							if (profile) {
								let newRow = [];
								newRow.push(profile.firstname, profile.lastname, profile.username, profile.school, profile.accountType, profile.imgName);

								updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});
								console.log("followinglist: " + profile.followingList);
								let following = "<form action='/removeFollowing.html'><input type='hidden' name='searchedProfile' value='" + profile.imgName + "'><input type='submit' value='Unfollow'></form>";
								createSearchedProfilePage('searchedEmployerProfilePage_template.html', 'searchedProfilePage.html', newRow, following, () =>{
									res.sendFile(__dir + '/searchedProfilePage.html');		
								});
							}
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else {
				sendReloginPage(res);
			}
		});
	});
});

app.route('/removeFollowing.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		// if (err) throw err;
		if (err) return console.log(err);

		var q = url.parse(req.url, true);
		var searchedProfile = q.query.searchedProfile;
		var cookie = req.cookies.sessionID; 
		var arr = [];

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var oldUserName  = result.username;
						for (var i = 0; i < result.followingList.length; i++){
							arr.push(result.followingList[i]);
						}

						for(var i = 0; i < arr.length; i++){
							if(arr[i] === searchedProfile){
								arr.splice(i, 1);
							}
						}

						console.log("array: " + arr);

						var myQuery = {username: oldUserName};
						var myNewObj = { $set: { followingList: arr }};

						var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
						dbc.findOne({imgName: searchedProfile}, function(err, profile) {
							if (err) throw err;
							if (profile) {
								let newRow = [];
								newRow.push(profile.firstname, profile.lastname, profile.username, profile.school, profile.accountType, profile.imgName);

								updateDB(myQuery, myNewObj, ACCOUNT_COLLECTION, () => {});
								console.log("followinglist: " + profile.followingList);
								let following = "<form action='/addFollowing.html'><input type='hidden' name='searchedProfile' value='" + profile.imgName + "'><input type='submit' value='Follow'></form>";
								createSearchedProfilePage('searchedEmployerProfilePage_template.html', 'searchedProfilePage.html', newRow, following, () =>{
									res.sendFile(__dir + '/searchedProfilePage.html');		
								});
							}
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else {
				sendReloginPage(res);
			}
		});
	});
});

app.route('/searchedProfile_page.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		var q = url.parse(req.url, true);
		var imgName = q.query.searchedProfile;
		var cookie = req.cookies.sessionID;

		if (err) return console.log(err);
		if (err) throw (err);

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (currUser) => {
					var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
					dbc.findOne({imgName: imgName}, function(err, result) {
						if (err) throw err;
						if (result) { //user found
							let newRow = [];
							newRow.push(result.firstname, result.lastname, result.username, result.school, result.accountType, result.imgName);
							console.log("currUser: " + currUser.followingList);
							console.log("result: " + result.username);
							if(result.accountType === "student"){
								let following = " ";
								createSearchedProfilePage('searchedStudentProfilePage_template.html', 'searchedProfilePage.html', newRow, following, () =>{
									res.sendFile(__dir + '/searchedProfilePage.html');		
								});
							} else {
								if(currUser.followingList.includes(result.imgName)){
									let following = "<form action='/removeFollowing.html'><input type='hidden' name='searchedProfile' value='" + result.imgName + "'><input type='submit' value='Unfollow'></form>";
									console.log(following);
									createSearchedProfilePage('searchedEmployerProfilePage_template.html', 'searchedProfilePage.html', newRow, following, () =>{
										res.sendFile(__dir + '/searchedProfilePage.html');		
									});
								} else {
									let following = "<form action='/addFollowing.html'><input type='hidden' name='searchedProfile' value='" + result.imgName + "'><input type='submit' value='Follow'></form>";
									console.log(following);
									createSearchedProfilePage('searchedEmployerProfilePage_template.html', 'searchedProfilePage.html', newRow, following, () =>{
										res.sendFile(__dir + '/searchedProfilePage.html');		
									});
								}
							}
							
						} else { // user not found
							var message = "No such user! You may register a new account.";
							createPage('loginPage_template.html', 'loginPage.html', message, () => {
								res.sendFile(__dir+'/loginPage.html');
							});
						}
				});
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});
   });
});

app.route('/professional_page.html').get(function(req, res){
	var cookie = req.cookies.sessionID;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					displayProfessionals(res);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/searchProfessional.html').get((req,res) => {
	var q = url.parse(req.url, true);
	var cookie = req.cookies.sessionID;
	var discipline = q.query.discipline;

    findCookie(cookie, res, (row) => {
		if (row) {
			extendExpiry(cookie);
			cookieToDB(cookie, (result) => {
				if (result) { //user found
					searchProfessionals(discipline, res);
				} else { // user not found
					var message = "No such user! You may register a new account.";
					createPage('loginPage_template.html', 'loginPage.html', message, () => {
						res.sendFile(__dir+'/loginPage.html');
					});
				}
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
    });
});

app.route('/myPosts_page.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		var cookie = req.cookies.sessionID;
		var q = url.parse(req.url, true);
		var currProfile = q.query.name;

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
						dbc.findOne({imgName: currProfile}, function(err, profile) {
							if(err) return console.log(err);
							myPosts(result, profile, res);
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else {
				console.log("Inprofile page: cookie was expired")
				sendReloginPage(res);
			}
		});
	});
});

app.route('/myPosts_seeAll.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		var cookie = req.cookies.sessionID;
		var q = url.parse(req.url, true);
		var currProfile = q.query.profile;

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
						dbc.findOne({imgName: currProfile}, function(err, profile) {
							if(err) return console.log(err);
							myPosts(result, profile, res);
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else {
				console.log("Inprofile page: cookie was expired")
				sendReloginPage(res);
			}
		});
	});
});

app.route('/wall_page.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		var q = url.parse(req.url, true);
		var cookie = req.cookies.sessionID;
		var username = q.query.name;

		console.log(username);
		
		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (currUser) => {
					var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
					dbc.findOne({username: username}, function(err, currProfile) {
						if (currProfile) { //user found
							displayWall(currProfile, currUser, res);
						} else { // user not found
							var message = "No such user! You may register a new account.";
							createPage('loginPage_template.html', 'loginPage.html', message, () => {
								res.sendFile(__dir+'/loginPage.html');
							});
						}
					});
				});
			} else {
				console.log("Inprofile page: cookie was expired")
				sendReloginPage(res);
			}
		});
	});
});

app.route('/askingWall.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		
		var q = url.parse(req.url, true);
		var cookie = req.cookies.sessionID;

		var wallProfile = q.query.to;
		var currUser = q.query.from;
		var question = q.query.question;
		var tempDate = new Date();
		var postId = "PO" + tempDate.getTime();

		console.log("Wall Profile: " + wallProfile);
		console.log("Curr User: " + currUser);
			
		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (result) => {
					if (result) { //user found
						var myObj = { 
							to: wallProfile,
							from: currUser,
							question: question,
							postID: postId,
							reply: null,
							date: getDate()
						};
			
						write2DB (myObj, QUESTION_COLLECTION);

						var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
						dbc.findOne({imgName: wallProfile}, function(error, result) {
							if(error) return console.log(error);
							if(result){
								var transporter = nodemailer.createTransport({
									service: 'gmail',
									auth: {
									user: 'support@osstia.com',
									pass: 'support@osstia1'
									}
								});
										  
								dbc.findOne({imgName: currUser}, function(error, profile) {
									if(error) return console.log(error);

									if(profile){
										var mailOptions = {
											from: 'support@osstia.com',
											to: result.email,
											subject: 'New Post On Your Wall',
											text: profile.firstname + " " + profile.lastname + " posted on your wall: \n" + question
										};
					
										transporter.sendMail(mailOptions, function(error, info){
											if (error) {
											console.log(error);
											} else {
											console.log('Email sent: ' + info.response);
											}
										});
										displayWall(result, profile, res);
									}
								});
							}				
						});
					} else { // user not found
						var message = "No such user! You may register a new account.";
						createPage('loginPage_template.html', 'loginPage.html', message, () => {
							res.sendFile(__dir+'/loginPage.html');
						});
					}
				});
			} else { // user not found
				var message = "No such user! You may register a new account.";
				createPage('loginPage_template.html', 'loginPage.html', message, () => {
					res.sendFile(__dir+'/loginPage.html');
				});
			}	
		});
	});
});

app.route('/replyWall.html').get(function(req, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		var q = url.parse(req.url, true);
		var cookie = req.cookies.sessionID;
		var postID = q.query.question;
		var reply = q.query.reply;

		if (err) return console.log(err);

		findCookie(cookie, res, (row) => {
			if (row) {
				extendExpiry(cookie);
				cookieToDB(cookie, (currUser) => {
					var dbc = client.db(DB_NAME).collection(QUESTION_COLLECTION);		  
					dbc.findOne({postID: postID}, function(err, result) {
						if (err) throw err;
						if (result) { //user found
							let myQuery = {postID: postID};
							let myNewObj = { $set: { reply: reply}};

							updateDB(myQuery, myNewObj, QUESTION_COLLECTION, () => {});

							var dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
							dbq.findOne({imgName: result.to}, function(err, currProfile) {
								if(err) return console.log(err);
								if(currProfile){
									dbq.findOne({imgName: result.from}, function(error, emailer) {
										if(error) return console.log(error);

										if(emailer){
											var transporter = nodemailer.createTransport({
												service: 'gmail',
												auth: {
												user: 'support@osstia.com',
												pass: 'support@osstia1'
												}
											});
		
											var mailOptions = {
												from: 'support@osstia.com',
												to: emailer.email,
												subject: currProfile.firstname + ' ' + currProfile.lastname + ' Responded To Your Question',
												text: currProfile.firstname + " " + currProfile.lastname + " posted on your wall: \nYour question: " + result.question + "\nReply: " + reply
											};
						
											transporter.sendMail(mailOptions, function(error, info){
												if (error) {
												console.log(error);
												} else {
												console.log('Email sent: ' + info.response);
												}
											});
		
											displayWall(currProfile, currUser, res);
										}
									});
								} else { //user not found
									var message = "No such user! You may register a new account.";
									createPage('loginPage_template.html', 'loginPage.html', message, () => {
										res.sendFile(__dir+'/loginPage.html');
									});
								}
							});
						} else { // user not found
							var message = "No such user! You may register a new account.";
							createPage('loginPage_template.html', 'loginPage.html', message, () => {
								res.sendFile(__dir+'/loginPage.html');
							});
						}
				});
			});
		} else {
			console.log("Inprofile page: cookie was expired")
			sendReloginPage(res);
		}
	});
   });
});

app.route('/tips_page.html').get(function(req, res){
	// createPage('tips_template.html', 'tips.html', )
	getTips((arr)=> {
			createTipsPage('tips_template.html', 'tips.html', arr, () => {
				res.sendFile(__dir + '/tips.html');
			})
		}
	);
	// getTips(num2Tip(), res);
	// getTips((arr) => {
	// 	createTipsPage('tips_template.html', 'tips.html', arr, () => {
	// 		res.sendFile(__dir + '/tips.html');
	// 	})
	// });	
});

app.route('/about_page.html').get(function(req, res){
	res.sendFile(__dir+'/aboutUs.html');
});

app.route('/survey.html').get(function(req, res){
	createPage('surveyPage_template.html', 'surveyPage.html', "", () => {
		res.sendFile(__dir+'/surveyPage.html');
	});
});

app.route('/surveying.html').get(function(req, res){
	// MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		// if(err) return console.log(err);

		var q = url.parse(req.url, true);
		var cookie = req.cookies.sessionID;
		// var name = q.query.user;
		var message = q.query.message;

		if(message === ""){
			createPage('surveyPage_template.html', 'surveyPage.html', "You did not submit anything", () => {
				res.sendFile(__dir+'/surveyPage.html');
			});
		} else {
			findCookie(cookie, res, (row) => {
				if (row) {
					extendExpiry(cookie);
					cookieToDB(cookie, (currUser) => {
						if(currUser){
							// var dbc = client.db(DB_NAME).collection(QUESTION_COLLECTION);		  
							// dbc.findOne({imgName: currUser.imgName}, function(err, result) {
							// 	if(err) return console.log(err);
							// 	if (result){
									var transporter = nodemailer.createTransport({
										service: 'gmail',
										auth: {
										user: 'support@osstia.com',
										pass: 'support@osstia1'
										}
									});

									var mailOptions = {
										from: 'support@osstia.com',
										to: 'support@osstia1',
										subject: 'FeedBack: Sending Email using Node.js',
										text: message
									};

									transporter.sendMail(mailOptions, function(error, info){
										if (error) {
										  console.log(error);
										} else {
										  console.log('Email sent: ' + info.response);
										}
									  });

									  createPage('surveyPage_template.html', 'surveyPage.html', "Thank you for your feedback", () => {
										res.sendFile(__dir+'/surveyPage.html');
									});

								// }
							// });
						}
					});
				}
			});
		}

	// });
});

app.route('/logOut_page.html').get(function(req, res){
	var message = "You have succesfully logged out";
	var cookie = req.cookies.sessionID;
	
	findCookie(cookie, res, (row) => {
		row[1] = 0;
		expireCookies();
		createPage('loginPage_template.html', 'loginPage.html', message, () => {
			res.sendFile(__dir+'/loginPage.html');
		});
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

	})
}

function add2DB (myobj, collection, callback){
	MongoClient.connect(DB_URL, 
		{ useUnifiedTopology: true }, 
		(err, client) => {
		 if (err) return console.log(err);

		 // Storing a reference to the database so you can use it later
		 var dbc = client.db(DB_NAME).collection(collection);		  
		 dbc.insertOne(myobj, function(err, res) {
		  if (err) throw err;
		  console.log("Inserted document =", myobj);
		  callback();
		 })

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

function displayPosts (currUser, res) {
    MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		showFullDB(POST_COLLECTION);
		var str = "";

		if(currUser.accountType === "employer"){
			str += ("<form action='/create_post.html'><button id='newPostButton' value='newPost'>Create a New Post</button></form>");
		}

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);
		dbc.find({}).toArray(function(error, result){
			if(error) return console.log(error);

			if(result){
				var sortedArray = result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

				console.log(sortedArray.length);

				if(sortedArray.length == 0){
					str += "<p class='centre'>There are no posts yet</p>";
					createPage('postPage_template.html', 'postPage.html', str, () =>{
						res.sendFile(__dir + '/postPage.html');
					});
				} else {
					str += "<table>";
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								let post = sortedArray[i];
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='display'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='display'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='display'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									createPage('postPage_template.html', 'postPage.html', str, () =>{
										// history.replaceState(null, null, "/post_page.html"); 
										
										res.sendFile(__dir + '/postPage.html');
										// res.end();
									});
								}
							}
						});
					}
				}
			}
		});
	});
}

function savedPosts (currUser, res) {
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var str = "";
		var sortedArray = [];
		// let marker = false;

		// if(currUser.accountType === "employer"){
		// 	str += ("<form action='/create_post.html'><button id='newPostButton' value='newPost'>Create a New Post</button></form>");
		// }

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);
		dbc.find({}).toArray(function(error, result){
			if(error) return console.log(error);

			if(result){
				var arr = result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

				for(let i = 0; i < arr.length; i++){
					if(currUser.savedPosts.includes(arr[i].postID)){
						sortedArray.push(arr[i]);
					}
					// if(i === arr.length - 1){
					// 	marker = true;
					// }
				}

				if(sortedArray.length == 0){
					str += "<p class='centre'>You have no saved posts</p>";
					if(currUser.accountType === "student"){
						createMyPostsPage('studentSavedPosts_template.html', 'savedPosts.html', str, currUser, () =>{
							res.sendFile(__dir + '/savedPosts.html');
						});
					} else if (currUser.accountType === "employer"){
						createMyPostsPage('employerSavedPosts_template.html', 'savedPosts.html', str, currUser, () =>{
							res.sendFile(__dir + '/savedPosts.html');
						});
					}	
				} else {
					str += "<table>";
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								let post = sortedArray[i];
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='saved'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='saved'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='saved'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									if(currUser.accountType === "student"){
										createMyPostsPage('studentSavedPosts_template.html', 'savedPosts.html', str, currUser, () =>{
											res.sendFile(__dir + '/savedPosts.html');
										});
									} else if (currUser.accountType === "employer"){
										createMyPostsPage('employerSavedPosts_template.html', 'savedPosts.html', str, currUser, () =>{
											res.sendFile(__dir + '/savedPosts.html');
										});
									}	
								}
							}
						});
					}
				}
			}
		});
	});
}

function displayProfessionals (res) {
    MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
         if (err) return console.log(err);
		 var str = "";

         var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
		 dbc.find({accountType: "employer"}).toArray(function(err, result) {
			 if (err) throw err;

			str += "<table>";
			for (var i = 0; i < result.length; i++) {
				if(i % 4 === 0){
					str += "<tr>"
				}
					str += "<td>"
					str += "<div class='profile'>"
					var imagePath = __dir + "/images/" + result[i].imgName;
					var imageFileName;
					if (fs.existsSync(imagePath)) {
						console.log("file exists")
						imageFileName = result[i].imgName;
					} else {
						console.log("file does not exsit")
						imageFileName = "avatar.jpg";
					}
					str += ("<img id='pic' src='" + imageFileName + "'>");
					str += ("<p class='centre' id='name'>" + result[i].firstname + " " + result[i].lastname+"</p>");
					str += ("<p class='centre' id='username'>" + result[i].username+"</p>");
					str += ("<p class='centre' id='discipline'>Discipline: " + result[i].discipline+"</p>");	
					str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + result[i].imgName + "'><input type='submit' value='View Profile'></form>");
					str += "</div>";
					str += "</td>";
				if(i % 4 === 0){
					str += "</tr>"
				}
			}
			str += "</table>";
			createPage('professional_template.html', 'professional.html', str, () =>{
				res.sendFile(__dir + '/professional.html');
			});
		});
	});
}

function myPosts (currUser, currProfile, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		if(currProfile == null){
			currProfile = currUser;
		}
		var str = "";
		var sortedArray = [];
		// let marker = false;

		if(currUser.accountType === "employer"){
			str += ("<form action='/create_post.html'><button id='newPostButton' value='newPost'>Create a New Post</button></form>");
		}

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);
		dbc.find({}).toArray(function(error, result){
			if(error) return console.log(error);

			if(result){
				var arr = result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

				for(let i = 0; i < arr.length; i++){
					if(arr[i].userID === currProfile.imgName){
						sortedArray.push(arr[i]);
					}
					// if(i === arr.length - 1){
					// 	marker = true;
					// }
				}

				if(sortedArray.length == 0){
					str += "<p class='centre'>This account has no posts</p>";
					if(currProfile.imgName === currUser.imgName){
						console.log("Hello World");
						createMyPostsPage('myPosts_template.html', 'myPosts.html', str, currProfile, () =>{
							res.sendFile(__dir + '/myPosts.html');
						});
					} else {
						console.log("Goodbye World");
						createMyPostsPage('searchedMyPosts_template.html', 'myPosts.html', str, currProfile, () =>{
							res.sendFile(__dir + '/myPosts.html');
						});
					}
				} else {
					str += "<table>";
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								let post = sortedArray[i];
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='opp'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='opp'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='opp'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									if(currProfile.imgName === currUser.imgName){
										// console.log("Hello World");
										createMyPostsPage('myPosts_template.html', 'myPosts.html', str, currProfile, () =>{
											res.sendFile(__dir + '/myPosts.html');
										});
									} else {
										createMyPostsPage('searchedMyPosts_template.html', 'myPosts.html', str, currProfile, () =>{
											res.sendFile(__dir + '/myPosts.html');
										});
									}	
								}
							}
						});
					}
				}
			}
		});

	});	
}

function displayWall (currProfile, currUser, res) {
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var str = "<div id='content'>";
		// var sortedArray = [];
		// let marker = false;
		if(currProfile == null){
			currProfile = currUser;
		}

		// if(currUser.imgName != currProfile.imgName){
		str += ("<form id='newQ' action='/askingWall.html'><input type='hidden' id='to' name='to' value='"+currProfile.imgName+"' required><input type='hidden' id='from' name='from' value='"+currUser.imgName+"' required><input class='textInput' type='text' id='question' name='question' placeholder='Ask a question...' required><input class='this' type='submit' value='Ask A New Question'></form>");
		// }
		

		var dbc = client.db(DB_NAME).collection(QUESTION_COLLECTION);
		dbc.find({to: currProfile.imgName}).toArray(function(error, result){
			if(error) return console.log(error);

			if(result){
				var sortedArray = result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
				console.log(sortedArray.length);
				if(sortedArray.length == 0){
					str += "<p class='centre'>There are no questions on this wall</p>";
					console.log(currUser.imgName);
					console.log(currProfile.imgName);
					if(currUser.imgName === currProfile.imgName){
						// console.log("yay");
						str += "</div>"
						createMyPostsPage('wall_template.html', 'wall.html', str, currProfile, () =>{
							res.sendFile(__dir + '/wall.html');
						});
					} else {
						str += "</div>"
						createMyPostsPage('searchedWall_template.html', 'wall.html', str, currProfile, () =>{
							res.sendFile(__dir + '/wall.html');
						});
					}	
				} else {
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].from
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								let post = sortedArray[i];
								str += "<div class='post'>"
								str += "<div class='question'>"
								str += ("<p class='title'>" + user.firstname + " " + user.lastname+" (" + user.username+") asked a question</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input type='submit' class='viewProfile' value='View Profile'></form>");
								str += ("<p class='date'> Date: " + post.date+"</p>");
								str += ("<p class='q'>" + post.question+"</p>");
								str += "</div>"
								str += "<div class='response'>"
								str += "<p class='bold'>Reply: </p>"
								if(post.reply != null){
									str += ("<p class='reply'>"+post.reply+"</p>");
								} else {
									str += ("<p class='reply'>There is no reply yet</p>");
								}
								str += "</div>"
								
								if(post.reply == null && currProfile.imgName === currUser.imgName){
									str += ("<form class='replyButton' action='/replyWall.html'><input type='text' name='reply'><input type='hidden' name='question' value='" + post.postID + "'><input type='submit' class='this' value='Reply'></form>");
									str += "</div>"
									boolean = true;
								} else {
									boolean = true;
									str += "</div>"
								}
							
								if(boolean === true && i === sortedArray.length-1){
									if(currUser.imgName === currProfile.imgName){
										str += "</div>";
										console.log("if");
										createMyPostsPage('wall_template.html', 'wall.html', str, currProfile, () =>{
											res.sendFile(__dir + '/wall.html');
										});
									} else {
										str += "</div>"
										console.log("else");
										createMyPostsPage('searchedWall_template.html', 'wall.html', str, currProfile, () =>{
											res.sendFile(__dir + '/wall.html');
										});
									}	
								}
							}
						});
					}
				}
			}
		});
	});
}

function filter (inputFile, outputFile, page, currUser, age, position, discipline, virt, city, country, res, callback){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		let flip = false;
		let wait = false;
		var tempArr = [];
		var virtArr = [];
		var ageArr = [];
		var positionArr = [];
		var disciplineArr = [];
		var cityArr = [];
		var countryArr = [];
		var num = 0;

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);
		dbc.find({}).toArray(function(err, result) {
			if(err) return console.log(err);
			if(result){
				if (virt !== "null"){
					for(let i = 0; i < result.length; i++){
						console.log(result[i]);
						if(result[i].virt.toLowerCase() === virt.toLowerCase()){
							virtArr.push(result[i]);
						}
					}
					num++;
					console.log("added at virtual");
					flip = true;
				}
				if (age !== "null"){
					for (let i = 0; i < result.length; i++){
						if(parseInt(result[i].age) <= parseInt(age)){
							ageArr.push(result[i]);
						}
					}
					num++;
					console.log("added at age");
					flip = true;
				} 
				if (position !== "null"){
					for(let i = 0; i < result.length; i++){
						if(result[i].oppType.toLowerCase() === position.toLowerCase()){
							positionArr.push(result[i]);
						}
					}
					num++;
					console.log("added at position");
					flip = true;
				} 
				if (discipline !== "null"){
					for(let i = 0; i < result.length; i++){
						console.log(result[i]);
						if(result[i].discipline.toLowerCase() === discipline.toLowerCase()){
							disciplineArr.push(result[i]);
						}
					}
					num++;
					console.log("added at discipline");
					flip = true;
				}
				if (city !== ""){
					for(let i = 0; i < result.length; i++){
						console.log(result[i]);
						if(result[i].city.toLowerCase() === city.toLowerCase()){
							cityArr.push(result[i]);
						}
					}
					num++;
					console.log("added at city");
					flip = true;
				}
				if (country !== ""){
					for(let i = 0; i < result.length; i++){
						console.log(result[i]);
						if(result[i].country.toLowerCase() === country.toLowerCase()){
							countryArr.push(result[i]);
						}
					}
					num++;
					console.log("added at country");
					flip = true;
				} 

				if (flip == true){
					console.log("Virt: " + virtArr);
					console.log("Age: " + ageArr);
					console.log("Position: " + positionArr);
					console.log("Discipline: " + disciplineArr);
					console.log("City: " + cityArr);
					console.log("Country: " + countryArr);

					console.log("NUm: " + num);

					if(num === 0){
						tempArr.push(result);
						wait = true;
					} else if (num === 1){
						if(virtArr.length != 0){
							for(let i = 0; i < virtArr.length; i++){
								tempArr.push(virtArr[i]);
							}
							wait = true;
						} else if (ageArr.length != 0){
							for(let i = 0; i < ageArr.length; i++){
								tempArr.push(ageArr[i]);
							}
							wait = true;
						} else if (positionArr.length != 0){
							for(let i = 0; i < positionArr.length; i++){
								tempArr.push(positionArr[i]);
							}
							wait = true;
						} else if (disciplineArr.length != 0){
							for(let i = 0; i < disciplineArr.length; i++){
								tempArr.push(disciplineArr[i]);
							}
							wait = true;
						} else if (cityArr.length != 0){
							for(let i = 0; i < cityArr.length; i++){
								tempArr.push(cityArr[i]);
							}
							wait = true;
						} else {
							for(let i = 0; i < countryArr.length; i++){
								tempArr.push(countryArr[i]);
							}
							wait = true;
						}
					} else if (num === 2){
						if(virtArr.length != 0){
							for(let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i])||positionArr.includes(virtArr[i])||disciplineArr.includes(virtArr[i])||cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						} else if(ageArr.length != 0){
							for(let i = 0; i < ageArr.length; i++){
								if(positionArr.includes(ageArr[i])||disciplineArr.includes(ageArr[i])||cityArr.includes(ageArr[i])||countryArr.includes(ageArr[i])){
									tempArr.push(ageArr[i]);
								}
							}
							wait = true;
						} else if(positionArr.length != 0){
							for(let i = 0; i < positionArr.length; i++){
								if(disciplineArr.includes(positionArr[i])||cityArr.includes(positionArr[i])||countryArr.includes(positionArr[i])){
									tempArr.push(positionArr[i]);
								}
							}
							wait = true;
						} else if(disciplineArr.length != 0){
							for(let i = 0; i < disciplineArr.length; i++){
								if(cityArr.includes(disciplineArr[i])||countryArr.includes(disciplineArr[i])){
									tempArr.push(disciplineArr[i]);
								}
							}
							wait = true;
						} else if(cityArr.length != 0){
							for(let i = 0; i < cityArr.length; i++){
								if(countryArr.includes(cityArr[i])){
									tempArr.push(cityArr[i]);
								}
							}
							wait = true;
						}
					} else if (num === 3){
						if(search !== ""){
							for(let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i])){
									if(positionArr.includes(virtArr[i])||disciplineArr.includes(virtArr[i])||cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
										tempArr.push(virtArr[i]);
									}
									wait = true;
								} else if(positionArr.includes(virtArr[i])){
									if(disciplineArr.includes(virtArr[i])||cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
										tempArr.push(virtArr[i]);
									}
									wait = true;
								} else if(disciplineArr.includes(virtArr[i])){
									if(cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
										tempArr.push(virtArr[i]);
									}
									wait = true;
								} else if(cityArr.includes(virtArr[i])){
									if(countryArr.includes(virtArr[i])){
										tempArr.push(virtArr[i]);
									}
									wait = true;
								}
							}
						} else if (age !== "null"){
							for(let i = 0; i < ageArr.length; i++){
								if(positionArr.includes(ageArr[i])){
									if(disciplineArr.includes(ageArr[i])||cityArr.includes(ageArr[i])||countryArr.includes(ageArr[i])){
										tempArr.push(ageArr[i]);
									}
									wait = true;
								} else if(disciplineArr.includes(ageArr[i])){
									if(cityArr.includes(ageArr[i])||countryArr.includes(ageArr[i])){
										tempArr.push(ageArr[i]);
									}
									wait = true;
								} else if(cityArr.includes(ageArr[i])){
									if(countryArr.includes(ageArr[i])){
										tempArr.push(ageArr[i]);
									}
									wait = true;
								}
							}
						} else if (position !== "null"){
							for(let i = 0; i < positionArr.length; i++){
								if(disciplineArr.includes(positionArr[i])){
									if(cityArr.includes(positionArr[i])||countryArr.includes(positionArr[i])){
										tempArr.push(positionArr[i]);
									}
									wait = true;
								} else if(cityArr.includes(positionArr[i])){
									if(countryArr.includes(positionArr[i])){
										tempArr.push(positionArr[i]);
									}
									wait = true;
								}
							}
						} else if (discipline !== "null"){
							for(let i = 0; i < disciplineArr.length; i++){
								if(cityArr.includes(disciplineArr[i])){
									if(countryArr.includes(disciplineArr[i])){
										tempArr.push(disciplineArr[i]);
									}
								}
							}
							wait = true;
						}
					} else if (num === 4){
						if(search !== ""){
							for(let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i])){
									if(positionArr.includes(virtArr[i])){
										if(disciplineArr.includes(virtArr[i])||cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
											tempArr.push(virtArr[i]);
										}
										wait = true;
									} else if(disciplineArr.includes(virtArr[i])){
										if(cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
											tempArr.push(virtArr[i]);
										}
										wait = true;
									} else if(cityArr.includes(virtArr[i])){
										if(countryArr.includes(virtArr[i])){
											tempArr.push(virtArr[i]);
										}
										wait = true;
									}
								} else if(positionArr.includes(virtArr[i])){
									if(disciplineArr.includes(virtArr[i])){
										if(cityArr.includes(virtArr[i])||countryArr.includes(virtArr[i])){
											tempArr.push(virtArr[i]);
										}
										wait = true;
									} else if (cityArr.includes(virtArr[i])){
										if(countryArr.includes(virtArr[i])){
											tempArr.push(virtArr[i]);
										}
										wait = true;
									}
								} else if(disciplineArr.includes(virtArr[i])){
									if(cityArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
										tempArr.push(virtArr[i]);
									}
									wait = true;
								}
							}
							wait = true;
						} else if (age !== "null"){
							for(let i = 0; i < ageArr.length; i++){
								if(positionArr.includes(ageArr[i])){
									if(disciplineArr.includes(ageArr[i])){
										if(cityArr.includes(ageArr[i])||countryArr.includes(ageArr[i])){
											tempArr.push(ageArr[i]);
										}
										wait = true;
									} else if (cityArr.includes(ageArr[i]) && countryArr.includes(ageArr[i])){
										tempArr.push(ageArr[i]);
									}
									wait = true;
								} else if(disciplineArr.includes(ageArr[i])){
									if(cityArr.includes(ageArr[i]) && countryArr.includes(ageArr[i])){
										tempArr.push(ageArr[i]);
									}
								}
							}
							wait = true;
						} else if (position != "null"){
							for(let i = 0; i < positionArr.length; i++){
								if(disciplineArr.includes(positionArr[i]) && cityArr.includes(positionArr[i]) && countryArr.includes(positionArr[i])){
									tempArr.push(positionArr[i]);
								}
							}
							wait = true;
						}
					} else if (num === 5){
						if(search === ""){
							for (let i = 0; i < ageArr.length; i++){
								if(positionArr.includes(ageArr[i]) && disciplineArr.includes(ageArr[i]) && cityArr.includes(ageArr[i]) && countryArr.includes(ageArr[i])){
									tempArr.push(ageArr[i]);
								}
							}
							wait = true;
						} else if (age === "null") {
							for (let i = 0; i < virtArr.length; i++){
								if(positionArr.includes(virtArr[i]) && disciplineArr.includes(virtArr[i]) && cityArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						} else if (position === "null") {
							for (let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i]) && disciplineArr.includes(virtArr[i]) && cityArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						} else if (discipline === "null") {
							for (let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i]) && positionArr.includes(virtArr[i]) && cityArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						} else if (city === "") {
							for (let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i]) && positionArr.includes(virtArr[i]) && disciplineArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						} else if (country === "") {
							for (let i = 0; i < virtArr.length; i++){
								if(ageArr.includes(virtArr[i]) && positionArr.includes(virtArr[i]) && cityArr.includes(virtArr[i]) && disciplineArr.includes(virtArr[i])){
									tempArr.push(virtArr[i]);
								}
							}
							wait = true;
						}
					} else {
						for(let i = 0; i < virtArr.length; i++){
							if(ageArr.includes(virtArr[i]) && positionArr.includes(virtArr[i]) && cityArr.includes(virtArr[i]) && disciplineArr.includes(virtArr[i]) && countryArr.includes(virtArr[i])){
								tempArr.push(virtArr[i]);
							}
						}
						wait = true;
					}

					if(wait == true){
						// console.log("Temp: " + tempArr[0].postID);

						var sortedArray = tempArr.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

						console.log(sortedArray);

						callback(inputFile, outputFile, page, currUser, sortedArray, res);
					}	
				}
			}
		});
	});
}

function searchPost (inputFile, outputFile, page, currUser, sortedArray, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		console.log("searchPost");
		// let arr = [];
		// let tempArr = [];
		var str = "";
		// console.log("TempArr: " + tempArr);

		
		// for()

		// console.log("Sorted: " + sortedArray[0].length);

		if(sortedArray.length == 0){
			console.log("if");
			str += "<p>There are no posts yet</p>";
			createPage(inputFile, outputFile, str, () =>{
				res.sendFile(__dir + '/'+outputFile);
			});
		} else {
			console.log("else")
			str += "<table>";
			console.log(sortedArray);
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let post = sortedArray[i];
						console.log("before");
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								console.log("user");
								
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									console.log(page);
									createPage(inputFile, outputFile, str, () =>{
										res.sendFile(__dir + '/'+outputFile);
									});								
								}
							}
						});
					}
		}
	});
}

function searchMyPost (inputFile, outputFile, page, currUser, sortedArray, profile, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if(err) return console.log(err);
		console.log("searchPost");
		// let arr = [];
		// let tempArr = [];
		var str = "";
		// console.log("TempArr: " + tempArr);

		
		// for()

		// console.log("Sorted: " + sortedArray[0].length);

		if(sortedArray.length == 0){
			console.log("if");
			str += "<p>There are no posts yet</p>";
			createPage(inputFile, outputFile, str, () =>{
				res.sendFile(__dir + '/'+outputFile);
			});
		} else {
			console.log("else")
			str += "<table>";
			console.log(sortedArray);
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let post = sortedArray[i];
						console.log("before");
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								console.log("user");
								
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='"+page+"'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									console.log(page);
									createMyPostsPage(inputFile, outputFile, str, profile, () => {
										res.sendFile(__dir + '/'+outputFile);
									});
									// createPage(inputFile, outputFile, str, () =>{
									// 	res.sendFile(__dir + '/'+outputFile);
									// });								
								}
							}
						});
					}
		}
	});
}

function searchProfile (myQuery, res){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		let arr = [];
		var str = "";
		var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
		dbc.find({}).toArray(function(err, result) {
			if (err) throw err;
			for(var i = 0; i < result.length; i++){
				if (result[i].firstname.toLowerCase() === myQuery.toLowerCase()){
					arr.push(result[i]);
				} else if (result[i].lastname.toLowerCase() === myQuery.toLowerCase()){
					arr.push(result[i]);
				} else if (result[i].username.toLowerCase() === myQuery.toLowerCase()){
					arr.push(result[i]);
				}
			}
			str += "<table>";
			 for (var i = 0; i < arr.length; i++) {
				 if(i % 4 === 0){
					 str += "<tr>"
				 }
					 str += "<td>"
					 str += "<div class='profile'>"
					 var imagePath = __dir + "/images/" + arr[i].imgName;
					 var imageFileName;
					 if (fs.existsSync(imagePath)) {
						 console.log("file exists")
						 imageFileName = arr[i].imgName;
					 } else {
						 console.log("file does not exsit")
						 imageFileName = "avatar.jpg";
					 }
					 str += ("<img id='pic' src='" + imageFileName + "'>");
					 str += ("<p class='centre' id='name'>" + arr[i].firstname + " " + arr[i].lastname+"</p>");
					 str += ("<p class='centre' id='username'>" + arr[i].username+"</p>");
					 str += ("<p class='centre' id='discipline'>Discipline: " + arr[i].discipline+"</p>");	
					 str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + result[i].imgName + "'><input type='submit' value='View Profile'></form>");
					 str += "</div>";
					 str += "</td>";
				 if(i % 4 === 0){
					 str += "</tr>"
				 }
			 }
			 str += "</table>";
			if(arr.length === 0){
				str = "We found no results for your search";
			}
			createPage('searchedProfiles_template.html', 'searchedProfiles.html', str, () =>{
				res.sendFile(__dir + '/searchedProfiles.html');
			});
		});
	});
}

function searchProfessionals (discipline, res) {
    MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
         if (err) return console.log(err);
		 var str = "";

         var dbc = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);		  
		 dbc.find({discipline: discipline}).toArray(function(err, result) {
			 if (err) throw err;

			 str += "<table>";
			 for (var i = 0; i < result.length; i++) {
				 if(i % 4 === 0){
					 str += "<tr>"
				 }
					 str += "<td>"
					 str += "<div class='profile'>"
					 var imagePath = __dir + "/images/" + result[i].imgName;
					 var imageFileName;
					 if (fs.existsSync(imagePath)) {
						 console.log("file exists")
						 imageFileName = result[i].imgName;
					 } else {
						 console.log("file does not exsit")
						 imageFileName = "avatar.jpg";
					 }
					 str += ("<img id='pic' src='" + imageFileName + "'>");
					 str += ("<p class='centre' id='name'>" + result[i].firstname + " " + result[i].lastname+"</p>");
					 str += ("<p class='centre' id='username'>" + result[i].username+"</p>");
					 str += ("<p class='centre' id='discipline'>Discipline: " + result[i].discipline+"</p>");	
					 str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + result[i].imgName + "'><input type='submit' value='View Profile'></form>");
					 str += "</div>";
					 str += "</td>";
				 if(i % 4 === 0){
					 str += "</tr>"
				 }
			 }
			 str += "</table>";
			 createPage('professional_template.html', 'professional.html', str, () =>{
				res.sendFile(__dir + '/professional.html');
			});
		});
	});
}

function myFeed (currUser, res) {
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);

		var str = "";
		var sortedArray = [];
		// let marker = false;

		if(currUser.accountType === "employer"){
			str += ("<form action='/create_post.html'><button id='newPostButton' value='newPost'>Create a New Post</button></form>");
		}

		console.log("Step One");

		var dbc = client.db(DB_NAME).collection(POST_COLLECTION);
		dbc.find({}).toArray(function(error, result){
			if(error) return console.log(error);

			if(result){
				console.log("Step Two");
				var arr = result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

				for(let i = 0; i < arr.length; i++){
					if(currUser.followingList.includes(arr[i].userID)){
						sortedArray.push(arr[i]);
					}
					if(i === arr.length - 1){
						// marker = true;
					}
				}

				if(sortedArray.length == 0){
					str += "<p class='centre'>There are no posts yet</p>";
					createPage('myFeed_template.html', 'myFeed.html', str, () =>{
						res.sendFile(__dir + '/myFeed.html');
					});
				} else {
					str += "<table>";
					for(let i = 0; i < sortedArray.length; i++){
						let boolean = false;
						let userID = sortedArray[i].userID
						let dbq = client.db(DB_NAME).collection(ACCOUNT_COLLECTION);
						dbq.findOne({imgName: userID}, function(err, user){
							if(err) console.log(err);
							if(user){
								let post = sortedArray[i];
								if(i % 2 === 0){
									str += "<tr>"
								}
								str += "<td>"
								str += "<div class='post'>";
								str += ("<p class='name'>" + user.firstname + " " + user.lastname+"</p>");
								str += ("<p class='username'>" + user.username+"</p>");
								str += ("<p class='title'> " + post.title+"</p>");
								str += ("<p class='description'>" + post.description+"</p>");
								str += ("<p class='address'><span class='color'>Address:</span> " + post.address+", " + post.city+", " + post.country + ", "+post.postalCode+"</p>");
								str += ("<p class='age'><span class='color'>Minimum Age:</span> " + post.age+"</p>");
								str += ("<p class='supervisor'><span class='color'>Supervisor:</span> " + post.supervisor+"</p>");
								str += ("<p class='contactInfo'><span class='color'>Contact Information:</span> " + post.contactInfo+"</p>");
								str += ("<p class='oppType'>" + post.oppType+"</p>");
								str += ("<p class='discipline'><span class='color'>Discipline:</span> " + post.discipline+"</p>");
								str += ("<p class='virt'><span class='color'>Virtual/In Person:</span> " + post.virt+"</p>");
								str += ("<p class='date'>" + post.date+"</p>");
								str += ("<form action='/searchedProfile_page.html'><input type='hidden' name='searchedProfile' value='" + user.imgName + "'><input class='viewProfile' type='submit' value='View Profile'></form>");
								// console.log("Check: " + currUser.savedPosts.includes(curVal.postID));
								if(user.imgName === currUser.imgName){
									str += ("<form action='/deletePost.html'><input type='hidden' name='page' value='feed'><input type='hidden' name='post' value='" + post.postID + "'><input class='deletePost' type='submit' value='Delete Post'></form>");
								}
								if(currUser.savedPosts.includes(post.postID) === false){
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/savePost.html'><input type='hidden' name='page' value='feed'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Save Post'></form>");
								} else {
									if(i === sortedArray.length-1){
										boolean = true;
									}
									str += ("<form action='/removePost.html'><input type='hidden' name='page' value='feed'><input type='hidden' name='post' value='" + post.postID + "'><input class='savePost' type='submit' value='Unsave Post'></form>");
								}
								str += "</div>";
								str += "</td>";
								if(i % 2 === 0){
									str += "</tr>";
								}
								if(boolean === true && i === sortedArray.length-1){
									str += "</table>";
									createPage('myFeed_template.html', 'myFeed.html', str, () =>{
										// history.replaceState(null, null, "/post_page.html"); 
										
										res.sendFile(__dir + '/myFeed.html');
										// res.end();
									});
								}
							}
						});
					}
				}
			}
		});
	});
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

function getTips(callback){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		var ints = [];
		var titles = [];
		var dbc = client.db(DB_NAME).collection(TIPS_COLLECTION);
		dbc.countDocuments().then((count) => {
			for(let i = 0; i < 6;){
				var randNum = Math.floor(Math.random() * count);
				if(ints.includes(randNum) === false){
					ints.push(randNum);
					i++;
				}
				console.log(ints);
				if(i === 5){
					titlesName(ints, titles, callback);
				}
			}
		});
	});
}

function titlesName(ints, arr, callback){
	MongoClient.connect(DB_URL, { useUnifiedTopology: true }, (err, client) => {
		if (err) return console.log(err);
		var dbc = client.db(DB_NAME).collection(TIPS_COLLECTION);
		for(let j = 0; j < ints.length; j++){
			dbc.findOne({num: ints[j]}, function(error, result){
				if (error) return console.log(error);
				if(result){
					console.log(result);
					arr.push(result.text);
					console.log("ARR: " + arr);
					if(j === ints.length-1){
						callback(arr);
					}
				}
			});
		}
	});
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
		if(err) return console.log(err);
        
        console.log(myObj);

    	var str = data.toString();
    	var imagePath = __dir + "/images/" + myObj[10];
    	var imageFileName;

    	if (fs.existsSync(imagePath)) {
    		console.log("file exists")
    		imageFileName = myObj[10];
    	} else {
    		console.log("file does not exsit")
    		imageFileName = "avatar.jpg";
		}
		
    	var str0 = str.replace('${value}' , myObj[5]);
	   var str1 =  str0.replace('${imagename}', imageFileName);  		
	   var str2 = str1.replace('${firstname}', myObj[3]);
	   var str3 = str2.replace('${lastname}' , myObj[4]);
	   var str4 = str3.replace('${username}' , myObj[5]);
       var str5 = str4.replace('${password}' , myObj[6]);
       var str6 = str5.replace('${email}', myObj[7]);
       var str7 = str6.replace('${school}', myObj[8]);
    //    var str6 = str5.replace('${accountType}', myObj[8]);
	   var str8 = str7.replace('${accountType}', myObj[9]);
	   var str9 = str8.replace('${message}', myObj[11]);
	   var str10 = str9.replace('${myPosts}', myObj[5]);
	   
    	
    	fs.writeFile(outputFile, str10,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function createSearchedProfilePage(inputFile, outputFile, myObj, following, callback){
	var data = fs.readFile(inputFile, function(err, data) {
		if(err) throw (err);
        
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
		
		var str0 = str.replace('${value}' , myObj[5]);
	   var str1 =  str0.replace('${imagename}', imageFileName);  		
	   var str2 = str1.replace('${firstname}', myObj[0]);
	   var str3 = str2.replace('${lastname}' , myObj[1]);
	   var str4 = str3.replace('${username}' , myObj[2]);
       var str5 = str4.replace('${school}', myObj[3]);
	   var str6 = str5.replace('${accountType}', myObj[4]);
	   var str7 = str6.replace('${following}', following);
	   var str8 = str7.replace('${myPosts}', myObj[5]);
	   var str9 = str8.replace('${profile}', myObj[2]);
	  
    	
    	fs.writeFile(outputFile, str9,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function createMyPostsPage(inputFile, outputFile, str, profile, callback){
	var data = fs.readFile(inputFile, function(err, data) {
		if(err) throw (err);
        
        // console.log(myObj);

    	var string = data.toString();
		
		var str0 = string.replace('${value}' , profile.imgName);
	   var str1 = str0.replace('${myPosts}', profile.imgName);
	   var str2 = str1.replace('${profile}', profile.imgName);
	   var str3 = str2.replace('${message}', str);
	   var str4 = str3.replace('${thisUser}', profile.imgName);
	   var str5 = str4.replace('${currUser}', profile.imgName);
	   
	  
    	
    	fs.writeFile(outputFile, str5,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function createTipsPage(inputFile, outputFile, myObj, callback){
	var data = fs.readFile(inputFile, function(err, data) {
		if(err) throw (err);
        
        // console.log(myObj);

    	var str = data.toString();
		// console.log(myObj);
    	
	   var str0 =  str.replace('$one', myObj[0]);  		
	   var str1 = str0.replace('$two', myObj[1]);
	   var str2 = str1.replace('$three' , myObj[2]);
	   var str3 = str2.replace('$four', myObj[3]);
	   var str4 = str3.replace('$five', myObj[4]);
	   var str5 = str4.replace('$six', myObj[5]);
    	
    	fs.writeFile(outputFile, str5,  function (err) {
		 	if (err) throw err;
			callback();
		});
  	}); 
}

function sendReloginPage (res) {
	var message = "Your session has expired";
	createPage('loginPage_template.html', 'loginPage.html', message, () => {
		res.sendFile(__dir+'/loginPage.html');
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
            // cookieTable[i][7] = row[7];
			// cookieTable[i][8] = row[8];
			// cookieTable[i][9] = row[9];
			// cookieTable[i][10] = row[10];
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