const uu_request = require('../utils/uu_request');
var service_info = "ec order service";
var fs = require('fs-extra');

if(typeof require !== 'undefined') XLSX = require('xlsjs');

var do_get_method = function(url,cb){
	uu_request.get(url, function(err, response, body){
		if (!err && response.statusCode === 200) {
			var content = JSON.parse(body);
			cb(false, content);
		} else {
			cb(true, null);
		}
	});
};
var do_post_method = function(data,url,cb){
	uu_request.request(url, data, function(err, response, body) {
		console.log(body);
		if (!err && response.statusCode === 200) {
			cb(false,body);
		} else {
			cb(true,null);
		}
	});
};
exports.register = function(server, options, next){
	var get_temp_order_no = function(cb){
		var url = "http://211.149.248.241:18011/get_temp_order_no?org_code=ioio&order_type=purchase_inbound"
		do_get_method(url,cb);
	};
	var generate_order_no = function(cb){
		var url = "http://211.149.248.241:18011/generate_order_no"
		var data = {
			org_code : "ioio",
			order_type : "purchase_inbound"
		};
		do_post_method(data,url,cb);
	};
	var read_purchase_excel = function(path, reply) {
		generate_order_no(function(err,row){
			if (!err) {
				var workbook = XLSX.readFile(path);
				// return reply({"success":false,"row":row.order_no,"service_info":service_info});
				var purchase_id = row.order_no;
				var first_sheet_name = workbook.SheetNames[0];
				var worksheet = workbook.Sheets[first_sheet_name];
				var rows = [];
				for (z in worksheet) {
					if(z[0] === '!') continue;

					var cell = XLSX.utils.decode_cell(z);
					var r = cell.r;
					var c = cell.c;

					var row = {};
					if (rows.length > r) {
						row = rows[r];
					} else {
						rows.push(row);
					}
					row[c] = worksheet[z].v;
				}
				console.log(rows);

				var remark = rows[0]["1"];
				var purchased_person =  rows[1]["1"];
				var pay_amount =  rows[2]["1"];
				var total_sorts = rows[3]["1"];
				var total_number =  rows[4]["1"];
				var pay_account =  rows[5]["1"];
				var purchased_at = rows[6]["1"];
				var purchase_warehouse = rows[7]["1"];
				var status = rows[8]["1"];
				var supply_id =  rows[9]["1"];

				if (!purchase_id || !purchased_person || !pay_amount || !total_sorts || !total_number|| !pay_account|| !purchased_at|| !purchase_warehouse|| !status|| !supply_id|| !remark) {
					return reply({"success":false,"message":"order params wrong","service_info":service_info});
				}

				save_purchase_orders(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark,function(err,results){
					if (results.affectedRows>0) {
						for (var i = 0; i < rows.length; i++) {
							if (i>12) {
								var product_id = rows[i]["0"];
								var purchase_price = rows[i]["1"];
								var wholesale_price = rows[i]["2"];
								var retail_price = rows[i]["3"];
								var unit = rows[i]["4"];
								var number = rows[i]["5"];
								if (!product_id|| !purchase_price|| !wholesale_price|| !retail_price|| !unit|| !number) {
									return reply({"success":false,"message":"order detail params wrong","service_info":service_info});
								}
								save_purchase_detail(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number, function(err,results){
									if (results.affectedRows>0) {
									}else {
										return reply({"success":false,"message":"save order wrong","service_info":service_info});
									}
								});
							}
						}
						return reply({"success":true,"row":purchase_id,"service_info":service_info});
					}
				});
			}else {
				return reply({"success":false,"message":"generate_order_no wrong","service_info":service_info});
			}
		});
	};
	var save_purchase_orders = function(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark,cb){
		server.plugins['models'].purchase_orders.save_purchase_orders(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark,function(err,results){
			cb(err,results);
		});
	};
	var save_purchase_detail = function(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number,cb){
		server.plugins['models'].purchase_orders_details.save_purchase_detail(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number,function(err,results){
			cb(err,results);
		});
	};
	server.route([
		//创建临时订单号
		{
			method: 'GET',
			path: '/create_temp_orderId',
			handler: function(request, reply){
				get_temp_order_no(function(err,row){
					if (!err) {
						if (row.success) {
							return reply({"success":true,"row":row.order_no,"service_info":service_info});
						}else {
							return reply({"success":false,"message":"get temp_id wrong","service_info":service_info});
						}
					}else {
						return reply({"success":false,"message":"get temp_id wrong","service_info":service_info});
					}
				});
			}
		},
		//菜单页
		{
			method: 'GET',
			path: '/',
			handler: function(request, reply){
				return reply.view("menu");
			}
		},
		//保存采购订单及详情
		{
			method: 'GET',
			path: '/create_purchase_order',
			handler: function(request, reply){
				read_purchase_excel('purchase_order.xls', reply);
			}
		},
		//处理上传文件
		{
			method: 'POST',
			path: '/upload',
			config: {
	            payload: {
	               output: 'file',
	               maxBytes: 209715200,
	               parse: true //or just remove this line since true is the default
	            },
	            handler:function (request, reply) {
					var path = request.payload.file.path;
					console.log('fileUpload path : ' + path);
					read_purchase_excel(path, reply);
	            }
			},
		},

	]);

    next();
};

exports.register.attributes = {
    name: 'admin_controller'
};
