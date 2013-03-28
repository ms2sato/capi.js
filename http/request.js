var Promise = require('node-promise').Promise,
    request = require('request');

exports.request = function(url, options){
    var promise = new Promise();

    var callback = function(err, response, body){

        if(err){
            promise.reject(err);
            return;
        }

        if(response.statusCode != 200){
            var error = new Error('ResponseCode: ' + response.statusCode());
            error.response = response;
            promise.reject(err);
            return;
        }

        promise.resolve({
            response: response,
            body: body
        });

    };

    if(!options) request(url, callback);
    else request(url, options, callback);

    return promise;
}


