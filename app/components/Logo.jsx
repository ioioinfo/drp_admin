var React = require('react');

// 左边导航头部
class Logo extends React.Component {
    render() {
        return (
            <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand" href="/">电商后台</a>
            </div>
        );
    }
};

module.exports = Logo;