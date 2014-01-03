ig.factory("track", ["$window",
	function($window) {

	var trackUser = function(email, name, avatar) {
		var uObj = {
			"email": email,
			"name": name,
			"avatar": avatar
		}
		console.log("Track user event", uObj);
		$window.woopra.identify(uObj).push();
	}

	var trackEvent = function(name, details) {
		console.log("Track custom event", name, details);
		$window.woopra.track(name, details);
	}

	return {
		"user": trackUser,
		"event": trackEvent
	}

}]);