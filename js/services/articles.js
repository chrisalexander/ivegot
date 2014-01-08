ig.factory("articles", ["$q", "config", "arg2arr", "fusionTables",
	function($q, config, arg2arr, fusionTables) {

	var columns = [
		"ROWID",
		"Location",
		"Published",
		"Title",
		"Summary",
		"Link",
		"Image",
		"Time",
		"Type"
	];

	var doGet = function() {
		var ids = arg2arr(arguments);
		var promises = [];
		ids.map(function(id) {
			promises.push(fusionTables.sql(fusionTables.buildSelect(columns, config.tables.articles, [
				{ "col": "ROWID", "op": "=", "val": id }
			])));
		});
		return $q.all(promises);
	}

	var doFind = function(minTime, maxTime, type) {
		var conditions = [];
		if (minTime) {
			conditions.push({ "col": "Time", "op": ">", "val": minTime });
		}
		if (maxTime) {
			conditions.push({ "col": "Time", "op": "<", "val": maxTime });
		}
		if (type) {
			conditions.push({ "col": "Type", "op": "=", "val": type });
		}
		return fusionTables.sql(fusionTables.buildSelect(columns, config.tables.articles, conditions)).then(function(data) {
			return fusionTables.mapRows(data.data);
		});
	}

	var findByUrl = function(urls) {
		var conditions = [{ "col": "Link", "op": "IN", "val": urls }];
		return fusionTables.sql(fusionTables.buildSelect(columns, config.tables.articles, conditions)).then(function(data) {
			return fusionTables.mapRows(data.data);
		});
	}

	var create = function(obj) {
		return fusionTables.sql(fusionTables.buildInsert(config.tables.articles, obj), true);
	}

	var createBulk = function(objs) {
		return fusionTables.bulkUpload(config.tables.articles, columns.slice(1), objs);
	}

	return {
		"get": doGet,
		"find": doFind,
		"urls": findByUrl,
		"create": create,
		"createBulk": createBulk
	}

}]);