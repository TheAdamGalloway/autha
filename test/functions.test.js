var chai = require('chai');
var asPromised = require('chai-as-promised');
var functions = require('../functions.js');
// var expect = chai.expect; // we are using the "expect" style of Chai
chai.use(asPromised);
chai.should(); // Don't ask

describe('checkNewUser', function() {
	var testUser = {
		username: "test",
		password: "TestPassword123",
		email: "test@test.com",
		forename: "Foo",
		surname: "Bar",
		number: "07123456789"
	};

	it('should validate test user', function() {
		return functions.checkNewUser(testUser).should.eventually.be.true;
	});
	it('should return errors on invalid data', function() {
		testUser.username = "InvalidUsernameTooLong";
		return functions.checkNewUser(testUser).should.eventually.be.rejected;
	});
	it('should handle blank values', function() {
		// Null values aren't possible due to the way forms are handled
		testUser.username = '';
		return functions.checkNewUser(testUser).should.eventually.be.rejected;
	});
	it('should handle multiple invalid values', function () {
		testUser.username = 'mkcfmkelckfekcmemckekkc';
		testUser.password = '1234';
		return functions.checkNewUser(testUser).should.eventually.be.rejected;
	});
});

describe('localReg', function(){
	it('should successfully allow a new registration', function(done) {
		var username = "test",
			password = "P4ssw0rd";
		var testUserObject = {
			forename: 'Test',
			surname: 'User',
			email: 'test@test.com',
			number: '07123456789'
		};

		var rid = '';

		functions.localReg(username, password, testUserObject)
		.then(function(msg){
			rid = msg['@rid'];
			msg.should.be.a('object');
			msg.should.be.json;
			done();
			cleanup(rid);
		})
		.catch(function(err){

		})
	})
})

function cleanup (rid) {
	functions.delete(rid)
	.then(function(msg) {
		console.log(msg);
	})
}