var client = require('twilio')('AC3342a96a97d91b0f66ac93687b551141', '6396fd5b51d7661489fbb2d645893495');

exports.sendMessage = function(to, message) {
	//Send an SMS text message
	client.sendMessage({
	    to: to, // Any number Twilio can deliver to
	    from: '+447946814884', // A number you bought from Twilio and can use for outbound communication
	    body: 'word to your mother.' // body of the SMS message

	}, function(err, responseData) { //this function is executed when a response is received from Twilio

	    if (!err) { // "err" is an error received during the request, if any

	        // "responseData" is a JavaScript object containing data received from Twilio.
	        // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
	        // http://www.twilio.com/docs/api/rest/sending-sms#example-1

	        console.log(responseData.from); // outputs "+14506667788"
	        console.log(responseData.body); // outputs "word to your mother."

	    }
	});
}