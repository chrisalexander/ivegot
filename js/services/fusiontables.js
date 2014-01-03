ig.factory("fusionTables", ["$q", "$http", "google", "config",
	function($q, $http, google, config) {
    
	var doSql = function(sql) {
		// DERP http://stackoverflow.com/questions/20813123/response-varies-between-fusiontables-http-call-and-call-with-javascript-client-l
		/*return google.gapi().then(function(gapi) {
			return google.execute(gapi.client.fusiontables.query.sql({
				"sql": sql
			}));
		});*/
		return $http({
			"method": "GET",
			"url": "https://www.googleapis.com/fusiontables/v1/query",
			"params": {
				"sql": sql,
				"key": config.apiKey
			}
		});
	}

	var mapRow = function(cols, data) {
		var row = {};
		for (var i = 0; i < cols.length; i++) {
			var rowName = cols[i].toLowerCase();
			if (rowName == "rowid") {
				rowName = "_id";
			}
			row[rowName] = data[i];
		}
		return row;
	}

	var mapRows = function(responseData) {
		var data = [];
		if (!responseData.hasOwnProperty("rows")) {
			return data;
		}
		responseData.rows.map(function(row) {
			data.push(mapRow(responseData.columns, row));
		});
		return data;
	}

	var buildSelect = function(columns, table, whereConditions) {
		var sql = "SELECT " + columns.join(", ") + " from " + table;
		if (whereConditions) {
			var wheres = [];
			whereConditions.map(function(where) {
				var quote = where.val.match && where.val.match(/'/) ? "" : "'";
				wheres.push(where.col + " " + where.op + " " + quote + where.val + quote);
			});
			sql += " WHERE " + wheres.join(" AND ");
		}
		return sql + ";";
	}

	return {
		"sql": doSql,
		"mapRow": mapRow,
		"mapRows": mapRows,
		"buildSelect": buildSelect
	}
    
}]);