ig.factory("auth", ["$rootScope", "google", "config", "track",
	function($rootScope, google, config, track) {

	var authData = false;
	var user = false;

	var showSignin = false;

	// Trigger the SignIn button to see if we have a user
	google.gapi().then(function(gapi) {
		gapi.signin.render("signin", {
			"clientid": config.clientId,
			"cookiepolicy": "single_host_origin",
			"scope": [
				"https://www.googleapis.com/auth/plus.login",
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/drive.appdata",
				"https://www.googleapis.com/auth/youtube.readonly"
			].join(" "),
			"callback": function(data) {
				if (data.status.signed_in) {
					authData = data;
					google.execute(gapi.client.plus.people.get({
						"userId": "me"
					})).then(function(userData) {
						user = userData;
						track.user(user.emails[0].value, user.displayName, user.image.url);
						$rootScope.$broadcast("signedIn", user);
					});
				} else {
					showSignin = true;
					$rootScope.$broadcast("showSignin");
				}
			}
		});
	});

	return {
		"user": function() {
			return user;
		},
		"showSignin": function() {
			return showSignin;
		}
	}

}]);