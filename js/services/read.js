ig.factory("read", ["$rootScope", "keyStore",
	function($rootScope, keyStore) {

	var FILENAME = "read";

	var store = keyStore(FILENAME, "boolean");

	$rootScope.$on("signedIn", function() {
		store.resolve(true);
	});

	return {
		"markAsRead": function(id) {
			store.setTrue(id);
		},
		"isRead": function(ids) {
			var map = {};
			ids.map(function(id) {
				map[id] = store.get(id);
			});
			return map;
		}
	}

}]);