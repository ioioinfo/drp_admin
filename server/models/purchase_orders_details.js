// var _ = require('lodash');
// var EventProxy = require('eventproxy');

var purchase_orders_details = function(server) {
	return {
		//根据采购单号查询详细
		search_detail_byId: function(purchase_id,cb){
			var query = `select purchase_id, product_id, purchase_price, wholesale_price,
				retail_price, unit, number, created_at, updated_at from purchase_orders_details where purchase_id =? and flag =0`;
			server.plugins['mysql'].pool.getConnection(function(err, connection) {
				connection.query(query, [purchase_id], function(err, results) {
					connection.release();
					if (err) {
						console.log(err);
						cb(true,results);
						return;
					}
					cb(false,results);
				});
			});
		},
		//保存详细订单
		save_purchase_detail : function(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number, cb) {
			var query = `insert into purchase_orders_details(purchase_id, product_id, purchase_price, wholesale_price,
				retail_price, unit, number, created_at, updated_at, flag)
			values
			(?,?,?,?,
		 	?,?,?,now(),now(),0)` ;
			console.log(query);
			var columns=[purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number];
			server.plugins['mysql'].pool.getConnection(function(err, connection) {
				connection.query(query, columns, function(err, results) {
					connection.release();
					if (err) {
						console.log(err);
						cb(true,results);
						return;
					}
					cb(false,results);
				});
			});
		},
		//批量
		save_purchase_details : function(purchase_details, cb) {
			var query = `insert into purchase_orders_details(purchase_id, product_id, purchase_price, wholesale_price,
				retail_price, unit, number, created_at, updated_at, flag)
			values ` ;
			var columns = [];
			for (var i = 0; i < purchase_details.length; i++) {
				if (i == purchase_details.length-1 ) {
					query = query + `(?,?,?,?,?,?,?,now(),now(),0)`;
				}else {
					query = query + `(?,?,?,?,?,?,?,now(),now(),0),`;
				}
				columns.push(purchase_details[i].purchase_id);
				columns.push(purchase_details[i].product_id);
				columns.push(purchase_details[i].purchase_price);
				columns.push(purchase_details[i].wholesale_price);
				columns.push(purchase_details[i].retail_price);
				columns.push(purchase_details[i].unit);
				columns.push(purchase_details[i].number);
			}
			server.plugins['mysql'].pool.getConnection(function(err, connection) {
				connection.query(query, columns, function(err, results) {
					connection.release();
					if (err) {
						console.log(err);
						cb(true,results);
						return;
					}
					cb(false,results);
				});
			});
		},
	};
};

module.exports = purchase_orders_details;
