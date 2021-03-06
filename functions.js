var bcrypt = require('bcryptjs'), // Password Hashing with automated salting
	Q = require('q'), // Asynchronous request deferring, reducing reliance on node's callbacks
	validator = require('validator'), //Again, basic string validation
	orient = require('orientjs'),
	config = require('./config.js'),
	totp = require('./lib/totp.js');

// var message = require('./lib/messaging.js');
// message.sendMessage('+447495995614', 'hello');

try{
	// Try to make a connection to the database.
	var server = orient(config.databaseServer),
		db = server.use(config.database);

	console.log("Successfully connected to database.");
}
catch(e){
	// Case that the database connection failed.
	console.error(e);
}

/**
 * Functions module.
 * @module funct
 */


/**
* Function to validate the user object submitted by the client.
* @function validateUser
* @param {Object} user - The user object submitted by the client.
* @param {string} user.username - The username of the user.
* @param {string} user.password - The password for the user.
* @param {string} user.email - The user's email address.
* @param {string} user.forename - The user's forename.
* @param {string} user.surname - The user's surname.
* @returns {Promise} A promise representing either the rejected field or simply a true Boolean value if the user is valid.
*/
exports.validateUser = function(user){
	var response = Q.defer();
	var regExps = {
		username: /^[a-zA-Z]{4,10}$/,
		password: /^([a-zA-Z]|[0-9]){4,20}$/,
		email: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
		forename: /^[A-Z]{1}[a-z]{2,15}$/,
		surname: /^[A-Z]{1}[a-z]{2,15}$/,
		number: /^[0-9]{11}$/
	}

	// Increment through regex object, checking each field of the user object.
	for(field in regExps) {
		if(!regExps[field].test(user[field])) {
			response.reject(field);
		}
	}

	response.resolve(true); //Return true if checks are valid.

	return response.promise;
}

/**
* Function to register a new user, which in turns calls the validation function.
* Valid users are entered into the database.
* @function localReg
* @param {string} username - The username of the user to be added to the database.
* @param {string} password - The unhashed password of the user to be added to the database.
* @param {Object} userObject - The Object representing the user being added to the database.
* @param {string} user.username - The username of the user.
* @param {string} user.password - The password for the user.
* @param {string} user.email - The user's email address.
* @param {string} user.forename - The user's forename.
* @param {string} user.surname - The user's surname.
* @returns {Promise} A promise which either represents the database entry for the user, or a relevant error.
*/
exports.localReg = function(username, password, userObject) {
	//Local registration logic
	var deferred = Q.defer(), //Defer the function call
		username = username.toLowerCase(), // Capitalise username to remove issues with duplicate keys
		hash = bcrypt.hashSync(password, 8), // Hash password using bcrypt
		user = {
			"userid": username.toUpperCase(),
			"username": username,
			"password": password,
			"forename": userObject.forename,
			"surname": userObject.surname,
			"email": userObject.email,
			"number": userObject.number,
			"joined": Date.now()
		}; //User object for pushing to the database

	this.validateUser(user)
	.then(function(){
		user.password = hash;
		db.create('VERTEX', 'Users')
	    .set(user)
	    .one()
	    .then(function(vertex) {
	        deferred.resolve(vertex);
	    })
	    .error(function(error) {
	        deferred.reject("An error has occured.");
	    })
	})
	.fail(function(err){
		deferred.reject('There was an error with the inputted ' + err)
	})

	return deferred.promise;
}

/**
* A function for authenticating existing users to the application.
* @function localAuth
* @param {string} username - The username of the user trying to authenticate.
* @param {string} password - An unhashed version of the user's password.
* @returns {Promise} Returns either the user object, or an error relevant to the client.
*/
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

	return deferred.promise;
}

/**
* A function used to check the information that a client submits about a group.
* @function checkGroup
* @param {Object} group - The object representing a group.
* @param {string} group.name - The name of the group.
* @param {string} group.description - The description of the group.
* @param {integer} group.teamCount - Number of teams within the organisation.
* @param {integer} group.keyCount - Number of keys within the group.
* @param {integer} group.userCount - Number of users within the organisation.
* @param {integer} group.memberCount - Number of members within the team.
* @param {string} group.ownedBy - The entity (organisation or user) that owns the group.
*/

