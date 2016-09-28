var express = require('express'), //Basic web server functionality
  	exphbs = require('express-handlebars'), //Express with handlebars for page rendering
  	cookieParser = require('cookie-parser'), //Used to parse Cookies
  	bodyParser = require('body-parser'), // Used to parse request and response body
    methodOverride = require('method-override'), // HTTP method override (useful for REST)
    session = require('express-session'), //Session store handler and abstraction for Express.
    passport = require('passport'), // Authentication handling for Express.
    validator = require('validator'), //Basic validation of strings
    app = express(),
    LocalAuth = require('passport-local'); //The local authentication method

var funct = require('./functions.js'); // Functions file

//===============PASSPORT=================
// Passport session setup.
passport.serializeUser(function(user, done) {
  //Basic serialisation, not scalable but sufficient for testing.
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  //Basic deserialisation.
  done(null, obj);
});

passport.use('local-signin', new LocalAuth(
  {passReqToCallback : true}, //allows us to pass back the signin request to the callback
  function(req, username, password, done) {
    funct.localAuth(username, password)
    .then(function (user) {
      if (user) {
        //Successful login
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      else if (!user) {
        //Unsuccesful login
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null);
      }
    })
    .catch(function (err){
      //Catch error and print to console for debugging. Probably the database.
      console.log(err.body);
      done(null);
    });
  }
));

passport.use('local-signup', new LocalAuth( {passReqToCallback: true},
	function(req, username, password, done) {
		funct.checkNewUser(req)
		.then(function(){
      //Ran when user is valid.
			var email = req.body.email,
				forename = req.body.forename,
				surname = req.body.surname;
			funct.localReg(username, password, mobile)
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
			})
			.catch(function(err){
        //Catch unknown errors.
				req.session.error = err;
				done(null);
			})
		})
		.catch(function(err){
      // Print user input validation errors.
			req.session.error = err;
			done(null);
		})
	}
));

//Express middleware for various purposes
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'totp-testing', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
//Static files
app.use('/static', express.static(__dirname + '/static', { maxAge: 86400000 }));
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      user = req.user,
      success = req.session.success;

  //Remove errors from session, since they have now been shown.
  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  //Add to objects that are about to be rendered using Handlebars.
  if (err) res.locals.notice = err;
  if (user) res.locals.user = user;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.notice = success;

  next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main',
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============ROUTES=================
//displays our homepage
app.get('/', function(req, res){
  if (req.user){
    funct.getCodes()
    .then(function(){
      //Render page with codes.
    })
  }
  else{
    res.redirect('signin');
    //Show default page
    // res.render('home', {user: null});
  }
});

//Displays signin/signup page
app.get('/signin', function(req, res){
  res.render('signin');
});

//Sends requests to out passport stategies
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

// Route for adding a new key to the user's roster.
app.post('/addKey', function(req, res){
  var title = req.body.title,
      key = req.body.content,
      user = req.user;

  funct.addKey(title, key, user)
  .then(function(msg){
    req.session.success = msg;
    res.redirect('/');
  })
  .catch(function(err){
    req.session.error = err;
    res.redirect('/');
  })
})

//Sends request to passport strategy
app.post('/signin', passport.authenticate('local-signin', { 
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//Log out route, using passport's in-built logout method, and redirects user to the homepage.
app.get('/logout', function(req, res){
  var name = req.user.username;
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

//Listen for HTTP requests on port 80
var port = 80;
app.listen(port);
console.log("Lstening on port 80.");