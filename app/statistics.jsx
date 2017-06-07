var React = require('react');
var ReactDOM = require('react-dom');

var Logo = require('Logo');
var WrapRightHead = require('WrapRightHead');
var Left = require('Left');
var WrapBottom = require('WrapBottom');
var ChangePassword = require('ChangePassword');

// 框架
class Wrap extends React.Component {
    render() {
        return (
            <div className="wrap">
            <nav className="navbar navbar-inverse navbar-fixed-top">
            <div className="container-fluid">
            <Logo/>
            <WrapRightHead/>
            </div>
            </nav>
            <div className="container-fluid">
            <div className="row">
            <Left/>
            <Right/>
            </div>
            </div>
            <ChangePassword/>
            </div>
        );
    }
};
// 统计
class Right extends React.Component {
    render() {
        return (
            <div className="wrapRight wrapRight_form col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2">
                <Middle/>
            </div>
        );
    }
};


class Middle extends React.Component {
    constructor(props) {
        super(props);
        // 初始化一个空对象
        this.state = {items: {}};
    }

    componentDidMount() {
        $.ajax({
          url: "/get_orders_byDate",
          dataType: 'json',
          type: 'GET',
          success: function(data) {
              this.setState({items:data});
          }.bind(this),
          error: function(xhr, status, err) {
          }.bind(this)
      });
    }
    render() {
        var time = this.state.items.time;
        var total_sales = this.state.items.total_sales;
        var order_num = this.state.items.order_num;
        var total_products = this.state.items.total_products;
        return (
            <div className="statistics_middle">
                <p className="back">统计时间:{time}</p>
                <div className="col-xs-6 col-sm-6 number number1"><p>￥{total_sales}</p><p>营业额</p></div>
                <div className="col-xs-6 col-sm-6 number number2"><p>{order_num}</p><p>订单数</p></div>
                <div className="col-xs-6 col-sm-6 number number3"><p>{total_products}</p><p>件数</p></div>
                <div className="col-xs-6 col-sm-6 number number4"><p>暂无</p></div>
            </div>
        );
    }
};
// 返回到页面
ReactDOM.render(
    <Wrap/>,
    document.getElementById("content")
);
