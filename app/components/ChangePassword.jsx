var React = require('react');

// 修改密码弹出层
class ChangePassword extends React.Component {
    render() {
        return (
            <div className="modal fade bs-example-modal-sm" tabIndex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
            <div className="modal-dialog modal-sm" role="document">
            <div className="modal-content modal_content_padding">
            <a href="/logout" className="btn btn-primary btn-sm active" role="button">退出登录</a>
            <a href="/change_password" className="btn btn-default btn-sm active" role="button">修改密码</a>
            </div>
            </div>
            </div>
        );
    }
};

module.exports = ChangePassword;