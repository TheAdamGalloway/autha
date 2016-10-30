var crypto = require('crypto');

// Integer to bytes
function intToBytes(num) {
	var bytes = [];

	// Iterate from last bit of the byte array to the first
	for(var i=7 ; i>=0 ; --i) {
		bytes[i] = num & (255);
		num = num >> 8;
	}

	return bytes;
}

// Hex to Byte Array
function hexToBytes(hex) {
	var bytes = [];

	for(var i = 0, j = hex.length; i < j; i += 2) {
		// Push converted integer onto byte Array.
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}

	return bytes;
}

exports.generate = function(key, steps) {
	// steps = number of steps between epoch and now
	var steps = steps || Math.floor((Date.now() / 1000) / 30);
	// Create an array of bytes
	var stepsBuffer = new Buffer(intToBytes(steps));
	// Use Node's inbuilt crypto library to create the HMAC.
	var hmac = crypto.createHmac('sha1', new Buffer(key));
	// Update the HMAC with the byte array and create a hex digest.
	var hexDigest = hexToBytes(hmac.update(stepsBuffer).digest('hex'));
	// Truncation
	var offset = hexDigest[19] & 0xf;

	var v = (hexDigest[offset] & 0x7f) << 24 |
		(hexDigest[offset + 1] & 0xff) << 16 |
		(hexDigest[offset + 2] & 0xff) << 8  |
		(hexDigest[offset + 3] & 0xff);

	// Modulus 1,000,000 and string coersion
	v = (v % 1000000) + '';

	// Return generated TOTP Code
	return Array(7-v.length).join('0') + v;
};

// Verify an inputted token against inputted key.
exports.verify = function(token, key) {
	// steps = number of steps between epoch and now
	var steps = Math.floor((Date.now() / 1000) / 30);
	// Number of steps either way to be lenient.
	var leniency = 50;
	// Now loop through from C to C + W to determine if there is
	// a correct code
	var minimum = steps - leniency;
	var maximum = steps + leniency;

	for(var newCount = minimum; newCount <=  maximum; ++newCount) {
		if(this.gen(key, newCount) === token) {
			// We have found a matching code, return offset
			return {offset: newCount - steps};
		}
	}
	// If we get to here then no codes have matched, return null
	return null;
};