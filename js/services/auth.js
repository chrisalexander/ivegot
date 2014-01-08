ig.factory("auth", ["$rootScope", "google", "config", "track",
	function($rootScope, google, config, track) {

	var authData = false;
	var user = false;

	var showSignin = false;

	var defaultScopes = [
		"https://www.googleapis.com/auth/plus.login",
		"https://www.googleapis.com/auth/userinfo.email",
		"https://www.googleapis.com/auth/drive.appdata",
		"https://www.googleapis.com/auth/youtube.readonly"
	]

	// Trigger the SignIn button to see if we have a user
	var doSignin = function(additionalScopes) {
		google.gapi().then(function(gapi) {
			var params = {
				"clientid": config.clientId,
				"cookiepolicy": "single_host_origin",
				"scope": defaultScopes.concat(additionalScopes).join(" "),
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
			}
			if (additionalScopes) {
				gapi.auth.signIn(params);
			} else {
				gapi.signin.render("signin", params);
			}
		});
	}
	doSignin();

	return {
		"user": function() {
			return user;
		},
		"showSignin": function() {
			return showSignin;
		},
		"doSignin": doSignin
	}

}]);