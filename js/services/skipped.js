ig.factory("skipped", ["$rootScope", "keyStore",
	function($rootScope, keyStore) {

	var FILENAME = "skipped";

	var store = keyStore(FILENAME, "boolean");

	$rootScope.$on("signedIn", function() {
		store.resolve(true);
	});

	return {
		"markAsSkipped": function(id) {
			store.setTrue(id);
		},
		"isSkipped": function(ids) {
			var map = {};
			ids.map(function(id) {
				map[id] = store.get(id);
			});
			return map;
		}
	}

}]);