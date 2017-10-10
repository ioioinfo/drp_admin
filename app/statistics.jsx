var React = require('react');
var ReactDOM = require('react-dom');

var Logo = require('Logo');
var WrapRightHead = require('WrapRightHead');
var Left = require('Left');
var WrapBottom = require('WrapBottom');
var ChangePassword = require('ChangePassword');


import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

function statistics(state, action) {
  switch (action.type) {
  case 'STATISTIC_DETAIL':
    {
        var date1 = action.date1;
        if (!date1) {
            date1 = "";
        }
        var store_id = state.store_id;
        if (!store_id) {
            store_id = "";
        }

      $.ajax({
         url: '/get_orders_byDate?date='+date1+"&store_id=" + store_id,
         dataType: 'json',
         type: 'GET',
         success: function(data) {
           if (data.success) {
             store.dispatch({ type: 'GET_DATA', data: data});
           }else {
           }
         }.bind(this),
         error: function(xhr, status, err) {
         }.bind(this)
      });

      return state;
    }
  case 'GET_DATA':
  {
    var data = action.data;
    var mendian_items = state.mendian_items;
    return {item:data,pay_map:data.pay_map,pay_ways:data.pay_ways,mendian_items:mendian_items,store_id:state.store_id,date1:state.date1};
  }
  case 'MENDIAN_DETAIL':
    {
      $.ajax({
         url: '/store_list',
         dataType: 'json',
         type: 'GET',
         success: function(data) {
           if (data.success) {
             store.dispatch({ type: 'GET_DATA1', mendian_data: data});
           }else {
           }
         }.bind(this),
         error: function(xhr, status, err) {
         }.bind(this)
      });

      return state;
    }
  case 'GET_DATA1':
  {
    var mendian_data = action.mendian_data;
    return {item:state.item, pay_map:state.pay_map, pay_ways:state.pay_ways, mendian_items:mendian_data.rows,store_id:state.store_id,date1:state.date1};
  }
case 'SEARCH_DETAIL':
    {
        var store_id = action.store_id;
        return {item:state.item, pay_map:state.pay_map, pay_ways:state.pay_ways, mendian_items:state.mendian_items,store_id:store_id,date1:state.date1};
    }
  default:
    return state
  }
}

let store = createStore(statistics,{item:{},pay_map:{},pay_ways:[],mendian_items:[],store_id:"",date1:""});

const mapStateToProps = (state) => {
    return {
        item: state.item,
        pay_map: state.pay_map,
        pay_ways: state.pay_ways,
        mendian_items: state.mendian_items,
        store_id: state.store_id,
        date1: state.date1,

    }
}


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


class MiddleClass extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    componentDidMount() {
        store.dispatch({ type: 'MENDIAN_DETAIL'});
    }
    handleChange(id){
        $('.mendian_infor').removeClass('mendian_back');
        $('.mendian_infor'+id).addClass('mendian_back');

        store.dispatch({ type: 'SEARCH_DETAIL',store_id:id});
    }
    handleClick(e){
        var date1 = $('#time').val();

        store.dispatch({ type: 'STATISTIC_DETAIL', date1:date1});
    }
    render() {
        var time = this.props.item.time;
        var total_sales = this.props.item.total_sales;
        var order_num = this.props.item.order_num;
        var total_products = this.props.item.total_products;
        return (
            <div className="statistics_middle">
                <p className="back">统计时间:{time}</p>
                <div className="col-sm-12 col-md-6 statistics_middle_left_border">
                    <h3>选择门店</h3>
                    <div className="meidian_wrap">
                        {this.props.mendian_items.map((item,index )=> (
                            <div className="mendian_list col-sm-6 col-md-4 " key={index}>
                                <div className={"mendian_infor  mendian_infor"+item.org_store_id} onClick={this.handleChange.bind(this,item.org_store_id)}>{item.org_store_name}</div>
                            </div>
                        ))
                        }

                    </div>

                    <h3 className="margin_top"> 时间查询</h3>
                    <div className="input-group">
                        <input type="text" className="form-control" id="time" placeholder="输入查询如期例如 ‘2017-01-01’"/>
                        <span className="input-group-addon" onClick={this.handleClick}>查询</span>
                    </div>
                </div>
                <div className="col-sm-12 col-md-6 statistics_middle_right">
                    <div className="col-xs-6 col-sm-6 number"><p>￥{total_sales}</p><p>营业额</p></div>
                    <div className="col-xs-6 col-sm-6 number"><p>{order_num}</p><p>订单数</p></div>
                    <div className="col-xs-6 col-sm-6 number"><p>{total_products}</p><p>件数</p></div>
                    {this.props.pay_ways.map((item,index )=> (
                        <div className="col-xs-6 col-sm-6 number" key={index}><p>￥{this.props.pay_map[item]}</p><p>{item}</p></div>
                    ))
                    }
                </div>
            </div>
        );
    }
};
const Middle = connect(mapStateToProps)(MiddleClass);
// 返回到页面
ReactDOM.render(
    <Provider store={store}>
    <Wrap/>
    </Provider>,
    document.getElementById("content")
);