function checkGroup (group){
	var response = Q.defer();

	// Regular Expressions for GROUP fields
	var groupRegex = {
		name: /^[a-z A-Z.]{4,20}$/,
		description: /^[a-z A-Z.,]{4,140}$/,
		teamCount: /^[0-9]{0,9}$/,
		keyCount: /^[0-9]{0,9}$/,
		userCount: /^[0-9]{0,9}$/,
		memberCount: /^[0-9]{0,9}$/,
		ownedBy: /^[#]{1}[0-9]{1,6}:[0-9]{1,6}$/
	}

	for (key in group){
		// Check fields for regex validation
		if(!groupRegex[key].test(group[key])) {
			// Return field which was invalid.
			response.reject(key);
		}
	}
	response.resolve();

	return response.promise;
}

/**
* A function to create a new organisation
* @function createOrganisation
*/
exports.createOrganisation = function(organisation, user) {
	var response = Q.defer();
	// Coerce the form inputs into our standard organisation object.
	var organisation = {
		name: organisation.name,
		description: organisation.description,
		teamCount: 0,
		keyCount: 0,
		userCount: 0,
		memberCount: 0
	}

	checkGroup(organisation)
	.then(function(){
		// Database transaction, to ensure data integrity (No orphaned orgs)
		db.let('organisation', function(p){
		    p.create('VERTEX', 'Organisations')
		    .set(organisation)
	   	})
	   	.let('owns', function(c){
	  		c.create('EDGE', 'owns')
	     	.from(user['@rid'])
	     	.to('$organisation')
	     	.set()
		})
		.let('belongsTo', function(c){
	  		c.create('EDGE', 'belongsTo')
	     	.from(user['@rid'])
	     	.to('$organisation')
	     	.set()
		})
	   	.commit()
	   	.return('$organisation')
	   	.one()
	   	.then(function(org){
	   		// This should return the Organisation details.
	        response.resolve(org['@rid'].toString())
	    })
	    .error(function(error) {
	    	console.log(error);
	    	response.reject("Could not create organisation.");
	    })
	})
	.catch(function(field){
		response.reject("There was an issue with the inputted " + field + ".");
	})

	return response.promise;
}

exports.createTeam = function(team, user) {
	var response = Q.defer();
	// Coerce the form inputs into our standard group object.
	var team = {
		name: team.name,
		description: team.description,
		keyCount: 0,
		userCount: 0,
		memberCount: 0,
		ownedBy: team.ownedBy
	}

	checkGroup(team)
	.then(function(){
		db.query('SELECT FROM (SELECT EXPAND(out("owns")) FROM' 
		+ user['@rid']
		+ ') WHERE @rid='
		+ team.ownedBy)
		.then(function(authorised){
			console.log(authorised);
			if(authorised){
				// Database transaction, to ensure consistency
				db.let('team', function(p){
				    p.create('VERTEX', 'Teams')
				    .set(team)
			   	})
			   	.let('owns', function(c){
			  		c.create('EDGE', 'owns')
			     	.from(team.ownedBy)
			     	.to('$team')
			     	.set()
				})
			   	.commit()
			   	.return('$team')
			   	.one()
			   	.then(function(team){
			   		// This should return the team ID.
			        response.resolve(team['@rid'].toString());
			    })
			    .error(function(error) {
			    	response.reject("Could not create team.");
			    })
			}
			else{
				response.reject("You do not have permission to create a team in that organisation.");
			}
		})
		.catch(function(err){
			console.log(err);
			response.reject("Could not find that organisation.");
		})
	})
	.catch(function(field){
		response.reject("There was an error with the inputted " + field + ".");
	})

	return response.promise;
}

exports.getGroups = function(userRID, type) {
	var response = Q.defer();
	var res = {
		teams: [],
		organisations: []
	}
	var classQuery = (type == 'Organisations' || type == 'Teams') ? ' where @class = "' + type + '"' : '';
	db.query('select from (SELECT expand(OUT("belongsTo")) FROM ' + userRID + ')' + classQuery)
	.then(function(groups){
		for (group in groups) {
			group = groups[group];
			var groupRID = group['@rid'].toString();
			var reg = /[0-9]{1,}:[0-9]{1,}$/;
			var safeRID = groupRID.match(reg);
			group.rid = safeRID;
			(group['@class'] == 'Teams') ? res.teams.push(group) : res.organisations.push(group);
		}
		response.resolve(res);
	})
	.catch(function(err){
		console.log(err);
		response.reject("Couldn't get list of organisations.");
	})

	return response.promise;
}

exports.addKey = function(title, key, user) {
	var deferred = Q.defer();

	//TODO: Key input validation
	db.post('keys', {
		"title": title,
		"url": '',
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
		deferred.reject("Could not find any keys.");
	})
		
}

exports.getCode = function(keyRID, userRID) {
	var response = Q.defer();
	keyRID = '#'+keyRID;

	// Query to determine whether the user belongs to a group that has access to the key.
	db.query('select from (select expand(out("belongsTo").out("hasKey")) FROM'+ userRID +') where @rid = ' + keyRID + ' limit 1')
	.then(function(keys){
		if(keys[0]) {
			// Case that the user has access to the key.
			response.resolve(totp.generate(keys[0].secret));
		}
		else{
			response.reject("You do not have permission to access that key.");
		}
	})
	.catch(function(err){
		response.reject("Could not view permissions for that key.");
	})

	return response.promise;
}

exports.getGroup = function(groupRID, userRID) {
	var response = Q.defer();
	var reg = /[0-9]{1,}:[0-9]{1,}$/;
	rid = '#' + groupRID.match(reg);
	var res = {
		group: undefined,
		keys: undefined
	}

	db.query('SELECT FROM (SELECT EXPAND(out("belongsTo")) FROM' 
	+ userRID
	+ ') WHERE @rid='
	+ groupRID)
	.then(function(group){
		console.log(group);
		if(group[0]){
			res.group = group[0];
			db.query('select expand(out("hasKey")) from ' + rid)
			.then(function(keys){
				for (key in keys) {
					key = keys[key];
					var keyRID = key['@rid'].toString();
					var reg = /[0-9]{1,}:[0-9]{1,}$/;
					var safeRID = keyRID.match(reg);
					key.rid = safeRID;
				}
				res.keys = keys;
				response.resolve(res);
			})
			.catch(function(err){
				response.reject("Could not check permissions for that page.");
			})
		}
		else{
			response.reject("You do not have permission to view that page.");
		}
	})

    return response.promise;
}

function normaliseRID(RID, callback) {
    var regEx = /^(#[0-9]{1,5}:[0-9]{0,})/;

    if (RID) {
    	var match = regEx.exec(RID);
        if (match) {
            callback(null, RID);
        } else {
            var newRID = '#' + RID;
            // This handles RIDs in the format xx:yy
            if (regEx.exec(newRID)) {
            	// This follows the standard (err, response) format in node
                callback(null, newRID);
            } else {
                callback("Invalid RID", null);
            }
        }
    } else {
        callback("No RID provided", null);
    }
}

// log Database queries
db.on("beginQuery", function(obj) {
    console.log(obj);
});