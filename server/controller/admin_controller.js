const uu_request = require('../utils/uu_request');
var service_info = "ec order service";
var fs = require('fs-extra');
var eventproxy = require('eventproxy');
var service_info = "drp admin service";
var org_code = "ioio";
var platform_code = "ioio";
if(typeof require !== 'undefined') XLSX = require('xlsjs');
var order_status ={
	"-1": "等待买家付款",
	"0" : "付款确认中",
	"1" : "等待卖家拣货",
	"2" : "等待卖家发货",
	"3" : "等待快递员揽货",
	"4" : "卖家已发货",
	"5" : "等待买家收货",
	"6" : "交易成功",
	"7" : "交易关闭",
	"8" : "退款中订单",
	"9" : "等待买家评价"
};
var pos_order_status = {
	"1":"未付款",
	"2":"付款确认中",
	"3":"付款完成",
	"4":"交易完成",
	"5":"交易作废",
	"6":"退款"
};

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
	var i18n = server.plugins.i18n;
	//获取当前cookie cookie_id
	var get_cookie_id = function(request){
		var cookie_id;
		if (request.state && request.state.cookie) {
			var cookie = request.state.cookie;
			if (cookie.cookie_id) {
				cookie_id = cookie.cookie_id;
			}
		}
		return cookie_id;
	};

	//获取当前cookie drp_admin_user_id
	var get_admin_id = function(request){
		var drp_admin_user_id;
		if (request.state && request.state.cookie) {
			var cookie = request.state.cookie;
			if (cookie.drp_admin_user_id) {
				drp_admin_user_id = cookie.drp_admin_user_id;
			}
		}
		return drp_admin_user_id;
	};

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
		var url = "http://211.149.248.241:18010/get_all_orders?params="+encodeURI(params);
		do_get_method(url,cb);
	};
	//获取所有订单数量
	var get_all_num = function(params,cb){
		var url = "http://211.149.248.241:18010/get_all_num?params="+encodeURI(params);
		do_get_method(url,cb);
	};
	//所有物流信息
	var get_logistics_infos = function(order_id,cb){
		var url = "http://127.0.0.1:18010/search_logistics_info?order_id="+order_id;
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
	var list_by_ids = function(ids, cb){
		var url = "http://139.196.148.40:18003/person/list_by_ids?ids=";
		url = url + ids + "&scope_code=" +org_code;
		do_get_method(url,cb);
	};
	//订单支付信息
	var get_order_pay_infos = function(order_id,cb){
		var url = "http://139.196.148.40:18008/get_order_pay_infos?sob_id=ioio&order_id=";
		url = url + order_id;
		do_get_method(url,cb);
	}
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
	var mp_orders_list = function(params,cb){
		var url = "http://211.149.248.241:18010/mp_orders_list?params="+encodeURI(params);
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
	var get_products_list = function(params,cb){
		var url = "http://211.149.248.241:18002/get_products_list?params="+encodeURI(params);
		do_get_method(url,cb);
	};
	//更新订单状态
	var update_order_status = function(data,cb){
		var url = "http://211.149.248.241:18010/update_order_status_pay";
		do_post_method(url,data,cb);
	}
	// 商品列表
	var find_shantao_infos = function(product_ids,cb){
		var url = "http://211.149.248.241:18002/find_shantao_infos?product_ids="+product_ids;
		do_get_method(url,cb);
	};
	//退货列表
	var return_list = function(params,cb){
		var url = "http://211.149.248.241:18010/return_list?params="+params;
		do_get_method(url,cb);
	};
	// 商品信息
	var find_product_info = function(product_id,cb){
		var url = "http://211.149.248.241:18002/product_info?product_id="+product_id;
		do_get_method(url,cb);
	};
	//门店列表
	var store_list = function(cb){
		var url = "http://211.149.248.241:19999/store/list?org_code="+org_code;
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
	//退单明细
	var search_return_order = function(id, cb){
		var url = "http://211.149.248.241:18010/search_return_order?id="+id;
		do_get_method(url,cb);
	};
	//得到所有运送方式
	var get_logistics_type = function(cb){
		var url = "http://211.149.248.241:18013/freightage/type";
		do_get_method(url,cb);
	};
	//得到所有运送方式
	var get_product_stock = function(product_id, cb){
		var url = "http://211.149.248.241:12001/get_product_stock?product_id="+product_id;
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
		var inventory = [];
		for (var i = 0; i < rows.length; i++) {
			var leng = rows.length;
			// if(leng >101){
			// 	return reply({"success":false,"message":"over 100"});
			// };
			if (i == 0) {
				if (rows[i]["16"] != "数量（实际）") {
					return reply({"success":false,"message":rows[i]["16"]+": form wrong"});
				}else if (rows[i]["0"] != "货号") {
					return reply({"success":false,"message":rows[i]["0"]+": form wrong"});
				}else if (rows[i]["15"] != "尺寸/尺码") {
					return reply({"success":false,"message":rows[i]["15"]+": form wrong"});
				}else if (rows[i]["17"] != "地址") {
					return reply({"success":false,"message":rows[i]["17"]+": form wrong"});
				}else if (rows[i]["18"] != "库位") {
					return reply({"success":false,"message":rows[i]["18"]+": form wrong"});
				}
			}
			if (i>0) {
				var quantity = rows[i]["16"];
				var product_id = rows[i]["0"];
				var size_name = rows[i]["15"];
				var address = rows[i]["17"];
				var stock_location = rows[i]["18"];
				var data = {"quantity":quantity,"product_id":product_id,"size_name":size_name,"address":address,"stock_location":stock_location};
				inventory.push(data);
			}
			for (var i = 0; i < inventory.length; i++) {
				if (!inventory[i].product_id || !inventory[i].quantity || !inventory[i].address || !inventory[i].stock_location) {
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
		var products = [];
		for (var i = 0; i < rows.length; i++) {
			//长度
			var leng = rows.length;
			// if(leng >101){
			// 	return reply({"success":false,"message":"over 100"});
			// };
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
					// return reply({"success":false,"message":rows[i]["4"]+": form wrong"});
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
			if (!product.product_id || !product.product_name || !product.product_sale_price || !product.barcode || !product.product_marketing_price) {
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
	//查询物流信息
	var get_logistics_info = function(order_id,cb){
		var url = "http://211.149.248.241:18010/search_laster_logistics?order_id="+order_id;
		do_get_method(url,cb);
	};
	//修改密码
	var change_password = function(data,cb){
		var url = "http://139.196.148.40:18666/password/change";
		do_post_method(url,data,cb);
	};
	//绑定
	var bind_store_account = function(data,cb){
		var url = "http://139.196.148.40:18666/user/bind_store_account";
		do_post_method(url,data,cb);
	};
	//开票信息
	var get_invoice_info = function(person_id,order_ids,cb){
		var url = "http://211.149.248.241:18010/search_ec_invoices?order_id=";
		url = url + order_ids + "&person_id=" + person_id;
		do_get_method(url,cb);
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
	var down_announce = function(data,cb){
		var url = "http://139.196.148.40:18005/down_announce";
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
	//得到单个订单
	var get_ec_order = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_ec_order?order_id="+order_id;
		do_get_method(url,cb);
	};
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
	//物流公司查询 http://211.149.248.241:18013/logistics/companies
	var companies = function(cb){
		var url = "http://211.149.248.241:18013/logistics/companies";
		do_get_method(url,cb);
	};
	//已开票列表
	var invoice_list_data = function(cb){
		var url = "http://139.196.148.40:18006/invoice/list_data?sob_id="+ org_code;
		do_get_method(url,cb);
	};
	//开票申请列表
	var invoice_apply_list_data = function(cb){
		var url = "http://139.196.148.40:18006/invoice/apply_list_data?sob_id="+ org_code;
		do_get_method(url,cb);
	};
	//根据id得到指定门店信息
	var get_by_id = function(store_id,cb){
		var url = "http://211.149.248.241:19999/store/get_by_id?id="+store_id+"&org_code="+org_code;
		do_get_method(url,cb);
	};
	//门店新增
	var add_store = function(data,cb){
		var url = "http://139.196.148.40:18001/store/add_store";
		do_post_method(url,data,cb);
	}
	//门店编辑
	var update_store = function(data,cb){
		var url = "http://139.196.148.40:18001/store/update_store";
		do_post_method(url,data,cb);
	}
	//生成运单
	var logistics_order = function(data,cb){
		var url = "http://211.149.248.241:18013/order/add";
		do_post_method(url,data,cb);
	}
	//创建运单步骤
	var add_new_step = function(data,cb){
		var url = "http://211.149.248.241:18013/logistics/add_new_step";
		do_post_method(url,data,cb);
	}
	//查询运单号
	var get_logistics_id = function(order_id,cb){
		var url = "http://211.149.248.241:18013/order/list_data?org_code=ioio&order_id="+order_id;
		do_get_method(url,cb);
	}
	//查询产品分类
	var search_product_sort = function(product_id,cb){
		var url = "http://211.149.248.241:18002/search_product_sort?product_id="+product_id;
		do_get_method(url,cb);
	}

	//门店创建账号
	var add_login_account = function(data,cb){
		var url = "http://139.196.148.40:18666/user/add_login_account";
		do_post_method(url,data,cb);
	}
	//高手版分类
	var update_sort_id = function(data,cb){
		var url = "http://211.149.248.241:18002/update_sort_id";
		do_post_method(url,data,cb);
	}
	//分类查询
	var get_level_one = function(parent,cb){
		var url = "http://211.149.248.241:18002/get_level_one?id="+parent;
		do_get_method(url,cb);
	}
	//商品名称模糊查询
	var search_pos_product = function(product_name,cb){
		var url = "http://211.149.248.241:18002/search_pos_product?product_name="+product_name;
		do_get_method(url,cb);
	};
	//商品名称模糊查询
	var search_sort = function(id,cb){
		var url = "http://211.149.248.241:18002/search_sort?id="+id;
		do_get_method(url,cb);
	};
	//商品名称模糊查询
	var search_sorts = function(ids,cb){
		var url = "http://211.149.248.241:18002/search_sorts?sort_ids="+ids;
		do_get_method(url,cb);
	};
	//查询事件是否处理
	var search_deal_event = function(data,cb){
		var url = "http://211.149.248.241:18010/search_deal_event";
		do_post_method(url,data,cb);
	}
	//保存事件
	var save_event = function(data,cb){
		var url = "http://211.149.248.241:18010/save_event";
		do_post_method(url,data,cb);
	}
	//更新订单状态
	var update_recharge_status = function(data,cb){
		var url = "http://211.149.248.241:18010/update_recharge_status";
		do_post_method(url,data,cb);
	}
	//查询充值订单
	var get_recharge_order = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_recharge_order?order_id="+order_id;
		do_get_method(url,cb);
	}
	//发现vip
	var get_person_vip = function(person_id,cb){
		var url = "http://139.196.148.40:18666/vip/get_by_person_id?person_id=" + person_id + "&org_code=" + org_code;
		do_get_method(url,cb);
	};
	//变异订单
	var get_poor_orders = function(cb){
		var url = "http://211.149.248.241:18010/get_poor_orders";
		do_get_method(url,cb);
	};
	//充值积分
	var vip_add_amount_begin = function(data,cb){
		var url = "http://139.196.148.40:18008/vip_add_amount_begin";
		do_post_method(url,data,cb);
	}
	//退单完成
	var add_jifen = function(data,cb){
		var url = "http://139.196.148.40:18003/vip/order_finish";
		do_post_method(url,data,cb);
	}
	//查询描述
	var search_descriptions = function(product_id,cb){
		var url = "http://211.149.248.241:18002/search_descriptions?product_id="+product_id;
		do_get_method(url,cb);
	};
	//查询更新
	var update_product_description = function(data,cb){
		var url = "http://211.149.248.241:18002/update_product_description";
		do_post_method(url,data,cb);
	};
	//获取验证图片
	var get_captcha = function(cookie_id,cb){
		var url = "http://139.196.148.40:11111/api/captcha.png?cookie_id="+cookie_id;
		do_get_method(url,cb);
	};
	//验证码验证
	var check_captcha = function(vertify,cookie_id,cb){
		var url = "http://139.196.148.40:11111/api/verify?cookie_id=" +cookie_id + "&text=" + vertify;
		do_get_method(url,cb);
	};
	//登入账号验证
	var do_login = function(data, cb){
		var url = "http://139.196.148.40:18666/user/login_check";
		data.platform_code = "drp_admin";
		do_post_method(url,data,cb);
	};
	//更新商品信息
	var update_product_info = function(data, cb){
		var url = "http://211.149.248.241:18002/update_product_info";
		do_post_method(url,data,cb);
	};
	//批量改价
	var update_products_prices = function(data, cb){
		var url = "http://211.149.248.241:18002/update_products_prices";
		do_post_method(url,data,cb);
	};
	//退款查询
	var get_return_order = function(order_id,cb){
		var url = "http://211.149.248.241:18010/get_return_order?order_id="+order_id;
		do_get_method(url,cb);
	};
	//查看历史
	var find_history_list = function(params,cb){
		var url = "http://211.149.248.241:18002/find_history_list?params="+params;
		do_get_method(url,cb);
	};
	//查询商品信息
	var get_product_info = function(barcode, cb){
		var url = "http://211.149.248.241:12001/get_cached_barcode?barcode=";
		url = url + barcode;
		do_get_method(url,cb);
	};
	//根据货物id找到pos商品
	var get_pos_product = function(product_id, cb){
		var url = "http://211.149.248.241:18002/get_pos_product?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	};
	//查询商品图片
	var get_product_pictures = function(product_id,cb){
		var url = "http://211.149.248.241:18002/get_product_pictures?product_id=";
		url = url + product_id;
		do_get_method(url,cb);
	}
	//充值订单列表
	var get_recharge_orders = function(params,cb){
		var url = "http://211.149.248.241:18010/get_recharge_orders?params=";
		url = url + params;
		do_get_method(url,cb);
	}
	server.route([
		//充值订单列表信息
		{
			method: 'GET',
			path: '/get_recharge_orders',
			handler: function(request, reply){
				var params = request.query.params;
				if (!params) {
					return reply({"success":false,"message":"params wrong","service_info":service_info});
				}
				get_recharge_orders(params,function(err,rows){
					if (!err) {
						// for (var i = 0; i < rows.rows.length; i++) {
						// 	var order = rows.rows[i];
						// 	order.status_name = order_status[order.order_status];
						// }
						return reply({"success":true,"message":"ok","orders":rows.rows,"num":rows.num,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//充值订单列表
		{
			method: 'GET',
			path: '/recharge_orders',
			handler: function(request, reply){
				return reply.view("recharge_orders");
			}
		},
		//barcode查产品信息
		{
			method: 'GET',
			path: '/get_product_info',
			handler: function(request, reply){
				// var barcode = "11112235";
				var barcode = request.query.barcode;

				get_product_info(barcode, function(err,row){
					if (!err) {
						if (row.success) {
							var product_id = row.row.product_id;
							get_pos_product(product_id, function(err,row){
								if (!err) {
									if (row.success) {
										var product_info = row.row;
										var industry_id = product_info.industry_id;
										var sale_properties = row.sale_properties;
										var ep =  eventproxy.create("picture_info",
											function(stocks,picture_info){
												return reply({"success":true,"row":product_info,"message":"ok","picture_info":picture_info,"sale_properties":sale_properties,"service_info":service_info});
										});

										get_product_pictures(product_id,function(err,rows){
											if (!err) {
												if (rows.rows) {
													ep.emit("picture_info", rows.rows[0]);
												}else {
													ep.emit("picture_info", {});
												}
											}else {
												ep.emit("picture_info", {});
											}
										});


									}else {
										return reply({"success":false,"message":row.message});
									}
								}else {
									return reply({"success":false,"message":"params wrong"});
								}
							});
						}else {
							return reply({"success":false,"message":row.message});
						}
					}else {
						return reply({"success":false});
					}
				});

			}
		},
		//查看历史
		{
			method: 'GET',
			path: '/find_history_list',
			handler: function(request, reply){
                var params = {};
                if (request.query.params) {
                    params = request.query.params;
                }else {
                	params = JSON.stringify(params);
                }
				find_history_list(params,function(err,rows){
					if (!err) {
						return reply({"success":true,"rows":rows.rows,"num":rows.num});
					}else {
						return reply({"success":false,"message":rows.message});
					}
				});
			}
		},
		//批量改价
		{
			method: 'POST',
			path: '/update_products_prices',
			handler: function(request, reply){
				var product_ids = request.payload.product_ids;
				var discount = request.payload.discount;
				var remark = request.payload.remark;
				var person_id = request.payload.person_id;
				if (!discount || product_ids.length ==0 || !person_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {
					"product_ids" :product_ids,
					"discount" :discount,
					"remark" :remark,
					"person_id" : person_id
				}
				update_products_prices(data,function(err,result){
					if (!err) {
						return reply({"success":true,"success_num":result.success_num,"fail_num":result.fail_num,"fail_ids":result.fail_ids,"discount":discount});
					}else {
						return reply({"success":false,"message":result.message});
					}
				});
			}
		},
		//门店详细信息
		{
			method: 'GET',
			path: '/mendian_detail_view',
			handler: function(request, reply){
				var store_id = request.query.store_id;
				return reply.view("mendian_detail_view",{"store_id":store_id});
			}
		},
		//门店详细信息
		{
			method: 'get',
			path: '/mendian_detail',
			handler: function(request, reply){
				var store_id = request.query.store_id;
				get_by_id(store_id,function(err,row){
					if (!err) {
						return reply({"success":true,"row":row.row});
					}else {
						return reply({"success":false,"message":row.message});
					}
				});
			}
		},
		//退款查询
		{
			method: 'GET',
			path: '/get_return_order',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				get_return_order(order_id,function(err,rows){
					if (!err) {
						return reply({"success":true,"orders":rows.orders,"details_map":rows.details_map,"products_map":rows.products_map});
					}else {
						return reply({"success":false,"message":rows.message});
					}
				});
			}
		},
		//付款情况
		{
			method: 'GET',
			path: '/get_order_pay_infos',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				get_order_pay_infos(order_id,function(err,rows){
					if (!err) {
						return reply({"success":true,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message});
					}
				});
			}
		},
		//产品编辑
		{
			method: 'POST',
			path: '/edit_product',
			handler: function(request, reply){
				var old_id = request.payload.old_id;
				var id = request.payload.id;
				var product_name = request.payload.product_name;
				var weight = request.payload.weight;
				var product_sale_price = request.payload.product_sale_price;
				var product_marketing_price = request.payload.product_marketing_price;
				var origin = request.payload.origin;
				if (!id || !product_name || !weight || !product_sale_price || !product_marketing_price || !origin || !old_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {
					"old_id":old_id,
					"id": id,
					"product_name":product_name,
					"weight":weight,
					"product_sale_price":product_sale_price,
					"product_marketing_price":product_marketing_price,
					"origin":origin
				}
				update_product_info(data,function(err,content){
					if (!err) {
						return reply({"success":true});
					}else {
						return reply({"success":false,"message":content.message});
					}
				});

			}
		},
		//统计页面
		{
			method: 'GET',
			path: '/statistics',
			handler: function(request, reply){
				return reply.view("statistics");
			}
		},
		//登入验证
		{
			method: 'POST',
			path: '/do_login',
			handler: function(request, reply){
				var data = {};
				data.username = request.payload.username;
				data.password = request.payload.password;
				var vertify = request.payload.vertify;
				data.org_code = "ioio";

				var cookie_id = get_cookie_id(request);
				if (!cookie_id) {
					return reply({"success":false});
				}
				check_captcha(vertify,cookie_id,function(err, content){
					if (!err) {
						if (content.success) {
							do_login(data, function(err,content){
								if (!err) {
									var login_id = content.row.login_id;
									var cookie = request.state.cookie;
									if (!cookie) {
										cookie = {};
									}
									cookie.login_id = login_id;
									return reply({"success":true,"service_info":service_info}).state('cookie', cookie, {ttl:10*365*24*60*60*1000});
								} else {
									return reply({"success":false,"message":i18n._n(content.message)});
								}
							});
						}else {
							return reply({"success":false,"message":i18n._n("vertify wrong")});
						}
					}else {
						return reply({"success":false,"message":i18n._n("vertify wrong")});
					}
				});
			}
		},
		//登入页面
		{
			method: 'GET',
			path: '/login_page',
			handler: function(request, reply){
				var cookie_id = get_cookie_id(request);
				if (!cookie_id) {
					cookie_id = uuidV1();
				}
				var cookie = request.state.cookie;
				if (!cookie) {
					cookie = {};
				}
				cookie.cookie_id = cookie_id;
				return reply.view("login_page").state('cookie', cookie, {ttl:10*365*24*60*60*1000});
			}
		},
		//验证码获取
		{
			method: 'GET',
			path: '/captcha',
			handler: function(request, reply){
				var cookie_id = get_cookie_id(request);
				if (!cookie_id) {
					return reply({"success":false});
				}
				get_captcha(cookie_id,function(err, content){
					if (!err) {
						return reply({"success":true,"image":content.image,"service_info":service_info});
					}else {

					}
				});
			}
		},
		//产品描述
		{
			method: 'GET',
			path: '/product_description',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				return reply.view("product_description",{"product_id":product_id});
			}
		},
		//查询描述
		{
			method: 'GET',
			path: '/search_descriptions',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				if (!product_id) {
					return reply({"success":false,"message":"param null"});
				}
				search_descriptions(product_id,function(err,row){
					if (!err) {
						return reply({"success":true,"row":row.row,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//修改密码
		{
			method: 'POST',
			path: '/change_password',
			handler: function(request, reply){
				var data = {};
				data.mobile = request.payload.mobile;
				data.password = request.payload.password;
				var cookie_id = get_cookie_id(request);
				if (!cookie_id) {
					cookie_id = uuidV1();
				}
				data.request_id = cookie_id;
				change_password(data,function(err,content){
					if (!err) {
						return reply({"success":true,"message":"ok"});
					}else {
						return reply({"success":false,"message":data.message});
					}
				});
			}
		},
		//更新描述
		{
			method: 'POST',
			path: '/update_product_description',
			handler: function(request, reply){
				var product_id = request.payload.product_id;
				var description = request.payload.description;
				if (!product_id || !description) {
					return reply({"success":false,"message":"param null"});
				}
				var data = {"product_id":product_id,"description":description};
				update_product_description(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},
		//变异订单
		{
			method: 'GET',
			path: '/inventory_search',
			handler: function(request, reply){
				return reply.view("inventory_search");
			}
		},
		//变异订单
		{
			method: 'GET',
			path: '/poor_orders',
			handler: function(request, reply){
				return reply.view("poor_orders");
			}
		},
		//变异订单数据
		{
			method: 'GET',
			path: '/get_poor_orders',
			handler: function(request, reply){
				get_poor_orders(function(err,rows){
					if (!err) {
						return reply({"success":true,"rows":rows.rows});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//支付宝回调
		{
			method: 'POST',
			path: '/receive_pay_notify',
			handler: function(request, reply){
				var success = request.payload.success;
				var order_id = request.payload.order_id;
				//实际保存
				var info = {"id":order_id};
				search_deal_event(info,function(err,rows){
					if (!err) {
						if (rows.row.length>0) {
							//有处理的，保存当前事件
							info.is_deal = 0;
							save_event(info,function(err,content){
								if (!err) {
									return reply({"success":true,"message":"已经处理事件了"});
								}else {
									return reply({"success":false,"message":content.message,"service_info":service_info});
								}
							});
						}else {
							//没处理的更新订单状态，保存事件，传阿里云进去
							var data = {"order_id":order_id,"order_status":1};
							var boolean = order_id.indexOf("RC");
							if (boolean==-1) {
								//修改订单状态
								update_order_status(data,function(err,content){
									if (!err) {
										//回调函数到支付宝接口
										info.is_deal = 1;
										save_event(info,function(err,content){
											if (!err) {
												get_order(order_id,function(err,row){
													if (!err) {
														var order = row.rows[0];
														var person_id = order.person_id;
														var amount = order.actual_price;
														var info = {
															"order_id" :order_id,
															"logi_code" : order.type,
															"org_code" : "ioio",
															"to_province" : order.province,
															"to_city" : order.city,
															"to_district" : order.district,
															"to_detail_address" : order.detail_address,
															"linkname" : order.linkname,
															"mobile" : order.mobile
														};
														logistics_order(info,function(err,content){
															if (!err) {
																get_person_vip(person_id,function(err,content){
																	if (!err) {
																		if (!content.row) {
																			return reply({"success":true,"message":"订单事件处理完,并生成运单,但是没有vip_id"});
																		}
																		var vip = content.row;
																		var infos = {
																			"order_id":order_id,
																			"vip_id":vip.vip_id,
																			"order_desc":"001购物",
																			"amount":amount,
																			"platform_code":"ioio"
																		};
																		add_jifen(infos,function(err,content){
																			if (!err) {
																				return reply({"success":true,"message":"订单事件处理完,并生成运单"});
																			}else {
																				reply({"success":false,"message":content.message,"service_info":content.service_info});
																			}
																		});
																	}else {
																		reply({"success":false,"message":content.message,"service_info":content.service_info});
																	}
																});
															}else {
																return reply({"success":false,"message":content.message,"service_info":service_info});
															}
														});
													}else {
														return reply({"success":false,"message":row.message,"service_info":service_info});
													}
												});
											}else {
												return reply({"success":false,"message":content.message,"service_info":service_info});
											}
										});
									}else {
										return reply({"success":false,"message":content.message,"service_info":service_info});
									}
								});
							}else {
								//修改订单状态
								update_recharge_status(data,function(err,content){
									if (!err) {
										//回调函数到支付宝接口
										info.is_deal = 1;
										save_event(info,function(err,content){
											if (!err) {
												get_recharge_order(order_id,function(err,rows){
													if (!err) {
														var order = rows.rows[0];
														var person_id = order.person_id;
														get_person_vip(person_id,function(err,content){
															if (!err) {
																var vip = content.row;
																var payment ={
																	"sob_id":"ioio",
																	"address":"上海宝山",
																	"pay_amount":order.actual_price,
																	"effect_amount":order.marketing_price,
																	"operator":1,
																	"main_role_name":vip.vip_name,
																	"main_role_id":vip.vip_id,
																	"pay_type":order.pay_way,
																	"platform_code":"drp_admin"
																};
																vip_add_amount_begin(payment,function(err,content){
																	if (!err) {
																		//回调阿里接口
																		return reply({"success":true,"message":"订单事件处理完"});
																	}else {
																		return reply({"success":false,"messsage":content.messsage});
																	}
																});
															}else {
																return reply({"success":false,"messsage":content.messsage});
															}
														});

													}else {
														return reply({"success":false,"message":rows.message,"service_info":service_info});
													}
												});

											}else {
												return reply({"success":false,"message":content.message,"service_info":service_info});
											}
										});
									}else {
										return reply({"success":false,"message":content.message,"service_info":service_info});
									}
								});
							}
						}
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});

			}
		},
		//单个商品库存查询
		{
			method: 'GET',
			path: '/get_product_stock',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				get_product_stock(product_id,function(err,rows){
					if (!err) {
						return reply({"success":true,"rows":rows.rows,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//高手
		{
			method: 'GET',
			path: '/master',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				return reply.view("master",{"product_id":product_id});
			}
		},
		//菜鸟
		{
			method: 'GET',
			path: '/noob_sort',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				return reply.view("noob_sort",{"product_id":product_id});
			}
		},

		//商品名称模糊查询
		{
			method: 'GET',
			path: '/search_pos_product',
			handler: function(request, reply){
				var product_name = request.query.product_name;
				if (!product_name) {
					return reply({"success":false,"message":"param null"});
				}
				product_name = encodeURI(product_name);
				search_pos_product(product_name,function(err,rows){
					if(!err){
						return reply({"success":true,"rows":rows.rows,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//分类查询
		{
			method: 'GET',
			path: '/search_sort',
			handler: function(request, reply){
				var id = request.query.id;
                if (!id) {
					return reply({"success":false,"message":"id null","service_info":service_info});
                }
				search_sort(id,function(err,rows){
					if (!err) {
						if (rows.rows.length == 0) {
							return reply({"success":true,"service_info":service_info});
						}else {
							return reply({"success":true,"row":rows.rows[0],"service_info":service_info});
						}
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//分类查询
		{
			method: 'GET',
			path: '/get_level_one',
			handler: function(request, reply){
				var parent = 0;
                if (request.query.id) {
                    parent = request.query.id;
                }
				get_level_one(parent,function(err,rows){
					if (!err) {
						return reply({"success":true,"rows":rows.rows,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//高手版分类
		{
			method: 'POST',
			path: '/update_sort_id',
			handler: function(request, reply){
				var product_id = request.payload.product_id;
				var sort_id = request.payload.sort_id;
				if (!product_id || !sort_id) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"product_id":product_id,"sort_id":sort_id};
				update_sort_id(data,function(err,rows){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":service_info});
					}
				});
			}
		},
		//订单导出
		{
			method: 'GET',
			path: '/export_ec_order',
			handler: function(request, reply){
				return reply.view("deliver_center");
			}
		},
		//新建物流步骤
		{
			method: 'POST',
			path: '/add_new_step',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = request.payload.step_name;
				var point_id = request.payload.point_id;
				var detail_desc = request.payload.detail_desc;
				var operator_id = request.payload.operator_id;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//发货
		{
			method: 'POST',
			path: '/send_goods',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "sorted_delivery";
				var point_id = 1;
				var detail_desc = "订单发货";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//提交订单
		{
			method: 'POST',
			path: '/commit_order',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "commit_order";
				var point_id = 1;
				var detail_desc = "提交订单";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//进入仓库
		{
			method: 'POST',
			path: '/send_to_warehouse',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "send_to_warehouse";
				var point_id = 1;
				var detail_desc = "进入仓库";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//计划送达日期
		{
			method: 'POST',
			path: '/plan_date',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "plan_date";
				var point_id = 1;
				var detail_desc = "计划送达日期";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//打印完成
		{
			method: 'POST',
			path: '/print_complete',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "print_complete";
				var point_id = 1;
				var detail_desc = "打印完成";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//拣货完成
		{
			method: 'POST',
			path: '/pickup_complete',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "pickup_complete";
				var point_id = 1;
				var detail_desc = "拣货完成";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//已扫描
		{
			method: 'POST',
			path: '/scaned',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "scaned";
				var point_id = 1;
				var detail_desc = "已扫描";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//打包成功
		{
			method: 'POST',
			path: '/pack_complete',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "pack_complete";
				var point_id = 1;
				var detail_desc = "打包成功";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//分拣
		{
			method: 'POST',
			path: '/sorted',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "sorted";
				var point_id = 1;
				var detail_desc = "分拣";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//验货
		{
			method: 'POST',
			path: '/inspect',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "inspect";
				var point_id = 1;
				var detail_desc = "验货";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//投递
		{
			method: 'POST',
			path: '/delivery',
			handler: function(request, reply){
				var logistics_id = request.payload.logistics_id;
				var step_name = "delivery";
				var point_id = 1;
				var detail_desc = "投递";
				var operator_id = 1;
				if (!logistics_id || !step_name || !point_id || !detail_desc || !operator_id) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				var data = {"logistics_id":logistics_id,"step_name":step_name,"point_id":point_id,"detail_desc":detail_desc,"operator_id":operator_id};
				add_new_step(data,function(err,content){
					if (!err) {
						reply({"success":true,"service_info":service_info});
					}else {
						reply({"success":false,"message":content.message,"service_info":service_info});
					}
				});
			}
		},
		//选择快递方式 并生成运单
		{
			method: 'POST',
			path: '/choose_delivery',
			handler: function(request, reply){
				var order_id = request.payload.order_id;
				var logi_id = request.payload.logi_id;
				var logi_no = request.payload.logi_no;
				if (!order_id || !logi_id || !logi_no) {
					return reply({"success":false,"message":"params null","service_info":service_info});
				}
				get_order(order_id,function(err,row){
					if (!err) {
						var order = row.rows[0];
						var data = {"order_id":order_id,"order_status":4};
						update_order_status(data,function(err,content){
							if (!err) {
								var info = {
									"order_id" :order_id,
									"logi_id" : logi_id,
									"org_code" : "ioio",
									"logi_no" : logi_no,
									"to_province" : order.province,
									"to_city" : order.city,
									"to_district" : order.district,
									"to_detail_address" : order.detail_address,
									"linkname" : order.linkname,
									"mobile" : order.mobile
								};
								logistics_order(info,function(err,content){
									if (!err) {

										return reply({"success":true,"id":content.id,"service_info":service_info});
									}else {
										return reply({"success":false,"message":row.message,"service_info":service_info});
									}
								});
							}else {
								return reply({"success":false,"message":content.message,"service_info":service_info});
							}
						});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
			}
		},

		//快递模板明细
		{
			method: 'GET',
			path: '/deliver_view',
			handler: function(request, reply){
				var deliver_id = request.query.deliver_id;
				return reply.view("deliver_view",{"deliver_id":deliver_id});
			}
		},
		//快递列表页面
		{
			method: 'GET',
			path: '/deliver_center',
			handler: function(request, reply){
				return reply.view("deliver_center");
			}
		},
		//线下详细页面
		{
			method: 'GET',
			path: '/orderDetail_view',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				return reply.view("orderDetail_view",{"order_id":order_id});
			}
		},
		//线上详细页面
		{
			method: 'GET',
			path: '/mp_orderDetail_view',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				companies(function(err,rows){
					if (!err) {
						var rows = rows.rows;
						return reply.view("mp_orderDetail_view",{"order_id":order_id,"rows":rows});
					}else {
						return reply.view("mp_orderDetail_view",{"order_id":order_id,"rows":[]});
					}
				});
			}
		},
		//announce edit
		{
			method: 'GET',
			path: '/add_mendian',
			handler: function(request, reply){
				return reply.view("add_mendian");
			}
		},
		//announce edit
		{
			method: 'GET',
			path: '/edit_headline',
			handler: function(request, reply){
				var id = request.query.id;
				return reply.view("edit_headline",{"id":id});
			}
		},
		//announce add
		{
			method: 'GET',
			path: '/add_headline',
			handler: function(request, reply){
				return reply.view("add_headline");
			}
		},
		//announce add
		{
			method: 'GET',
			path: '/add_announce',
			handler: function(request, reply){
				return reply.view("add_announce");
			}
		},
		//announce edit
		{
			method: 'GET',
			path: '/edit_announce',
			handler: function(request, reply){
				var id = request.query.id;
				return reply.view("edit_announce",{"id":id});
			}
		},
		//商品导入页面
		{
			method: 'GET',
			path: '/import_inventory',
			handler: function(request, reply){
				return reply.view("import_inventory");
			}
		},
		//商品导入页面
		{
			method: 'GET',
			path: '/import_products',
			handler: function(request, reply){
				return reply.view("import_products");
			}
		},
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
		//退货列表
		{
			method: 'GET',
			path: '/return_list',
			handler: function(request, reply){
				return reply.view("return_list");
			}
		},
		//退货列表数据
		{
			method: 'GET',
			path: '/return_list_data',
			handler: function(request, reply){
				var params = request.query.params;
				if (!params) {
					return reply({"success":false,"message":"params wrong","service_info":service_info});
				}
				return_list(params,function(err,rows){
					if (!err) {
						var orders = rows.rows;
						var products = rows.products;
						for (var i = 0; i < orders.length; i++) {
							orders[i].product_name = products[orders[i].product_id].product_name;
							orders[i].product_sale_price = products[orders[i].product_id].product_sale_price;
							orders[i].img = products[orders[i].product_id].img.location;
						}
						return reply({"success":true,"rows":orders,"products":products,"num":rows.num});
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});

			}
		},
		//退货列表明细
		{
			method: 'GET',
			path: '/return_view',
			handler: function(request, reply){
				var id = request.query.id;
				return reply.view("return_view",{"id":id});
			}
		},
		//退货列表明细数据
		{
			method: 'GET',
			path: '/return_view_data',
			handler: function(request, reply){
				var id = request.query.id;
				if (!id) {
					return reply({"success":false,"message":"id is null"});
				}
				search_return_order(id,function(err,row){
					if (!err) {
						return reply({"success":true,"row":row.row});
					}else {
						return reply({"success":false,"message":row.message,"service_info":row.service_info});
					}
				});
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
		//已开票列表页面
		{
			method: 'GET',
			path: '/invoice_list',
			handler: function(request, reply){
				return reply.view("invoice_list");
			}
		},
		//已开票列表
		{
			method: 'GET',
			path: '/invoice_list_data',
			handler: function(request, reply){
				invoice_list_data(function(err,rows){
					if (!err) {
						return reply ({"success":true,"rows":rows.rows,"num": rows.num,"service_info":rows.service_info})
					}else {
						return reply({"success":false,"message":rows.message,"service_info":rows.service_info});
					}
				});
			}
		},
		//开票申请列表页面
		{
			method: 'GET',
			path: '/invoice_apply',
			handler: function(request, reply){
				return reply.view("invoice_apply");
			}
		},
		//开票申请列表
		{
			method: 'GET',
			path: '/invoice_apply_list_data',
			handler: function(request, reply){
				invoice_apply_list_data(function(err,rows){
					if (!err) {
						return reply ({"success":true,"rows":rows.rows,"num": rows.num,"service_info":rows.service_info})
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
		//编辑商品属性
		{
			method: 'GET',
			path: '/product_edit',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				return reply.view("product_edit",{"product_id":product_id});
			}
		},
		//商品分类
		{
			method: 'GET',
			path: '/products_sorts',
			handler: function(request, reply){
				return reply.view("products_sorts");
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
				console.log("product:"+product);
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
		//头条公告发布
		{
			method: 'POST',
			path: '/down_announce',
			handler: function(request, reply){
				var id = request.payload.id;
				var data = {"id":id};
				down_announce(data,function(err,row){
					if (!err) {
						return reply({"success":true,"service_info":service_info});
					}else {
						return reply({"success":false,"message":row.message,"service_info":service_info});
					}
				});
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
						return reply({"success":true,"service_info":service_info,"rows":rows.rows,"num":rows.num});
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
				var img = request.payload.img;
				var imgs = [];
				imgs.push(img);
				if (!title || !content || !imgs) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"title":title,"content":content,"headline":headline,"imgs":JSON.stringify(imgs),"platform_code":platform_code};
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
						return reply({"success":true,"service_info":service_info,"rows":rows.rows,"num":rows.num});
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
		//得到产品分类
		{
			method: 'GET',
			path: '/search_product_sort',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				search_product_sort(product_id,function(err,rows){
					if (!err) {
						if (rows.rows.length==0) {
							return reply({"success":false,"service_info":service_info});
						}else {
							return reply({"success":true,"row":rows.rows[0],"service_info":service_info});
						}
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
				var img = request.payload.img;
				var imgs = [];
				imgs.push(img);

				if (!title || !content || !imgs) {
					return reply({"success":false,"message":"params wrong"});
				}
				var data = {"title":title,"content":content,"headline":headline,"imgs":JSON.stringify(imgs),"platform_code":platform_code};
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
						return reply({"success":true,"service_info":service_info,"rows":rows.rows,"num":rows.num});
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
				var cookie = request.state.cookie;
				var drp_admin_user_id = get_admin_id(request);
				if (!drp_admin_user_id) {
					return reply.view("login_page");
				}
				return reply.view("homePage");
			}
		},
		//商品详情页面
		{
			method: 'GET',
			path: '/product_view',
			handler: function(request, reply){
				var product_id = request.query.product_id;
				return reply.view("product_view",{"product_id":product_id});
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

				var ep =  eventproxy.create("pictures","properties","product",
					function(pictures,properties,product){
						return reply({"success":true,"message":"ok","pictures":pictures,"properties":properties,"product":product,"service_info":service_info});
				});

				find_pictures_byId(product_id,function(err,rows){
					if (!err) {
						ep.emit("pictures", rows.rows);
					}else {
						ep.emit("pictures", []);
					}
				});

				find_properties_by_product(product_id,function(err,row){
					if (!err) {
						ep.emit("properties", row.properties);
					}else {
						ep.emit("properties", []);
					}
				});

				find_product_info(product_id,function(err,row){
					if (!err) {
						ep.emit("product", row.row);
					}else {
						ep.emit("product", {});
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
				var params = request.query.params;
				if (!params) {
					return reply({"success":false,"message":"params wrong","service_info":service_info});
				}
				get_products_list(params,function(err,rows){
					if (!err) {
						if (rows.success) {
							var products = rows.rows;
							var product_ids = [];
							var sort_ids = [];
							for (var i = 0; i < products.length; i++) {
								product_ids.push(products[i].id);
								sort_ids.push(products[i].sort_id);
							}
							if (products.length ==0) {
								return reply({"success":true,"message":"ok","products":[],"service_info":service_info,"num":0});
							}
							var num = rows.num;
							search_sorts(JSON.stringify(sort_ids),function(err,rows){
								if (!err) {
									var sorts = rows.rows;
									var sorts_map = {};
									for (var i = 0; i < sorts.length; i++) {
										sorts_map[sorts[i].id] = sorts[i].sort_name;
									}
									for (var i = 0; i < products.length; i++) {
										if (products[i].sort_id) {
											products[i].sort_name = sorts_map[products[i].sort_id];
										}
									}
									find_shantao_infos(JSON.stringify(product_ids),function(err,content){
										if (!err) {
											if (content.success) {
												var shantaos = content.rows;
												for (var i = 0; i < products.length; i++) {
													var product = products[i];
													if (product.is_down == 0) {
														product.status_name = "上架";
													}else {
														product.status_name = "下架";
													}
													for (var j = 0; j < shantaos.length; j++) {
														if (shantaos[j].product_id == product.id) {
															product.is_new = shantaos[j].is_new;
															product.row_materials = shantaos[j].row_materials;
															product.size_name = shantaos[j].size_name;
															product.batch_code = shantaos[j].batch_code;
														}
													}
												}
												return reply({"success":true,"message":"ok","products":products,"num":num,"service_info":service_info,"sorts_map":sorts_map});
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
				var ep =  eventproxy.create("order","details","products","logistics_info","logistics_type",
					function(order,details,products,logistics_info,logistics_type){
						for (var i = 0; i < logistics_type.length; i++) {
							if (logistics_type[i].id == order.type) {
								order.type = logistics_type[i].name;
							}
						}
					return reply({"success":true,"order":order,"details":details,"products":products,"logistics_info":logistics_info});
				});

				get_ec_order(order_id,function(err,results){
					if (!err) {
						ep.emit("order", results.orders[0]);
						ep.emit("details", results.details);
						ep.emit("products", results.products);
					}else {
						ep.emit("order", {});
						ep.emit("details", {});
						ep.emit("products", {});
					}
				});
				get_logistics_info(order_id,function(err,results){
					if (!err) {
						ep.emit("logistics_info", results.row);
					}else {
						ep.emit("logistics_info", {});
					}
				});

				get_logistics_type(function(err,results){
					if (!err) {
						ep.emit("logistics_type", results.rows);
					}else {
						ep.emit("logistics_type", []);
					}
				});

				// get_mp_order_details(order_id,function(err,row){
				// 	if (!err) {
				// 		return reply({"success":true,"message":"ok","details":row.details,"products":row.products,"service_info":service_info});
				// 	}else {
				// 		return reply({"success":false,"message":row.message,"service_info":service_info});
				// 	}
				// });
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
						return reply({"success":true,"message":"ok","orders":row.rows,"service_info":service_info});
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
				var params = request.query.params;
				if (!params) {
					return reply({"success":false,"message":"params wrong","service_info":service_info});
				}
				mp_orders_list(params,function(err,rows){
					if (!err) {
						for (var i = 0; i < rows.rows.length; i++) {
							var order = rows.rows[i];
							order.status_name = order_status[order.order_status];
						}
						return reply({"success":true,"message":"ok","orders":rows.rows,"num":rows.num,"service_info":service_info});
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
					read_purchase_excel(path, reply);
	            }
			},
		},
		//根据订单号查询订单商品 线下
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
						return reply({"success":true,"order":order,"order_details":order_details,"pay_infos":pay_infos,"service_info":service_info});
				});
				search_order_products(order_id, function(err,row){
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
								orders[i].status_name = pos_order_status[orders[i].order_status];
							}
							list_by_ids(JSON.stringify(person_ids),function(err,content){
								if (!err) {
									if (content.success) {
										var persons = content.rows;
										for (var i = 0; i < persons.length; i++) {
											var person = persons[i];
											for (var j = 0; j < orders.length; j++) {
												if (person.person_id == orders[j].person_id) {
													orders[j].nickname = person.person_name;
												}
											}
										}
										for (var i = 0; i < orders.length; i++) {
											if (!orders[i].nickname) {
												orders[i].nickname = "";
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
				var date = new Date();
				var date1 = date.toLocaleDateString();
				var date2 = date1 +" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
				get_orders_byDate(date1,date2,function(err,rows){
					if (!err) {
						if (rows.rows.length == 0) {
							return reply({"success":true,"time":date2,"order_num":0,"total_sales":0,"total_products":0,"service_info":service_info});
						}
						var order_num = rows.rows.length;
						var total_products =  rows.prducts_num;
						var total_sales = 0;
						for (var i = 0; i < rows.rows.length; i++) {
							total_sales = total_sales + rows.rows[i].actual_price;
						}
						return reply({"success":true,"time":date2,"order_num":order_num,"total_sales":total_sales,"total_products":total_products,"service_info":service_info});
					}else {
						return reply({"success":true,"rows":rows.message,"service_info":service_info});
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
		//门店页面
		{
			method: 'GET',
			path: '/mendian_edit',
			handler: function(request, reply){
				var store_id = request.query.store_id;
				return reply.view("mendian_edit",{"store_id":store_id});
			}
		},
		//查看物流
		{
			method: 'GET',
			path: '/check_logistics',
			handler: function(request, reply){
				var order_id = request.query.order_id;
				if (!order_id) {
					return reply({"success":false,"message":"order_id null"});
				}

				var ep =  eventproxy.create("order","logistics_infos","companies","logistic_num", function(order,logistics_infos,companies,logistic_num){

						var companies_map = {};
						for (var i = 0; i < companies.length; i++) {
							companies_map[companies[i].logi_code] = companies[i].logi_name;
						}
						var company = companies_map[order.type];

						return reply({"logistics_infos":logistics_infos,"company":company,"logistic_num":logistic_num});

				});

				get_ec_order(order_id,function(err,results){
					if (!err) {
						ep.emit("order", results.orders[0]);
					}else {
						ep.emit("order", {});
					}
				});

				companies(function(err,rows){
					if (!err) {
						ep.emit("companies", rows.rows);
					}else {
						ep.emit("companies", []);
					}
				});

				get_logistics_id(order_id,function(err,rows){
					if (!err) {
						var logistics = rows.rows;
						var logistic_num = "";
						for (var i = 0; i < logistics.length; i++) {
							var logistic_num = logistic_num + logistics[i].logi_id;
						}
						ep.emit("logistic_num", logistic_num);
					}else {
						ep.emit("logistic_num", "");
					}
				});

				get_logistics_infos(order_id, function(err,rows){
					if (!err) {
						ep.emit("logistics_infos", rows.rows);
					}else {
						ep.emit("logistics_infos", []);
					}
				});

			}
		},


	]);

    next();
};

exports.register.attributes = {
    name: 'admin_controller'
};
