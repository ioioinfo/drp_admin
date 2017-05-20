var React = require('react');

// 分页
class PageTab extends React.Component {
    constructor(props) {
        super(props);
        this.gotoFirst=this.gotoFirst.bind(this);
        this.gotoPrevious=this.gotoPrevious.bind(this);
        this.gotoLast=this.gotoLast.bind(this);
        this.gotoNext=this.gotoNext.bind(this);
    }
    gotoFirst(){
        this.props.setPage(1);
    }
    gotoPrevious(){
        this.props.setPage(this.props.thisPage-1);
    }
    gotoLast(){
        var allNum=this.props.allNum;
        // 每页显示条数everyNum
        var everyNum=this.props.everyNum;
        var allPage=Math.ceil(allNum/everyNum);
        this.props.setPage(allPage);
    }
    gotoNext(){
        this.props.setPage(this.props.thisPage+1);
    }
    render() {
        //分页显示页数
        var display_page = 11;
        var mid_page =(display_page - 1)/2;
        var fenitems =[];
        // 所有条数allNum
        var allNum=this.props.allNum;
        // 每页显示条数everyNum
        var everyNum=this.props.everyNum;
        // 当前显示页thisPage
        var thisPage=this.props.thisPage;
        var allPage=Math.ceil(allNum/everyNum);
        if(allPage<=display_page){
            for(var i=1; i<=allPage; i++){
                fenitems.push(i);
            }
        }else {
            if(thisPage-mid_page<=1){
                for(var i=1; i<=display_page; i++){
                    fenitems.push(i);
                }
            } else if (thisPage+mid_page>=allPage) {
                for(var i=allPage-mid_page*2; i<=allPage; i++){
                    fenitems.push(i);
                }
            } else {
                for(var i=thisPage-mid_page; i<=thisPage+mid_page; i++){
                    fenitems.push(i);
                }
            }
        }
        var first = (<span className="table-tab-span1" onClick={this.gotoFirst}><img src="images/httab4.png" alt="" /></span>);
        var previous=(<li className="" onClick={this.gotoPrevious}><span aria-hidden="true">&laquo;</span></li>);
        var last=(<span className="table-tab-span1" onClick={this.gotoLast}><img src="images/httab2.png" alt="" /></span>);
        var next=(<li className="" onClick={this.gotoNext}><span aria-hidden="true">&raquo;</span></li>);

        if (thisPage==1) {
            var first = (<span className="table-tab-span1" ><img src="images/httab4_1.png" alt="" /></span>);
            var previous=(<li className="disabled"><span aria-hidden="true">&laquo;</span></li>);
        }
        if(thisPage==allPage){
            var last = (<span className="table-tab-span1" ><img src="images/httab2_1.png" alt="" /></span>);
            var next=(<li className="disabled"><span aria-hidden="true">&raquo;</span></li>);
        }
        return (
            <div>
            <nav aria-label="Page navigation" className="nav_text">
            <ul className="pagination">
            {previous}
            {fenitems.map(item => (
                <PageLi key={item} setPage={this.props.setPage} item={item} setSelected={this.setSelected} selected={thisPage} />))
            }
            {next}
            </ul>
            </nav>
            <p className="pull-right">
            <span className="table-tab-span4">共{allPage}页</span>
            <span className="table-tab-span5">共{allNum}条记录</span>
            </p>
            </div>
        );
    }
};
// 分页数字
class PageLi extends React.Component {
    constructor(props) {
        super(props);
        // 初始化一个空对象
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick(e){
        this.props.setPage(this.props.item);
    }
    render() {
        var c = "";
        if (this.props.item == this.props.selected) {
            c = "active";
        }
        return (
            <li className={c} onClick={this.handleClick}><a>{this.props.item}</a></li>
        );
    }
};

module.exports = PageTab;