var React = require('react');

// 表格
class Table extends React.Component {
    render() {
        return (
            <div className="table-responsive">
            <div className="form-inline-wrap">
            <table className="table table-striped table-hover">
            <thead>
            <tr>
            {this.props.tabthitems.map(item => (
                <Th key={item.name} item={item} sort={this.props.sort} onSort={this.props.onSort} />))
            }
            </tr>
            </thead>
            <tbody>
            {this.props.tabtritems.map(item => (
                <Tr key={item.id} item={item} tabthitems={this.props.tabthitems} checkTd={this.props.checkTd} />))
            }
            </tbody>
            </table>
            </div>
            </div>
        );
    }
};
class Tr extends React.Component {
    constructor(props) {
        super(props);

        // 初始化一个空对象
        this.state = {};
    }

    render() {
        return (
            <tr>
            {this.props.tabthitems.map(item => (
                <Td key={item.name} item={this.props.item} thitem={item} checkTd={this.props.checkTd} />))
            }
            </tr>
        );
    }
};
class Th extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick=this.handleClick.bind(this);
    }
    handleClick(e){
        var sort = this.props.sort;
        if (!sort) {
            sort = {name:"",dir:""};
        }

        if (sort.name != this.props.item.name) {
            sort.dir = "";
        }
        sort.name = this.props.item.name;
        //排序顺序
        if (sort.dir == "asc") {
            sort.dir = "desc";
        } else {
            sort.dir = "asc";
        }

        this.props.onSort(sort);
    }
    render() {
        var img= <span></span>;
        if (this.props.item.sort) {
            var sort = this.props.sort;
            if (sort && sort.name == this.props.item.name) {
                if (sort.dir == "desc") {
                    img = <span><img src="images/htpaixu.png" alt="" onClick={this.handleClick}/></span>;
                } else {
                    img = <span><img src="images/htpaixu1.png" alt="" onClick={this.handleClick}/></span>;
                }
            } else {
                img = <span><img src="images/htpaixu2.png" alt="" onClick={this.handleClick}/></span>;
            }
        }
        var thStyle = {
            width:this.props.item.width
        };
        return (
            <th style={thStyle}>{this.props.item.title} {img}</th>
        );
    }
};

class Td extends React.Component {
    render() {
        var defaultTd = (<td>{this.props.item[this.props.thitem.name]}</td>);
        var checkTd = this.props.checkTd;
        
        if (checkTd) {
            checkTd = checkTd.bind(this);
            return checkTd(defaultTd);
        } else {
            return defaultTd;
        }
    }
};

module.exports = Table;