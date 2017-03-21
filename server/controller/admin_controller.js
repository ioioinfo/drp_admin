const uu_request = require('../utils/uu_request');
var service_info = "ec order service";
var fs = require('fs-extra');
var eventproxy = require('eventproxy');
var service_info = "drp admin service";
var org_code = "ioio";
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
	//临时订单号
	var get_temp_order_no = function(cb){
		var url = "http://211.149.248.241:18011/get_temp_order_no?org_code=ioio&order_type=purchase_inbound"
		do_get_method(url,cb);
	};
	//生成订单号
	var generate_order_no = function(cb){
		var url = "http://211.149.248.241:18011/generate_order_no"
		var data = {
			org_code : "ioio",
			order_type : "purchase_inbound"
		};
		do_post_method(data,url,cb);
	};
	//读取导入eccel
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
	//保存采购单
	var save_purchase_orders = function(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark,cb){
		server.plugins['models'].purchase_orders.save_purchase_orders(purchase_id,purchased_person,pay_amount,total_sorts,total_number,pay_account,purchased_at,purchase_warehouse,status,supply_id,remark,function(err,results){
			cb(err,results);
		});
	};
	//保存采购单明细
	var save_purchase_detail = function(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number,cb){
		server.plugins['models'].purchase_orders_details.save_purchase_detail(purchase_id,product_id,purchase_price,wholesale_price,retail_price,unit,number,function(err,results){
			cb(err,results);
		});
	};
	//查询订单商品列表
	var search_order_products = function(order_id,cb){
		var url ="http://211.149.248.241:18010/search_order_products?order_id="+order_id;
		do_get_method(url,cb);
	};
	//获取所有订单
	var get_all_orders = function(params,cb){
		var url = "http://211.149.248.241:18010/get_all_orders?params="+params;
		do_get_method(url,cb);
	};
	//获取所有订单数量
	var get_all_num = function(params,cb){
		var url = "http://211.149.248.241:18010/get_all_num?params="+params;
		do_get_method(url,cb);
	};
	//获取所有门店
	var get_all_mendian = function(cb){
		var url = "http://211.149.248.241:19999/store/list?org_code="+org_code;
		do_get_method(url,cb);
	};
	//根据日期查询订单
	var get_orders_byDate = function(date1,date2,cb){
		var url = "http://211.149.248.241:18010/get_orders_byDate?date1=";
		url = url + date1 + "&date2=" + date2;
		do_get_method(url,cb);
	};
	//根据personids找昵称
	var get_person_avatar = function(person_ids, cb){
		var url = "http://139.196.148.40:18003/get_person_avatar?person_ids=";
		url = url + person_ids + "&scope_code=" +org_code;
		do_get_method(url,cb);
	};
	//订单支付信息
	var get_order_pay_infos = function(order_id,cb){
		var url = "http://139.196.148.40:18008/get_order_pay_infos?order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	};
	//查询单条订单
	var search_order_info = function(order_id,cb){
		var url = "http://211.149.248.241:18010/search_order_info?order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	};
	//查询单条订单明细
	var get_order_details = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_order_details?order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	};
	//查询mp订单列表
	var mp_orders_list = function(cb){
		var url = "http://211.149.248.241:18010/mp_orders_list";
		do_get_method(url,cb);
	};
	//mp 单条
	var get_order = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_order?order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	};
	//mp 订单明细
	var get_mp_order_details = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_mp_order_details?order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	};
	// 商品列表
	var get_products_list = function(cb){
		var url = "http://211.149.248.241:18002/get_products_list";
		do_get_method(url,cb);
	};
	// 商品列表
	var find_shantao_infos = function(product_ids,cb){
		var url = "http://211.149.248.241:18002/find_shantao_infos?product_ids="+product_ids;
		do_get_method(url,cb);
	};
	//查询产品信息
	var product_info = function(product_id,cb){
		var url = "http://211.149.248.241:18002/product_info?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};
	//通过商品id查找到商品
	var find_properties_by_product = function(product_id, cb){
		var url = "http://127.0.0.1:18002/find_properties_by_product?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};
	//通过商品id找到图片
	var find_pictures_byId = function(product_id, cb){
		var url = "http://127.0.0.1:18002/get_product_pictures?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};

	server.route([
		//订单主页
		{
			method: 'GET',
			path: '/order',
			handler: function(request, reply){
				return reply.view("order");
			}
		},
		//首页
		{
			method: 'GET',
			path: '/',
			handler: function(request, reply){
				return reply.view("homePage");
			}
		},
		//查询商品属性,图片
		{
			method: 'GET',
			path: '/search_product_detail',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				if (!product_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}

				var ep =  eventproxy.create("pictures","properties",
					function(pictures,properties){
						return reply({"success":true,"message":"ok","pictures":pictures,"properties":properties,"service_info":service_info});
				});

				find_pictures_byId(product_id,function(err,rows){
					if (!err) {
						ep.emit("pictures", rows.rows);
					}else {
						console.log(rows.message);
						ep.emit("pictures", []);
					}
				});

				find_properties_by_product(product_id,function(err,row){
					if (!err) {
						ep.emit("properties", row.properties);
					}else {
						console.log(rows.message);
						ep.emit("properties", []);
					}
				});
			}
		},

		//商品查询
		{
			method: 'GET',
			path: '/search_product_info',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				if (!product_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				product_info(product_id,function(err,row){
					if (!err) {
						var products = [];
						if (!row.row) {
							return reply({"success":false,"message":"没有查到数据","service_info":service_info});
						}
						products.push(row.row);
						return reply({"success":true,"message":"ok","products":products,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//商品列表
		{
			method: 'GET',
			path: '/get_products_list',
			handler: function(request, reply){
				get_products_list(function(err,rows){
					if (!err) {
						if (rows.success) {
							var products = rows.products;
							var product_ids = [];
							for (var i = 0; i < products.length; i++) {
								product_ids.push(products[i].id);
							}
							find_shantao_infos(JSON.stringify(product_ids),function(err,content){
								if (!err) {
									if (content.success) {
										var shantaos = content.rows;
										for (var i = 0; i < products.length; i++) {
											var product = products[i];
											for (var j = 0; j < shantaos.length; j++) {
												if (shantaos[j].product_id == product.id) {
													product.is_new = shantaos[j].is_new;
													product.row_materials = shantaos[j].row_materials;
													product.size_name = shantaos[j].size_name;
													product.batch_code = shantaos[j].batch_code;
												}
											}
											return reply({"success":true,"message":"ok","products":products,"service_info":service_info});
										}
									}else {
										return reply({"success":false,"message":content.message,"service_info":service_info});
									}
								}else {
									return reply({"success":false,"message":content.message,"service_info":service_info});
								}
							});
						}else {
							return reply({"success":false,"message":rows.message,"service_info":service_info});
						}
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//商品页面
		{
			method: 'GET',
			path: '/products_center',
			handler: function(request, reply){
				return reply.view("products_center");
			}
		},
		//mp订单明细
		{
			method: 'GET',
			path: '/get_mp_order_details',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				get_mp_order_details(order_id,function(err,row){
					if (!err) {
						return reply({"success":true,"message":"ok","details":row.details,"products":row.products,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//mp订单号查询
		{
			method: 'GET',
			path: '/get_order',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				get_order(order_id,function(err,row){
					if (!err) {
						return reply({"success":true,"message":"ok","orders":row.order,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//mp订单列表
		{
			method: 'GET',
			path: '/mp_orders_list',
			handler: function(request, reply){
				mp_orders_list(function(err,rows){
					if (!err) {
						return reply({"success":true,"message":"ok","orders":rows.orders,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//mp订单页面
		{
			method: 'GET',
			path: '/mp_order_center',
			handler: function(request, reply){
				return reply.view("mp_order_center");
			}
		},
		//pos 单条订单详情
		{
			method: 'GET',
			path: '/get_order_details',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":false,"message":"params is null","service_info":service_info});
				}
				get_order_details(order_id,function(err,row){
					if (!err) {
						if (row.success) {
							var order_details = row.order_details;
							var products = row.products;
							var pay_infos = row.pay_infos;
							if (!order_details) {
								return reply({"success":false,"message":"订单明细不存在！","service_info":service_info});
							}
							for (var i = 0; i < order_details.length; i++) {
								for (var j = 0; j < products.length; j++) {
									if (order_details[i].product_id == products[j].id) {
										order_details[i].product = products[j];
									}
								}
							}
							return reply({"success":true,"pay_infos":pay_infos,"order_details":order_details,"service_info":service_info});
						}else {
							return reply({"success":false,"message":row.message,"service_info":service_info});
						}
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//pos单条订单查询
		{
			method: 'GET',
			path: '/search_order_info',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":false,"message":"params is null","service_info":service_info});
				}
				search_order_info(order_id,function(err,row){
					if (!err) {
						if (row.success) {
							console.log("row:"+JSON.stringify(row));
							var orders = [];
							orders.push(row.order);
							return reply({"success":true,"row":orders,"service_info":service_info});
						}else {
							return reply({"success":false,"message":row.message,"service_info":service_info});
						}
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
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
			path: '/menu',
			handler: function(request, reply){
				return reply.view("menu");
			}
		},
		//订单页面
		{
			method: 'GET',
			path: '/order_center',
			handler: function(request, reply){
				return reply.view("order_center");
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
		//根据订单号查询订单商品
		{
			method: 'GET',
			path: '/search_order_infos',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":true,"message":"params is null","service_info":service_info});
				}
				var ep = eventproxy.create("order","order_details","pay_infos",
					function(order,order_details,pay_infos){
						console.log("123");
						return reply({"success":true,"order":order,"order_details":order_details,"pay_infos":pay_infos,"service_info":service_info});
				});
				search_order_products(order_id, function(err,row){
					console.log("row:"+JSON.stringify(row));
					if (!err) {
						if (row.success) {
							var order_details = row.order_details;
							var products = row.products;
							var order = row.order;
							order.store = row.store;
							for (var i = 0; i < order_details.length; i++) {
								for (var j = 0; j < products.length; j++) {
									if (order_details[i].product_id == products[j].id) {
										order_details[i].product = products[j];
									}
								}
							}
							ep.emit("order", order);
							ep.emit("order_details", order_details);
						}else {
							ep.emit("order", null);
							ep.emit("order_details", null);
						}
					}else {
						ep.emit("order", null);
						ep.emit("order_details", null);
					}
				});
				get_order_pay_infos(order_id, function(err,row){
					if (!err) {
						if (row.success) {
							var pay_infos = row.rows;
							console.log("pay_infos"+pay_infos);
							ep.emit("pay_infos", pay_infos);
						}else {
							ep.emit("pay_infos", null);
						}
					}else {
						ep.emit("pay_infos", null);
					}
				});

			}
		},
		//获取所有订单 及数量
		{
			method: 'POST',
			path: '/get_all_orders',
			handler: function(request, reply){
				var params = request.payload.params;
				if (!params) {
					return reply({"success":false,"message":"params wrong","service_info":service_info});
				}
				var ep =  eventproxy.create("orders","num","mendians",
					function(orders,num,mendians){
						for (var i = 0; i < orders.length; i++) {
							var order = orders[i];
							for (var j = 0; j < mendians.length; j++) {
								if (mendians[j].org_store_id == order.store_id) {
									order.org_store_name = mendians[j].org_store_name;
								}
							}
						}
					return reply({"success":true,"orders":orders,"num":num,"message":"ok"});
				});

				get_all_orders(params,function(err,rows){
					if (!err) {
						if (rows.success) {
							var orders = rows.rows;
							var person_ids = [];
							for (var i = 0; i < orders.length; i++) {
								person_ids.push(orders[i].person_id);
							}
							get_person_avatar(JSON.stringify(person_ids),function(err,content){
								if (!err) {
									if (content.success) {
										var persons = content.rows;
										for (var i = 0; i < persons.length; i++) {
											var person = persons[i];
											for (var j = 0; j < orders.length; j++) {
												if (person.person_id == orders[j].person_id) {
													orders[j].nickname = person.nickname;
												}
											}
										}
										for (var i = 0; i < orders.length; i++) {
											if (!orders[i].nickname) {
												orders[i].nickname = "无名氏";
											}
										}
										ep.emit("orders", orders);
									}else {
										ep.emit("orders", orders);
									}
								}else {
									ep.emit("orders", orders);
								}
							});
						}else {
							ep.emit("orders", []);
						}
					}else {
						ep.emit("orders", []);
					}
				});
				get_all_num(params,function(err,row){
					if (!err) {
						if (row.success) {
							var num = row.num;
							ep.emit("num", num);
						}else {
							ep.emit("num", 0);
						}
					}else {
						ep.emit("num", 0);
					}
				});
				get_all_mendian(function(err,rows){
					if (!err) {
						if (rows.success) {
							var mendians = rows.rows
							ep.emit("mendians", mendians);
						}else {
							ep.emit("mendians", []);
						}
					}else {
						ep.emit("mendians", []);
					}
				});


			}
		},
		//根据日期获取订单
		{
			method: 'GET',
			path: '/get_orders_byDate',
			handler: function(request, reply){
				var date1 = request.query.date1;
				var date2 = request.query.date2;
				get_orders_byDate(date1,date2,function(err,rows){
					if (!err) {
						if (rows.success) {
							console.log("rows:"+JSON.stringify(rows));
							return reply({"success":true,"rows":rows.rows,"service_info":service_info});
						}else {
						}
					}else {

					}
				});
			}
		},
		//会员页面
		{
			method: 'GET',
			path: '/member_center',
			handler: function(request, reply){
				return reply.view("member_center");
			}
		},
		//门店页面
		{
			method: 'GET',
			path: '/mendian_center',
			handler: function(request, reply){
				return reply.view("mendian_center");
			}
		},
	]);

    next();
};

exports.register.attributes = {
    name: 'admin_controller'
};
