const uu_request = require('../utils/uu_request');
var service_info = "ec order service";
var fs = require('fs-extra');
var eventproxy = require('eventproxy');
var service_info = "drp admin service";
var org_code = "ioio";
var platform_code = "ioio";
if(typeof require !== 'undefined') XLSX = require('xlsjs');

var do_get_method = function(url,cb){
	uu_request.get(url, function(err, response, body){
		if (!err && response.statusCode === 200) {
			var content = JSON.parse(body);
			do_result(false, content, cb);
		} else {
			cb(true, null);
		}
	});
};
//所有post调用接口方法
var do_post_method = function(url,data,cb){
	uu_request.request(url, data, function(err, response, body) {
		console.log(body);
		if (!err && response.statusCode === 200) {
			do_result(false, body, cb);
		} else {
			cb(true,null);
		}
	});
};
//处理结果
var do_result = function(err,result,cb){
	if (!err) {
		if (result.success) {
			cb(false,result);
		}else {
			cb(true,result);
		}
	}else {
		cb(true,null);
	}
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
	//门店列表
	var store_list = function(cb){
		var url = "http://211.149.248.241:19999/store/list"+org_code;
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
		var url = "http://211.149.248.241:18002/find_properties_by_product?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};
	//通过商品id找到图片
	var find_pictures_byId = function(product_id, cb){
		var url = "http://211.149.248.241:18002/get_product_pictures?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};
	//复杂的产品保存
	var save_product_complex = function(data,cb){
		var url = "http://211.149.248.241:18002/save_product_complex";
		do_post_method(url,data,cb);
	}
	//新增产品
	var add_product = function(data,cb){
		var url = "http://211.149.248.241:18002/add_product";
		do_post_method(url,data,cb);
	}
	//保存库存接口
	var save_product_inventory = function(data,cb){
		var url = "http://211.149.248.241:18002/save_product_inventory";
		do_post_method(url,data,cb);
	}
	//读取，保存库存
	var read_inventory_excel = function(path, reply) {
		var workbook = XLSX.readFile(path);
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
		var inventory = [];
		for (var i = 0; i < rows.length; i++) {
			var leng = rows.length;
			if(leng >101){
				return reply({"success":false,"message":"over 100"});
			};
			if (i == 0) {
				if (rows[i]["16"] != "数量（实际）") {
					return reply({"success":false,"message":rows[i]["16"]+": form wrong"});
				}else if (rows[i]["0"] != "货号") {
					return reply({"success":false,"message":rows[i]["0"]+": form wrong"});
				}else if (rows[i]["15"] != "尺寸/尺码") {
					return reply({"success":false,"message":rows[i]["0"]+": form wrong"});
				}
			}
			if (i>0) {
				var quantity = rows[i]["16"];
				var product_id = rows[i]["0"];
				var size_name = rows[i]["15"];
				var data = {"quantity":quantity,"product_id":product_id,"size_name":size_name};
				inventory.push(data);
			}
			for (var i = 0; i < inventory.length; i++) {
				if (!inventory[i].product_id || !inventory[i].quantity) {
					return reply({"success":false,"message":"第"+(i+2)+"行"+" params null!!"});
				}
				var re = /^[0-9]*$/;
				if (!re.test(inventory[i].quantity)) {
					return reply({"success":false,"message":"第"+(i+2)+"行"+" params null!!"});
				}
			}
		}
		var data = {"inventory":JSON.stringify(inventory)};
		save_product_inventory(data,function(err,result){
			if (!err) {
				return reply({"success":true,"message":"ok","success_num":result.success_num,"no_products":result.no_products,"fail_num":result.fail_num,"repeat_products":result.repeat_products,"save_fail":result.save_fail});
			}else {
				return reply({"success":false,"message":result.message});
			}
		});

	};
	//读取，保存商品
	var read_product_excel = function(path, reply) {
		var workbook = XLSX.readFile(path);
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
		var products = [];
		for (var i = 0; i < rows.length; i++) {
			//长度
			var leng = rows.length;
			if(leng >101){
				return reply({"success":false,"message":"over 100"});
			};
			if (i==0) {
				if (rows[i]["0"] != "货号") {
					return reply({"success":false,"message":rows[i]["0"]+": form wrong"});
				}else if (rows[i]["1"] != "商品名称") {
					return reply({"success":false,"message":rows[i]["1"]+": form wrong"});
				}else if (rows[i]["2"] != "价格") {
					return reply({"success":false,"message":rows[i]["2"]+": form wrong"});
				}else if (rows[i]["3"] != "原价") {
					return reply({"success":false,"message":rows[i]["3"]+": form wrong"});
				}else if (rows[i]["4"] != "分类编号") {
					return reply({"success":false,"message":rows[i]["4"]+": form wrong"});
				}else if (rows[i]["5"] != "品牌") {
					return reply({"success":false,"message":rows[i]["5"]+": form wrong"});
				}else if (rows[i]["6"] != "描述") {
					return reply({"success":false,"message":rows[i]["6"]+": form wrong"});
				}else if (rows[i]["7"] != "上架时间（开始时间）") {
					return reply({"success":false,"message":rows[i]["7"]+": form wrong"});
				}else if (rows[i]["8"] != "颜色") {
					return reply({"success":false,"message":rows[i]["8"]+": form wrong"});
				}else if (rows[i]["9"] != "重量") {
					return reply({"success":false,"message":rows[i]["9"]+": form wrong"});
				}else if (rows[i]["10"] != "有效期") {
					return reply({"success":false,"message":rows[i]["10"]+": form wrong"});
				}else if (rows[i]["11"] != "扫码（货号+_字母）") {
					return reply({"success":false,"message":rows[i]["11"]+": form wrong"});
				}else if (rows[i]["12"] != "成色") {
					return reply({"success":false,"message":rows[i]["12"]+": form wrong"});
				}else if (rows[i]["13"] != "材质") {
					return reply({"success":false,"message":rows[i]["13"]+": form wrong"});
				}else if (rows[i]["14"] != "捐赠批次") {
					return reply({"success":false,"message":rows[i]["14"]+": form wrong"});
				}else if (rows[i]["15"] != "尺寸/尺码") {
					return reply({"success":false,"message":rows[i]["15"]+": form wrong"});
				}
			}
			if (i>0) {
				//3个主要字段, 1.行一条格式判断，匹配  2.数据长度操作 100条以上报错，2.取出所有数据，存数组，循环判断非空，格式判断，价格，
				//将所有报错失败的数据，保存到数组，一起提示，已经存在提示，
				var product_id = rows[i]["0"];
				var product_name = rows[i]["1"];
				var product_sale_price = rows[i]["2"];
				var product_marketing_price = rows[i]["3"];
				//8个次要字段
				var sort_id = rows[i]["4"];
				var product_brand = rows[i]["5"];
				var product_describe = rows[i]["6"];
				var time_to_market = rows[i]["7"];
				var color = rows[i]["8"];
				var weight = rows[i]["9"];
				var guarantee = rows[i]["10"];
				var barcode = rows[i]["11"];
				// 4个行业属性字段
				var is_new = rows[i]["12"];
				var row_materials = rows[i]["13"];
				var batch_code = rows[i]["14"];
				var size_name = rows[i]["15"];
				var data = {
					"product_id" : rows[i]["0"],
					"product_name" : rows[i]["1"],
					"product_sale_price" : rows[i]["2"],
					"product_marketing_price" : rows[i]["3"],
					"sort_id" : rows[i]["4"],
					"product_brand" : rows[i]["5"],
					"product_describe" : rows[i]["6"],
					"time_to_market" : rows[i]["7"],
					"color" : rows[i]["8"],
					"weight" : rows[i]["9"],
					"guarantee" : rows[i]["10"],
					"barcode" : rows[i]["11"],
					"is_new" : rows[i]["12"],
					"row_materials" : rows[i]["13"],
					"batch_code" : rows[i]["14"],
					"size_name" : rows[i]["15"],
					"industry_id" : 101
				};
				products.push(data);
			}
		}
		for (var i = 0; i < products.length; i++) {
			var product = products[i];
			if (!product.product_id || !product.product_name || !product.product_sale_price || !product.sort_id || !product.barcode || !product.product_marketing_price) {
				return reply({"success":false,"message":"第"+(i+2)+"行"+" params null!!"});
			}
			var re = /^[0-9]+(.[0-9]{0,2})?$/;
			if (!re.test(product.product_sale_price)||!re.test(product.product_marketing_price)) {
				return reply({"success":false,"message":"第"+(i+2)+"行"+" product_sale_price or product_marketing_price is not float"});
			}
			// var re2 = /^[0-9]*$/;
			// if (!re2.test(product.sort_id)||!re2.test(product.barcode)) {
			// 	return reply({"success":false,"message":"sort_id or barcode wrong"});
			// }
		}
		var data = {"products":JSON.stringify(products)};
		console.log("products:"+JSON.stringify(products));
		// return reply({"success":true,"msc":JSON.stringify(products)});
		save_product_complex(data,function(err,result){
			if (!err) {
				return reply({"success":true,"message":"ok","success_num":result.success_num,"repeat_num":result.repeat_num,"fail_num":result.fail_num,"repeat_products":result.repeat_products,"save_fail":result.save_fail});
			}else {
				return reply({"success":false,"message":result.message});
			}
		});
	};

	//头条查看
	var list_headline = function(cb){
		var url = "http://139.196.148.40:18005/list_headline_by_platform?platform_code=";
		url = url + platform_code;
		do_get_method(url,cb);
	};
	//头条新增
	var save_announce = function(data,cb){
		var url = "http://139.196.148.40:18005/save_announce";
		do_post_method(url,data,cb);
	}
	//头条删除
	var delete_announce = function(data,cb){
		var url = "http://139.196.148.40:18005/delete_announce";
		do_post_method(url,data,cb);
	}
	//头条查看
	var get_announce_by_id = function(id,cb){
		var url = "http://139.196.148.40:18005/get_announce_by_id?platform_code=";
		url = url + platform_code + "&id=" +id;
		do_get_method(url,cb);
	}
	//头条编辑
	var update_announce = function(data,cb){
		var url = "http://139.196.148.40:18005/update_announce";
		do_post_method(url,data,cb);
	}
	//公告列表
	var list_announce_by_platform = function(cb){
		var url = "http://139.196.148.40:18005/list_announce_by_platform?platform_code=";
		url = url + platform_code;
		do_get_method(url,cb);
	};
	//获取peson登入id
	var get_person_login = function(person_id,cb){
		var url = "http://139.196.148.40:18666/user/get_person_login?org_code=";
		url = url + org_code + "&person_id=" + person_id;
		do_get_method(url,cb);
	};
	//门店账号列表信息
	var list_store_accounts = function(store_id,cb){
		var url = "http://139.196.148.40:18666/user/list_store_accounts?org_code=";
		url = url + org_code + "&store_id=" + store_id;
		do_get_method(url,cb);
	};
	//绑定
	var bind_store_account = function(data,cb){
		var url = "http://139.196.148.40:18666/user/bind_store_account";
		do_post_method(url,data,cb);
	};
	//解绑
	var unbind_store_account = function(data,cb){
		var url = "http://139.196.148.40:18666/user/unbind_store_account";
		do_post_method(url,data,cb);
	};
	//发布消息
	var publish_announce = function(data,cb){
		var url = "http://139.196.148.40:18005/publish_announce";
		do_post_method(url,data,cb);
	};
	//上传保存图片
	var save_product_picture = function(data,cb){
		var url = "http://211.149.248.241:18002/save_product_picture";
		do_post_method(url,data,cb);
	}
	//商品上架
	var product_up = function(data,cb){
		var url = "http://211.149.248.241:18002/product_up";
		do_post_method(url,data,cb);
	}
	//商品下架
	var product_down = function(data,cb){
		var url = "http://211.149.248.241:18002/product_down";
		do_post_method(url,data,cb);
	}
	//运单列表
	var list_data = function(cb){
		var url = "http://211.149.248.241:18013/order/list_data?org_code="+ org_code;
		do_get_method(url,cb);
	};
	//开票列表
	var invoice_list_data = function(cb){
		var url = "http://139.196.148.40:18006/invoice/list_data?sob_id="+ org_code;
		do_get_method(url,cb);
	};
	//门店新增
	var add_store = function(data,cb){
		var url = "http://139.196.148.40:18001/store/add_store";
		do_post_method(url,data,cb);
	}
	//门店新增==编辑
	var update_store = function(data,cb){
		var url = "http://139.196.148.40:18001/store/update_store";
		do_post_method(url,data,cb);
	}
	//门店创建账号
	var add_login_account = function(data,cb){
		var url = "http://139.196.148.40:18666/user/add_login_account";
		do_post_method(url,data,cb);
	}
	server.route([
		//线上订单明细
		{
			method: 'GET',
			path: '/ec_order_details',
			handler: function(request, reply){
				return reply.view("ec_order_details");
			}
		},
		//线下订单明细
		{
			method: 'GET',
			path: '/order_details',
			handler: function(request, reply){
				return reply.view("order_details");
			}
		},
		//门店创建账号
		{
			method: 'POST',
			path: '/add_login_account',
			handler: function(request, reply){
				var person_id = request.payload.person_id;
				var username = request.payload.username;
				var password = request.payload.password;
				if (!person_id|| !username|| !password) {
					return reply ({"success":false,"message":"params wrong"});
				}
				var data = {"person_id":person_id,"username":username,"password":password,"org_code":org_code};

				add_login_account(data,function(err,rows){
					if (!err) {
						return reply ({"success":true,"person_login_id":rows.person_login_id,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//门店编辑
		{
			method: 'POST',
			path: '/update_store',
			handler: function(request, reply){
				var store_code = request.payload.store_code;
				var store_name = request.payload.store_name;
				var open_date = request.payload.open_date;
				var remark = request.payload.remark;
				var id = request.payload.id;
				if (!store_code|| !store_name|| !open_date|| !remark || !id) {
					return reply ({"success":false,"message":"params wrong"});
				}
				var data = {"store_code":store_code,"store_name":store_name,"open_date":open_date,"org_code":org_code, "id":id};

				update_store(data,function(err,rows){
					if (!err) {
						return reply ({"success":true,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//门店新增
		{
			method: 'POST',
			path: '/add_store',
			handler: function(request, reply){
				var store_code = request.payload.store_code;
				var store_name = request.payload.store_name;
				var open_date = request.payload.open_date;
				var remark = request.payload.remark;
				if (!store_code|| !store_name|| !open_date|| !remark) {
					return reply ({"success":false,"message":"params wrong"});
				}
				var data = {"store_code":store_code,"store_name":store_name,"open_date":open_date,"org_code":org_code};

				add_store(data,function(err,rows){
					if (!err) {
						return reply ({"success":true,"id":rows.id,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//开票列表页面
		{
			method: 'GET',
			path: '/invoice_list_page',
			handler: function(request, reply){
				return reply.view("invoice_list_page");
			}
		},
		//开票列表
		{
			method: 'GET',
			path: '/invoice_list',
			handler: function(request, reply){
				invoice_list_data(function(err,rows){
					if (!err) {
						return reply ({"success":true,"rows":rows.rows,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//运单列表页面
		{
			method: 'GET',
			path: '/transport_list_page',
			handler: function(request, reply){
				return reply.view("transport_list");
			}
		},
		//运单列表
		{
			method: 'GET',
			path: '/transport_list',
			handler: function(request, reply){
				list_data(function(err,rows){
					if (!err) {
						return reply ({"success":true,"rows":rows.rows,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//产品下架
		{
			method: 'POST',
			path: '/product_down',
			handler: function(request, reply){
				var product_id = request.payload.product_id;
				if (!product_id) {
					return reply({"success":false,"message":"product_id null"});
				}
				var data = {"product_id":product_id};
				product_down(data,function(err,content){
					if (!err) {
						return reply({"success":true,"message":"ok"});
					}else {
						return reply({"success":false,"message":content.message});
					}
				});
			}
		},
		//产品上架
		{
			method: 'POST',
			path: '/product_up',
			handler: function(request, reply){
				var product_id = request.payload.product_id;
				if (!product_id) {
					return reply({"success":false,"message":"product_id null"});
				}
				var data = {"product_id":product_id};
				product_up(data,function(err,content){
					if (!err) {
						return reply({"success":true,"message":"ok"});
					}else {
						return reply({"success":false,"message":content.message});
					}
				});
			}
		},
		//头条新增/编辑
		{
			method: 'GET',
			path: '/headline_update',
			handler: function(request, reply){
				return reply.view("announce_update");
			}
		},
		//公告新增/编辑
		{
			method: 'GET',
			path: '/announce_update',
			handler: function(request, reply){
				return reply.view("announce_update");
			}
		},
		//上传保存图片
		{
			method: 'POST',
			path: '/save_product_picture',
			handler: function(request, reply){
				var product_id = request.payload.product_id;
				var imgs = request.payload.imgs;
				if (!product_id || !imgs) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"product_id":product_id,"imgs":imgs};
				save_product_picture(data,function(err,result){
					if (!err) {
						return reply({"success":true,"message":"ok"});
					}else {
						return reply({"success":false,"message":result.message});
					}
				});
			}
		},
		//新增商品
		{
			method: 'POST',
			path: '/add_product',
			handler: function(request, reply){
				var product = request.payload.product;
				var data ={"product":product};
				add_product(data,function(err,result){
					if (!err) {
						return reply({"success":true,"message":"ok","success_num":result.success_num,"repeat_num":result.repeat_num,"fail_num":result.fail_num,"repeat_products":result.repeat_products,"save_fail":result.save_fail});
					}else {
						return reply({"success":false,"message":result.message});
					}
				});
			}
		},
		//处理库存上传文件
		{
			method: 'POST',
			path: '/upload_inventory',
			config: {
				payload: {
				   output: 'file',
				   maxBytes: 209715200,
				   parse: true //or just remove this line since true is the default
				},
				handler:function (request, reply) {
					var path = request.payload.file.path;
					console.log('fileUpload path : ' + path);
					read_inventory_excel(path, reply);
				}
			},
		},
		//头条公告发布
		{
			method: 'POST',
			path: '/publish_announce',
			handler: function(request, reply){
				var id = request.payload.id;
				var data = {"id":id};
				publish_announce(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//返回menu菜单列表
		{
			method: 'GET',
			path: '/menu_list',
			handler: function(request, reply){
				var menu_list = [{img:'images/shouye1.png',img2:'images/shouye-4.png',word:'首页',child:[]}
					,{img:'images/htshangpin1.png',img2:'images/htshangpin2.png',word:'商品',child:[{img:'images/htshangpinliebiao.png',word:'商品列表',href:'/products_center'},{img:'images/httianjiashangpin.png',word:'添加商品',
					href:'/products_add'}]}
					,{img:'images/htkucun1.png',img2:'images/htkucun2.png',word:'库存',child:[{img:'images/shouye-4.png',word:'子节点'}]}
					,{img:'images/htwuliu1.png',img2:'images/htwuliu2.png',word:'物流',child:[{img:'images/shouye-4.png',word:'子节点'}]}
					,{img:'images/htdingdan1.png',img2:'images/htdingdan2.png',word:'订单',child:[{img:'images/htxianshangdingdan.png',word:'线上订单',href:'/mp_order_center'},{img:'images/htxianxiadingdan.png',word:'线下订单',href:'/order'}]}
					,{img:'images/htmendian1.png',img2:'images/htmendian2.png',word:'门店',child:[{img:'images/shouye-4.png',word:'门店列表',href:'/mendian_center'},{img:'images/shouye-4.png',word:'创建账号',href:'/create_account'}]}
					,{img:'images/htzhanghao1.png',img2:'images/htzhanghao2.png',word:'公告/头条',child:[{img:'images/shouye-4.png',word:'公告列表',href:'/announce_center'},{img:'images/shouye-4.png',word:'头条列表',href:'/headline_center'}]}
					,{img:'images/hthuiyuan1.png',img2:'images/hthuiyuan2.png',word:'会员',child:[{img:'images/shouye-4.png',word:'子节点'}]}];
				return reply({"rows":menu_list});
			}
		},
		//登入账号创建
		{
			method: 'GET',
			path: '/create_account',
			handler: function(request, reply){
				return reply.view("create_account");
			}
		},
		//头条主页
		{
			method: 'GET',
			path: '/headline_center',
			handler: function(request, reply){
				return reply.view("headline_center");
			}
		},
		//头条编辑
		{
			method: 'GET',
			path: '/headline_edit',
			handler: function(request, reply){
				return reply.view("headline_edit");
			}
		},
		//公告编辑
		{
			method: 'GET',
			path: '/announce_edit',
			handler: function(request, reply){
				return reply.view("announce_edit");
			}
		},
		//公告中心
		{
			method: 'GET',
			path: '/announce_center',
			handler: function(request, reply){
				return reply.view("announce_center");
			}
		},
		//解绑
		{
			method: 'POST',
			path: '/unbind_store_account',
			handler: function(request, reply){
				var person_login_id = request.payload.person_login_id;
				var store_id = request.payload.store_id;
				if (!store_id || !person_login_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"person_login_id":person_login_id,"store_id":store_id,"org_code":org_code};
				unbind_store_account(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//绑定
		{
			method: 'POST',
			path: '/bind_store_account',
			handler: function(request, reply){
				var person_login_id = request.payload.person_login_id;
				var store_id = request.payload.store_id;
				if (!store_id || !person_login_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"person_login_id":person_login_id,"store_id":store_id,"org_code":org_code};
				bind_store_account(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//门店接口
		{
			method: 'GET',
			path: '/store_list',
			handler: function(request, reply){
				store_list(function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//门店账号列表信息
		{
			method: 'GET',
			path: '/list_store_accounts',
			handler: function(request, reply){
				var store_id = request.query.store_id;
				if (!store_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				list_store_accounts(store_id,function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//获取perosn登入id
		{
			method: 'GET',
			path: '/get_person_login',
			handler: function(request, reply){
				var person_id = request.query.person_id;

				if (!person_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				get_person_login(person_id,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"row":row.row});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},

		//公告新增
		{
			method: 'POST',
			path: '/save_announce2',
			handler: function(request, reply){
				var title = request.payload.title;
				var content = request.payload.content;
				var headline = 0;
				var imgs = request.payload.imgs;
				if (!title || !content || !headline || !imgs) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"title":title,"content":content,"headline":headline,"imgs":imgs,"platform_code":platform_code};
				save_announce(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"id":row.id});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},

		//公告列表
		{
			method: 'GET',
			path: '/list_announce_by_platform',
			handler: function(request, reply){
				list_announce_by_platform(function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//头条编辑
		{
			method: 'POST',
			path: '/update_announce',
			handler: function(request, reply){
				var title = request.payload.title;
				var id = request.payload.id;
				var content = request.payload.content;
				var imgs = request.payload.imgs;
				var headline = request.payload.headline;
				var data = {
					"title" : title,
					"id" : id,
					"content" : content,
					"imgs" : imgs,
					"headline" : headline,
					"platform_code" : platform_code
				};
				update_announce(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"row":row.row});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//头条查看
		{
			method: 'GET',
			path: '/get_announce_by_id',
			handler: function(request, reply){
				var id = request.query.id;
				get_announce_by_id(id,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"row":row.row});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//头条删除
		{
			method: 'POST',
			path: '/delete_announce',
			handler: function(request, reply){
				var id = request.payload.id;
				var data = {"id":id};
				delete_announce(data,function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},

		//头条新增
		{
			method: 'POST',
			path: '/save_announce',
			handler: function(request, reply){
				var title = request.payload.title;
				var content = request.payload.content;
				var headline = 1;
				var imgs = request.payload.imgs;
				if (!title || !content || !headline || !imgs) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"title":title,"content":content,"headline":headline,"imgs":imgs,"platform_code":platform_code};
				save_announce(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"id":row.id});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},

		//头条列表
		{
			method: 'GET',
			path: '/list_headline',
			handler: function(request, reply){
				list_headline(function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},

		//处理上传文件
		{
			method: 'POST',
			path: '/upload_product',
			config: {
				payload: {
				   output: 'file',
				   maxBytes: 209715200,
				   parse: true //or just remove this line since true is the default
				},
				handler:function (request, reply) {
					var path = request.payload.file.path;
					console.log('fileUpload path : ' + path);
					read_product_excel(path, reply);
				}
			},
		},

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
		//商品页面
		{
			method: 'GET',
			path: '/products_add',
			handler: function(request, reply){
				return reply.view("products_add");
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
