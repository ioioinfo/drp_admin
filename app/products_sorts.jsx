var React = require('react');
var ReactDOM = require('react-dom');

var Logo = require('Logo');
var WrapRightHead = require('WrapRightHead');
var Left = require('Left');
var Table = require('Table');
var PageTab = require('PageTab');
var WrapBottom = require('WrapBottom');
var ChangePassword = require('ChangePassword');

// 框架
class Wrap extends React.Component {
    render() {
        return (
            <div className="wrap">
            <nav className="navbar navbar-inverse navbar-fixed-top">
            <div className="container-fluid">
            <Logo />
            <WrapRightHead />
            </div>
            </nav>
            <div className="container-fluid">
            <div className="row">
            <Left />
            <Right />
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
        this.setPage=this.setPage.bind(this);
        this.handleSort=this.handleSort.bind(this);
        this.loadData=this.loadData.bind(this);
        // 初始化一个空对象
        this.state = {tabthitems:[],tabtritems:[],allNum:0,everyNum:20,thisPage:1,sort:{name:"",dir:""}};
    }
    loadData(params1) {
        var params = {thisPage:this.state.thisPage,sort:this.state.sort};
        $.extend(params,params1);

        getTableData(params,function(data) {
            $.extend(data,params1);
            this.setState(data);
        }.bind(this));
    }
    componentDidMount() {
        this.loadData({});
    }
    setPage(thisPage) {
        this.loadData({thisPage:thisPage});
    }
    handleSort(sort){
        this.loadData({sort:sort});
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
            <SearchList loadData={this.loadData}/>
            <Table tabthitems={this.state.tabthitems} tabtritems={this.state.tabtritems} sort={this.state.sort} onSort={this.handleSort} checkTd={checkTd} />
            <PageTab setPage={this.setPage} allNum={this.state.allNum} everyNum={this.state.everyNum} thisPage={this.state.thisPage} />
            </div>
        );
    }
};

//  搜索框
class SearchList extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick(e){
        var product_name = $(".product_name").val();
        var product_id = $(".product_id").val();

        var params1 = {"product_name":product_name,"product_id":product_id};

        this.props.loadData(params1);

    };
    render() {
        return (
            <div className="row search_margin_botton">
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control product_id" placeholder="编号..." />
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control product_name" placeholder="名称..." />
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control host_name" placeholder="编码..." />
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-2 col-sm-2 show-grid">
            <div className="input-group">
            <input type="text" className="form-control ip_address" placeholder="批次..." />
            </div>
            </div>
            <div className="col-lg-1 col-sm-1 show-grid">
            <div className="input-group">
            <span className="input-group-btn">
            <button className="btn btn-default" id="search_botton_left" type="button" onClick={this.handleClick}>查询</button>
            </span>
            </div>
            </div>
            </div>
        )
    }
};

//判断特殊列
var checkTd = function(defaultTd) {
    var id = this.props.item.id;
    var href = "noob_sort?product_id="+id;
    var href1 = "master?product_id="+id;
    
    if(this.props.thitem.type=="operation"){
        return (
            <td><span className="btn btn-primary btn-xs operate_announce"><a href={href}>菜鸟</a></span>
            <span className="btn btn-info btn-xs operate_announce"><a href={href1}>高手</a></span></td>
        );
    }else {
        return defaultTd;
    }
};

// 返回到页面
ReactDOM.render(
    <Wrap/>,
    document.getElementById("content")
);