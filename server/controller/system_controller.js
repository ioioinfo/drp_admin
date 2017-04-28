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
        
    ]);

    next();
}

exports.register.attributes = {
    name: moduel_prefix
};