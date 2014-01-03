ig.factory("arg2arr", [
	function() {

	return function(args) {
		return Array.prototype.slice.call(args);
	}

}]);