var express = require('express'), //Basic web server functionality
		exphbs = require('express-handlebars'), //Express with handlebars for page rendering
		cookieParser = require('cookie-parser'), //Used to parse Cookies
		bodyParser = require('body-parser'), // Used to parse request and response body
		methodOverride = require('method-override'), // HTTP method override (useful for REST)
		session = require('express-session'), //Session store handler and abstraction for Express.
		passport = require('passport'), // Authentication handling for Express.
		validator = require('validator'), // Basic validation of strings
		app = express(),
		LocalAuth = require('passport-local'); //The local authentication method
var funct = require('./functions.js'); // Functions file

//===============PASSPORT=================
// Passport session setup.
passport.serializeUser(function(user, done) {
	// Serialise the whole user object. 
	// I have done it like this because
	// I am not storing much data about each user
	// The only downside is that if a user has multiple active sessions, there may be consistency issues
	done(null, user);
});
passport.deserializeUser(function(obj, done) {
	//Basically just pass the user object as the deserialised session.
	done(null, obj);
});
passport.use('local-signin', new LocalAuth({
	passReqToCallback: true
}, // Pass back the signin request to the callback
	function(req, username, password, done) {
		funct.localAuth(username, password).then(function(user) {
			if (user) {
				//Successful login
				req.session.success = 'It\'s good to see you again, ' + user.forename + '.';
				done(null, user);
			} else if (!user) {
				//Unsuccessful login
				req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
				done(null);
			}
		}).catch(function(err) {
			//Catch error and print to console for debugging. Typically a database error.
			console.log(err.body);
			done(null);
		});
}));
passport.use('local-signup', new LocalAuth({
	passReqToCallback: true
}, function(req, username, password, done) {
	var user = req.body;
	funct.localReg(username, password, user)
	.then(function(user) {
		if (user) {
			//Successful registration
			req.session.success = "You are now registered and logged in.";
			done(null, user);
		}
		if (!user) {
			// Case that username is already used.
			req.session.error = "That username is already in use, try again.";
			done(null, user);
		}
	}).catch(function(err) {
		//Catch validation errors.
		req.session.error = err;
		done(null);
	})
}));
//Express middleware for various purposes
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
	secret: 'autha is cool',
	saveUninitialized: true,
	resave: true
}));
app.use(passport.initialize());
//Static files
app.use('/static', express.static(__dirname + '/static', {
	maxAge: 86400000
}));
app.use(passport.session());
// Session-persisted message middleware
app.use(function(req, res, next) {
	var err = req.session.error,
		success = req.session.success,
		user = req.user;
	// Remove errors from session, since they have now been shown.
	delete req.session.error;
	delete req.session.success;
	// Add to objects that are about to be rendered using Handlebars.
	if (err) res.locals.error = err;
	if (success) res.locals.success = success;
	if (user) res.locals.user = user;
	next();
});
// Configure express to use handlebars templates
var hbs = exphbs.create({
	defaultLayout: 'main',
	helpers: {
        // Comparison helper
        ifCond: function(first, operator, second, options) {
            switch (operator) {
                case '==':
                    return (first == second) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (first !== second) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (first === second) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (first < second) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (first <= second) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (first > second) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (first >= second) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (first && second) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (first || second) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============ROUTES=================
//GET: Displays our homepage
app.get('/', function(req, res) {
	if (req.user) {
		funct.getGroups(req.user['@rid'])
		.then(function(groups){
			res.render('home', {
				title: 'Home',
				organisations: groups.organisations,
				teams: groups.teams
			})
		})
		.catch(function(err){
			console.log(err);
			req.session.error = "Couldn't get a list of organisations and teams that you belong to.";
			res.render('home', {
				home: 'active',
				title: 'Home'
			})
		})
	} else {
		res.redirect('signin');
		//Show default page
		// res.render('home', {user: null});
	}
});

/*--------Signin/Signup Routing-------------*/
//GET: Displays signin page
app.get('/signin', function(req, res) {
	res.render('signin');
});
//GET: Displays signup page
app.get('/signup', function(req, res) {
	res.render('signup');
});
//POST: Sends request to passport strategy
app.post('/signin', passport.authenticate('local-signin', {
	failureRedirect: '/signin'
}), function(req, res, next) {
	if (req.session.return_to) {
		var returnTo = req.session.return_to;
		delete req.session.return_to;
		// Return user to the page they were trying to access
		res.redirect(returnTo);
	} else {
		res.redirect('/');
	}
});
//Sends requests to out passport stategies
app.post('/signup', passport.authenticate('local-signup', {
	failureRedirect: '/signin'
}), function(req, res, next) {
	if (req.session.return_to) {
		var returnTo = req.session.return_to;
		delete req.session.return_to;
		// Return user to the page they were trying to access
		res.redirect(returnTo);
	} else {
		res.redirect('/');
	}
});
// Logout route, using passport's in-built logout method, and redirects user to the homepage.
app.get('/logout', ensureAuthenticated, function(req, res) {
	req.logout();
	req.session.success = "You have successfully been logged out.";
	res.redirect('/');
});

/*-----------------Standard Structure Routes ------------------*/

// ORGANISATIONS API
// Route for getting a list of organisations that the user belongs to.
app.get('/organisations', ensureAuthenticated, function(req, res){
	funct.getGroups(req.user['@rid'], 'Organisations')
	.then(function(msg){
		res.render('organisations', {
			title: 'Organisations',
			organisations: msg.organisations
		})
	})
	.catch(function(err){
		req.session.error = err;
		res.redirect('/');
	})
});
// New group
app.get('/organisations/new', ensureAuthenticated, function(req, res){
	funct.getGroups(req.user['@rid'], 'Organisations')
	.then(function(organisations){
		console.log(organisations);
		res.render('organisations/new', {
			groups: organisations
		});
	})
	.catch(function(err){
		req.session.error = "Couldn't find relevant organisations.";
		res.render('newgroup');
	})
});
// Route for getting information about a specific organisation.
app.get('/organisations/:orgRID', ensureAuthenticated, function(req, res){
	var RID = req.params.orgRID;

	funct.getGroup(RID, req.user['@rid'])
	.then(function(response){
		res.render('organisations/organisation', {
			isAdmin: true,
			title: 'Organisations',
			organisation: response.group,
			keys: response.keys
		})
	})
	.catch(function(err){
		req.session.error = err;
		res.redirect('/organisations');
	})
});
// Creating a new organisation.
app.post('/organisations', ensureAuthenticated, function(req, res) {
	funct.createOrganisation(req.body, req.user)
	.then(function orgSuccess(orgRID) {
		var reg = /[0-9]{1,}:[0-9]{1,}$/;
		var safeRID = orgRID.match(reg);

		req.session.success = "Successfully created organisation.";
		res.redirect('/organisations/' + safeRID);
	})
	.catch(function newOrgFail(err) {
		req.session.error = err;
		res.redirect('/newgroup');
	})
});

// TEAMS API
// Route for getting a list of organisations that the user belongs to.
app.get('/teams', ensureAuthenticated, function(req, res){
	funct.getGroups(req.user['@rid'], 'Teams')
	.then(function(msg){
		res.render('teams', {
			title: 'Teams',
			teams: msg.teams
		})
	})
	.catch(function(err){
		req.session.error = err;
		res.redirect('/');
	})
});
app.get('/teams/new', ensureAuthenticated, function(req, res){
	res.render('teams/new');	
});
app.get('/teams/:teamID', ensureAuthenticated, function(req, res){
	var RID = req.params.teamID;
	
	funct.getGroup(RID, req.user['@rid'])
	.then(function(response){
		res.render('teams/team', {
			title: 'Teams',
			team: response.group,
			keys: response.keys
		})
	})
});
app.post('/teams', ensureAuthenticated, function(req, res) {
	funct.createTeam(req.body, req.user)
	.then(function teamSuccess(teamRID) {
		var reg = /[0-9]{1,}:[0-9]{1,}$/;
		var safeRID = teamRID.match(reg);

		req.session.success = "Successfully created team.";
		res.redirect('/teams/' + safeRID);
	})
	.catch(function newTeamFail(err) {
		req.session.error = err;
		res.redirect('/newgroup');
	})
});

// CODES API
app.get('/code/:keyID', ensureAuthenticated, function(req, res){
	var keyID = req.params.keyID;

	funct.getCode(keyID, req.user['@rid'])
	.then(function(code){
		res.status(200).send(code);
	})
	.catch(function(err){
	})
});

app.get('*', function(req, res){
	req.session.error = "Page not found.";
	res.redirect('/');
})

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		// Store page they were trying to access
		req.session.return_to = req.originalUrl;
		req.session.error = "You must be logged in to view this page.";
		res.redirect('/signin');
	}
}
//Listen for HTTP requests on port 80
var port = 80;
app.listen(port);
console.log("Lstening on port " + port + ".");
// Notice the type coercion above. Javascript simply coerces the integer into a string.