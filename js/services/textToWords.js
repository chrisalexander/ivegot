ig.service("textToWords", [
	function() {

	return function(text) {
		if (!text) {
			return [];
		}
		// Lol normalise
		return text.toLowerCase()
			// HTML tags
			.replace(/\<.+?\>/g, " ")
			// Encoded characters (e.g. &amp;)
			.replace(/&.+?;/g, " ")
			// URLs
			.replace(/[a-z]+:\/\/[^\s]+/g, "")
			// Any weird characters
			.replace(/[^a-z ]/g, "")
			// Any double spaces
			.replace(/(\s)+/g, " ")
			// Extra space
			.trim()
			// Array
			.split(" ");
	}

}]);