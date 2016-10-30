$(document).on('click', '.generateCode', function(event){
	event.preventDefault();

	var keyID = this.name;

	$.ajax('/code/'+keyID)
	.done(function(code){
		console.log(code);
	})
});