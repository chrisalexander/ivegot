window.hasGoogleLoaded = false;
window.googleLoaded = function() {
	window.hasGoogleLoaded = true;
	if (angular) {
		var scope = angular.element("html").scope();
		if (scope) {
			scope.$broadcast("googleLoaded", window.gapi);
		}
	}
}