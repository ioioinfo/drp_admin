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
          url: "/return_view_data",
          dataType: 'json',
          type: 'GET',
          data:{"id":id},
          success: function(data) {
              this.setState({items:data.row});
          }.bind(this),
          error: function(xhr, status, err) {
          }.bind(this)
      });
    }
    render() {
        return (
            <div className="statistics_middle">
                <div className="row">
                    <div className="col-sm-6 col-xs-6 return_view_style">{this.state.items.product_id}</div>
                    <div className="col-sm-6 col-xs-6 return_view_style">{this.state.items.return_reason}</div>
                    <div className="col-sm-6 col-xs-6 return_view_style">{this.state.items.number}</div>
                    <div className="col-sm-6 col-xs-6 return_view_style">{this.state.items.created_at}</div>
                </div>
            </div>
        );
    }
};
// 返回到页面
ReactDOM.render(
    <Wrap/>,
    document.getElementById("content")
);
