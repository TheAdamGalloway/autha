var regExps = {
	username: /^[a-zA-Z]{4,10}$/,
	password: /^([a-zA-Z]|[0-9]){4,20}$/,
	email: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
	forename: /^[A-Z]{1}[a-z]{2,15}$/,
	surname: /^[A-Z]{1}[a-z]{2,15}$/,
	number: /^[0-9]{11}$/
}

$(document).on('click', '.generateCode', function(event){
	event.preventDefault();

	var keyID = this.name;

	$.ajax('/code/'+keyID)
	.done(function(code){
		console.log(code);
	})
});

function validateForm(formName){
	console.log(document[formName]);
	for (var field in document[formName]) {
		console.log("hello");
	}
	return false;
}