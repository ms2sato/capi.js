var request = require('../http/request')
    ;

/**
 * facebookに問い合わせてトークンが正しいかをチェックする
 * @param token アクセストークン
 * @param appid facebook appId
 * @returns 正しければ真、さもなくば偽。
 */
exports.checkToken = function(token, appid){

    return request.request('https://graph.facebook.com/app?access_token=' +  token, {json: true}).then(function(ret){
        console.dir(ret);
        console.log(appid);
        return ret.body.id == appid;
    });

}