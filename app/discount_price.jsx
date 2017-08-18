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
        this.setPage=this.setPage.bind(this);
        this.handleSort=this.handleSort.bind(this);
        this.loadData=this.loadData.bind(this);
        this.refresh=this.refresh.bind(this);
        // 初始化一个空对象
        this.state = {tabthitems:[],tabtritems:tabtritems,allNum:0,everyNum:20,thisPage:1,sort:{name:"",dir:""}};
    }
    loadData(params1,data) {
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
    refresh(id,status_name){
        var tritems = this.state.tabtritems;
        var st = "上架";
        if (status_name == "上架") {
            st = "下架";
        }else if (status_name == "下架") {
            st = "上架";
        }
        for(var i=0;i<tritems.length;i++){
            if(id==tritems[i].id){
                tritems[i].status_name=st;
            }
        }
        this.setState({tabtritems:tritems});
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
            <SearchList loadData={this.loadData} tabtritems={this.state.tabtritems} />
            <Table tabthitems={this.state.tabthitems} tabtritems={this.state.tabtritems} sort={this.state.sort} onSort={this.handleSort} refresh={this.refresh} />
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
        this.onKeyPress = this.onKeyPress.bind(this);
    }
    onKeyPress(e){
      var key = e.which;
        if (key== 13) {
          var barcode = $("#discount_price").val();
          $.ajax({
           url: "/get_product_info",
           dataType: 'json',
           type: 'GET',
           data:{'barcode':barcode},
           success: function(data) {
            if(data.success){
              tabtritems.push(data.row);
              console.log(tabtritems);
              this.props.loadData({});
            }else{
              console.log("111");
              alert("没有此商品");
            }

           }.bind(this),
           error: function(xhr, status, err) {
           }.bind(this)
       });
      };

    }
    handleClick(e){
      var discount = $(".discount_price_number").val();
      console.log(discount);
      var product_ids=[];
      for (var i = 0; i < tabtritems.length; i++) {
        product_ids.push(tabtritems[i].id);
      }
      $.ajax({
           url: "/update_products_prices",
           dataType: 'json',
           type: 'POST',
           data:{'product_ids': JSON.stringify(product_ids),
                  'person_id':"1",'discount':discount,'remark':"正常改价"},
           success: function(data) {
             console.log(data.rows);
           }.bind(this),
           error: function(xhr, status, err) {
           }.bind(this)
      });

      this.props.loadData({});

    };

    render() {
        return (
            <div className="row search_margin_botton">
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control product_id" placeholder="编号..." readOnly="readOnly"/>
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control product_name" placeholder="名称..." readOnly="readOnly"/>
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-3 col-sm-3 show-grid">
            <div className="input-group">
            <input type="text" className="form-control host_name" id="discount_price" placeholder="编码..." onKeyPress={this.onKeyPress} />
            <span className="input-group-btn">
            </span>
            </div>
            </div>
            <div className="col-lg-2 col-sm-2 show-grid">
            <div className="input-group">
            <input type="text" className="form-control discount_price_number" placeholder="折扣..." />
            </div>
            </div>
            <div className="col-lg-1 col-sm-1 show-grid">
            <div className="input-group">
            <span className="input-group-btn">
            <button className="btn btn-default" id="search_botton_left" type="button" onClick={this.handleClick}>确认</button>
            </span>
            </div>
            </div>
            </div>
        )
    }
};


// 返回到页面
ReactDOM.render(
    <Wrap/>,
    document.getElementById("content")
);
