// Base routes for default index/root path, about page, 404 error pages, and others..
exports.register = function(server, options, next){

	server.expose('purchase_orders', require('./purchase_orders.js')(server));
	server.expose('purchase_orders_details', require('./purchase_orders_details.js')(server));
	next();
}

exports.register.attributes = {
    name: 'models'
};
