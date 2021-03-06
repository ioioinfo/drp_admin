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

module.exports = {
    entry: {
        index: './app/app.jsx',
        products_sorts: './app/products_sorts.jsx',
        products_center: './app/products_center.jsx',
        statistics: './app/statistics.jsx',
        return_view: './app/return_view.jsx',
        inventory_search: './app/inventory_search.jsx',
        product_description: './app/product_description.jsx',
        poor_orders: './app/poor_orders.jsx',
        mendian_edit: './app/mendian_edit.jsx',
        mendian_detail_view: './app/mendian_detail_view.jsx',
        discount_price: './app/discount_price.jsx',
        discount_history: './app/discount_history.jsx',
        recharge_orders: './app/recharge_orders.jsx',
    },
    output: {
        path: __dirname,
        filename: './public/js/app/[name].js'
    },
    resolve: {
        modules: [__dirname, '../node_modules','components'],
        alias: {

        },
        extensions: ['.js','.jsx']
    },
    module: {
        loaders: [
            {
                loader: 'babel-loader',
                query: {
                    presets: ['react', 'es2015']
                },
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/
            }
        ]
   }
};
