ig.factory("keywords", ["$q", "config", "arg2arr", "fusionTables",
	function($q, config, arg2arr, fusionTables) {

	var columns = [
		"ROWID",
		"ArticleID",
		"Keyword"
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

	var getByArticle = function(articles) {
		var conditions = [];
		if (articles && articles.length) {
			conditions.push({ "col": "ArticleID", "op": "IN", "val": "('" + articles.join("', '") + "')" });
		}
		return fusionTables.sql(fusionTables.buildSelect(columns, config.tables.keywords, conditions)).then(function(data) {
			return fusionTables.mapRows(data.data);
		});
	}

	return {
		"get": doGet,
		"getByArticle": getByArticle
	}

}]);