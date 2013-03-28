var _ = require('underscore'),
    passport = require('passport');


exports.Util = function(){
}

exports.Util.setupRoute = function(app, options){

    options = _.defaults(options, {
        loginPath: '/auth/facebook/login',
        callbackPath:'/auth/facebook/callback',
        logoutPath:'/auth/facebook/logout'
    });

    app.get(options.loginPath, function (req, res, next) {
        req.session.facebookredirectTo = req.headers.referer;

        var opt = {
            scope:options.scope
        };

        var ua = req.headers['user-agent'];
        if(ua.indexOf('iPhone') != -1 || ua.indexOf('iPad') != -1 || ua.indexOf('Android') != -1){
            opt.display = 'touch';
        }

        passport.authenticate('facebook',
            opt
        )(req, res, next);
    });

    app.get(options.callbackPath,
        passport.authenticate('facebook', {
            failureRedirect:'/fail'
        }), function (req, res) {
            var redirectTo = req.session.facebookredirectTo;
            if (redirectTo) {
                res.redirect(redirectTo);
                delete req.session.facebookredirectTo;
                return;
            }
            res.redirect('/');
        });

    app.get(options.logoutPath, function(req, res, next){
        delete req.session.passport;
        var to = req.headers.referer;
        if(!to || to.length == 0){
            to = '/';
        }
        res.redirect(to);
    });

}

