var React = require('react');

// 左边导航
class Left extends React.Component {
    render() {
        return (
            <div className="wrapLeftWarp col-sm-3 col-md-2 sidebar">
            <div className="wrapLeft">
            <Nav/>
            </div>
            </div>
        );
    }
};

// 左侧导航具体导航
class Nav extends React.Component {
    // 2
    constructor(props) {
        super(props);
        // 初始化一个空对象
        this.setSelected = this.setSelected.bind(this);
        this.state = {items: [],selected:default_selected};
    }

    setSelected(id){
        this.setState({selected: id});

    }
    // 3
    componentDidMount() {
        $.ajax({
            url: "/menu_list",
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                this.setState({items: data.rows});
            }.bind(this),
            error: function(xhr, status, err) {
            }.bind(this)
        });
    }

    // 1
    render() {

        return (
            <div className="wrapLeftNav">
            <ul className="wrapLeftNav_ul">
            {this.state.items.map(item => (
                <Li key={item.id} item={item} setSelected={this.setSelected} selected={this.state.selected} />))
            }
            </ul>
            </div>
        );
    }
};

//一级导航
class Li extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e){
        this.props.setSelected(this.props.item.code);
    }
    render() {
        var c = "";
        var d = <div></div>;
        var img = this.props.item.img;
        
        if(this.props.selected==this.props.item.code){
            c = "on";
            img = this.props.item.img2;
            d = (<div>
                {this.props.item.child.map(item => (
                    <Secondnav key={item.id} item={item}  />))
                }
            </div>);
        }
        return (
            <div>
            <li className={c} onClick={this.handleClick}>
            <span><img src={img} alt="" /></span>
            <span className="wrapLeftNav_word">{this.props.item.name}</span>
            </li>
            {d}
            </div>
        );
    }
};

// 二级导航
class Secondnav extends React.Component {
    render() {
        var img=this.props.item.img;
        return (
            <div className="second_nav">
            <a href={this.props.item.href}>
            <div className="second_navInfor">
            <img src={img} />
            <p>{this.props.item.name}</p>
            </div>
            </a>
            </div>
        );
    }
};

module.exports = Left;