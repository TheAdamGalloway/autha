var bcrypt = require('bcryptjs'), // Password Hashing with automated salting
	Q = require('q'), // Asynchronous request deferring, reducing reliance on node's callbacks
	validator = require('validator'), //Again, basic string validation
	orient = require('orientjs'),
	db = require('orchestrate')('b8c7c0d1-cbbf-4847-890d-760449b8ba77'); //Orchestrate DBaaS API interface

var server = orient({
   host:       'localhost',
   port:       2424,
   username:   'root',
   password:   'password'
});

var db = server.use({
   name:     'ComputerScience',
   username: 'admin',
   password: 'password'
});

exports.localReg = function(username, password, mobile) {
	//Local registration logic
	var deferred = Q.defer(), //Defer the function call
		username = username.toUpperCase(), // Capitalise username to remove issues with duplicate keys
		hash = bcrypt.hashSync(password, 8), // Hash password using bcrypt
		user = {
			"username": username,
			"password": hash,
			"mobile": mobile
		}; //User object for pushing to the database
	db.get('users', username)
	.then(function(res){
		//Case that username is found in database
		deferred.resolve(false);
	})
	.fail(function (res) {
		//Username is unique amongst current users.
		if(res.body.message == 'The requested items could not be found.'){
			db.put('users', username, user) //Put data into the data store, using username as the key, and user as the value.
			.then(function() {
				//Console print for debugging
				console.log("Succesfully created user.");
				deferred.resolve(user);
			})
			.fail(function(err) {
				//Unexpected database error
				console.log(err.body.message);
				deferred.reject("Database error. Try again later.");
			})
		}
		else {
			//Non standard error received from database API, check API documentation
			console.log(res.body.message);
			deferred.reject("Try again later.");
		}
	});
	return deferred.promise;
}

exports.addKey = function(title, key, user) {
	var deferred = Q.defer();

	//TODO: Key input validation
	db.post('keys', {
		"title": title,
		"key": key,
	})
	.then(function(msg) {
		deferred.resolve(msg);
	})
	.catch(function(err) {
		deferred.reject(err);
	})

	return deferred.promise;
}

function renderCode() {
	var hotpKey;
}

exports.getKeys = function() {
	var keys = {},
		deferred = Q.defer();

	db.list('keys')
	.then(function(msg) {
		for(key in msg.body){
			//TODO: Create TOTP code based on key
		}
		deferred.resolve(msg.body);
	})
	.fail(function(err) {
		deferred.reject("Could not find any posts.");
	})
		
}

exports.localAuth = function(username, password) {
	var deferred = Q.defer(),
		userid = username.toUpperCase();

	db.select()
	.from('Users')
	.where({
		"userid": userid
	})
	.one()
	.then(function(msg) {
		if(msg){
			if (bcrypt.compareSync(password, msg.password)) {
				console.log("Correct password entered.");
				deferred.resolve(msg);
			}
			else {
				deferred.reject("That password was not correct.");
			}
		}
		else{
			deferred.reject("Could not find a user with that username.");
		}
	})
	.catch(function(err){
		deferred.reject("Database error.");
	})
}