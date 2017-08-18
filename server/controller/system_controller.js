/**
 ┌──────────────────────────────────────────────────────────────┐
 │               ___ ___ ___ ___ ___ _  _ ___ ___               │
 │              |_ _/ _ \_ _/ _ \_ _| \| | __/ _ \              │
 │               | | (_) | | (_) | || .` | _| (_) |             │
 │              |___\___/___\___/___|_|\_|_| \___/              │
 │                                                              │
 │                                                              │
 │                       set up in 2015.2                       │
 │                                                              │
 │   committed to the intelligent transformation of the world   │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
*/

var _ = require('lodash');
var moment = require('moment');
var eventproxy = require('eventproxy');
const uu_request = require('../utils/uu_request');

var moduel_prefix = 'drp_admin_system';

exports.register = function(server, options, next) {

    var cookie_options = {ttl:10*365*24*60*60*1000};

    var get_view = function(view) {
        return _.template('<%= view %>')({
            'view': view
        });
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
    server.route([
        //返回menu菜单列表
        {
            method: 'GET',
            path: '/menu_list',
            handler: function(request, reply){
                //登录者信息
                var user_id = request.query.user_id;
                if (!user_id) {
                    user_id = "1";
                }
                var url = "http://139.196.148.40:18666/menu_list?user_id="+user_id;
                uu_request.do_get_method(url,function(err,content){
                    return reply({"success":true,"rows":content.rows,"message":"ok"});
                });
            }
        },

        //登录页面
        {
            method: 'GET',
            path: '/login',
            handler: function(request, reply) {
                return reply.view(get_view("login"), {});
            },
        },

        //登录验证
        {
            method: 'POST',
            path: '/login_check',
            handler: function(request, reply) {
                var username = request.payload.username;
                var password = request.payload.password;

                if (!username || !password) {
                    return reply({"success":false,"message":"param is null"});
                }
                var data = {
                    "username":username,
                    "password":password,
                    "org_code":"ioio",
                    "platform_code":"drp_admin"
                };
                var url = "http://139.196.148.40:18666/user/login_check";
                uu_request.do_post_method(url,data,function(err,content) {
                    if (!err) {
                        if (content.success) {
                            var person_id = content.row.person_id;
                            if (!person_id) {
                                return reply({"success":false,"message":"no account"});
                            }
                            var cookie = request.state.cookie;
                            if (!cookie) {
                                cookie = {};
                            }
                            cookie.drp_admin_user_id = person_id;
                            return reply({"success":true}).state('cookie', cookie, cookie_options);
                        }else {
                            return reply({"success":false,"message":content.message});
                        }
                    }else {
                        return reply({"success":false,"message":content.message});
                    }
                });
            },
        },

        //退出
        {
            method: 'GET',
            path: '/logout',
            handler: function(request,reply) {
                var cookie = request.state.cookie;
                    if (!cookie) {
                        cookie = {};
                    }
                    delete cookie.drp_admin_user_id;

                    return reply.redirect("/").state("cookie",cookie,cookie_options);
            },
        },

        //查询用户信息
        {
            method: 'GET',
            path: '/user/login_info',
            handler: function(request,reply) {
                var drp_admin_user_id = get_admin_id(request);

                var url = "http://139.196.148.40:18003/person/get_by_id?person_id="+drp_admin_user_id;
                uu_request.do_get_method(url,function(err,content){
                    if (!err) {
                        return reply({"success":true,"rows":content.rows,"message":"ok"});
                    }else {
                        return reply({"success":false,"message":err,"message":"ok"});
                    }
                });
            }
        },

        //系统设置页面
        {
            method: 'GET',
            path: '/setting',
            handler: function(request, reply) {
                return reply.view(get_view("setting"), {});
            },
        },

        //系统信息页面
        {
            method: 'GET',
            path: '/about',
            handler: function(request, reply) {
                return reply.view(get_view("about"), {});
            },
        },

        //商品折扣
        {
            method: 'GET',
            path: '/discount_price',
            handler: function(request, reply) {
                return reply.view(get_view("discount_price"), {});
            },
        },

        //商品折扣历史
        {
            method: 'GET',
            path: '/discount_history',
            handler: function(request, reply) {
                return reply.view(get_view("discount_history"), {});
            },
        },

    ]);

    next();
}

exports.register.attributes = {
    name: moduel_prefix
};
