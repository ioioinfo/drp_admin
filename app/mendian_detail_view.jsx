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
                <Middle/>
            </div>
        );
    }
};


class Middle extends React.Component {
    constructor(props) {
        super(props);
        // 初始化一个空对象
        this.state = {item: {pictures:[]},pictures:[]};
    }

    componentDidMount() {
        $.ajax({
             url: "/mendian_detail",
             dataType: 'json',
             type: 'GET',
             data:{"store_id":store_id},
             success: function(data) {
                this.setState({item:data.row,pictures:data.row.pictures});
                var org_store_id=this.state.item.org_store_id;
                var org_store_code=this.state.item.org_store_code;
                var org_store_name=this.state.item.org_store_name;
                var open_date_text=this.state.item.open_date_text;
                var remark=this.state.item.remark;
                var address=this.state.item.points[0].province+this.state.item.points[0].city+this.state.item.points[0].district+this.state.item.points[0].detail_address;
                $("#org_store_id").val(org_store_id);
                $("#org_store_code").val(org_store_code);
                $("#org_store_name").val(org_store_name);
                $("#open_date_text").val(open_date_text);
                $("#remark").val(remark);
                $("#address").val(address);

             }.bind(this),
             error: function(xhr, status, err) {
             }.bind(this)

        });
    };
    render() {
      var style={width:"20%"};
        return (
            <div className="statistics_middle ">
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">门店id: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="org_store_id"  readOnly/>
                    </div>
                </div>
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">门店序号: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="org_store_code"  readOnly/>
                    </div>
                </div>
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">门店名称: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="org_store_name" readOnly />
                    </div>
                </div>
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">开店时间: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="open_date_text" readOnly />
                    </div>
                </div>
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">地址: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="address"  readOnly/>
                    </div>
                </div>
                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <label className="col-sm-3 col-md-2 control-label">备注: </label>
                    <div className="col-sm-5">
                      <input className="form-control" type="text" id="formGroupInputSmall" id="remark" readOnly />
                    </div>
                </div>

                <div className="form-group form-group-sm overflow">
                    <div className="col-sm-3"></div>
                    <div className="col-sm-8">
                    {this.state.item.pictures.map(item => (
                      <img key={item.id} src={"images/"+item.location} style={style} />))
                    }

                    </div>
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
