// var _ = require('lodash');
// var EventProxy = require('eventproxy');

var purchase_orders = function(server) {
	return {
		//根据采购id查询商品
		search_purchaseId: function(purchase_id,cb){
			var query = `select purchase_id, purchased_person, pay_amount, total_sorts, total_number, pay_account,
			purchased_at, purchase_warehouse, status, supply_id, remark, from orders where purchase_id =? and flag =0`;
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
		//保存订单
		save_purchase_orders : function(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark, cb) {
			var query = `insert into purchase_orders(purchase_id, purchased_person, pay_amount, total_sorts, total_number,
			pay_account, purchased_at,purchase_warehouse, status, supply_id, remark, created_at, updated_at, flag)
			values
			(?,?,?,?,?,
		 	?,now(),?,?,?,?,
			now(),now(),0)` ;
			console.log(query);
			var columns=[purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark];
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

module.exports = purchase_orders;
