var React = require('react');

// 右侧头部
class WrapRightHead extends React.Component {
    componentDidMount() {
        $.ajax({
            url: "/user/login_info",
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                if(data.row){
                  $(".head_user_name li:nth-child(2) a").html(data.row.name);
                }

            }.bind(this),
            error: function(xhr, status, err) {
            }.bind(this)
        });
    }
    render() {
        return (

            <div id="navbar" className="navbar-collapse collapse">
            <ul className="nav navbar-nav navbar-right head_user_name">
            <li><a><img src="images/houtai_touxiang1.png" alt="" /></a></li>
            <li><a  data-toggle="modal" data-target=".bs-example-modal-sm">管理员1</a></li>
            </ul>
            <form className="navbar-form navbar-right">
            <input type="text" className="form-control" placeholder="搜索..." />
            </form>
            </div>

        );
    }
};

module.exports = WrapRightHead;
