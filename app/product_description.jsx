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

// 右侧下部表格
class Right extends React.Component {

    constructor(props) {
        super(props);
        this.handleClick=this.handleClick.bind(this);
    }
    componentDidMount() {
        ue = UM.getEditor('descript_infor');
        $.ajax({
             url: "/search_descriptions",
             dataType: 'json',
             type: 'GET',
             data:{"product_id":product_id},
             success: function(data) {
                var description = data.row[0].description;
                ue.setContent(description);
             }.bind(this),
             error: function(xhr, status, err) {
             }.bind(this)
        });

    }
    handleClick(e) {
        var description = ue.getContent();
        $.ajax({
            url: "/update_product_description",
            dataType: 'json',
            type: 'POST',
            data: {"product_id":product_id,"description":description},
            success: function(data) {
                if (data.success) {
                    alert("保存成功！");
                }else {
                    alert("保存失败！");
                }
            }.bind(this),
            error: function(xhr, status, err) {
            }.bind(this)
        });



    }
    render() {
        var breadcrumb = [];
        breadcrumbs.map(function(item,idx) {
            if (idx==breadcrumbs.length-1) {
                breadcrumb.push(<li key={item} className="active">{item}</li>);
            } else {
                breadcrumb.push(<li key={item}>{item}</li>);
            }
        });
        return (
            <div className="wrapRight wrapRight_form col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2">
                <ol className="breadcrumb margin_top20">
                    {breadcrumb}
                </ol>
                <div className="row descript">
                    <p className="col-md-3 col-sm-3">商品id: {product_id}</p>
                </div>
                <div className="row">
                    <textarea className="descript_infor" id="descript_infor" ></textarea>
                </div>
                <div><button className="btn button_background1 button_white margin_right pull-right" type="button"  onClick={this.handleClick}>保 存</button></div>
            </div>
        );
    }
};



// 返回到页面
ReactDOM.render(
    <Wrap/>,
    document.getElementById("content")
);
