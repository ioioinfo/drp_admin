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

var moduel_prefix = 'drp_admin_full_text';

exports.register = function(server, options, next) {

    var cookie_options = {ttl:10*365*24*60*60*1000};

    var get_view = function(view) {
        return _.template('<%= view %>')({
            'view': view
        });
    };
    
    server.route([
        //全文检索页面
        {
            method: 'GET',
            path: '/full_text_search',
            handler: function(request, reply) {
                return reply.view(get_view("full_text_search"), {});
            },
        },
        
    ]);

    next();
}

exports.register.attributes = {
    name: moduel_prefix
};