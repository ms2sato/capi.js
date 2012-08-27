(function(){

    var FileAPI = require('file-api');
    var FormData = FileAPI.FormData;

    /**
     * send multipart-form request
     * @param options
     */
    var Multipart = function(options){
        this.http = options.http;
        this.chunked = options.chunked;
    };

    Multipart.prototype = {

        /**
         * request
         * @param options same as http.request's options
         * @param callback same as http.request's callback
         * @return http.ClientRequest
         */
        request: function(formData, options, callback){
            return requestForm(this.http, formData, options, this.chunked, callback);
        }

    };

    function requestForm(http, formData, options, chunked, callback) {

        chunked = chunked || true;

        formData.setNodeChunkedEncoding(chunked);

        callback = callback || function () {
        };

        //無いとライブラリがmultipart/form-dataを利用してくれなかった。とりあえず入れておく。
        formData.append('dummy135422312', new FileAPI.File(__filename));

        //@see https://github.com/coolaj86/node-file-api/blob/master/examples/upload-client.js
        //var bodyStream = formData.serialize('multipart/form-data'); //Error occurred maybe not supported.
        var bodyStream = formData.serialize('x-www-form-urlencoded');

        options.headers["Content-Type"] = formData.getContentType();

        var request;
        if (chunked) {
//            console.log('request');
//            console.log('reqheader:' + JSON.stringify(options));
            request = http.request(options, callback);

            bodyStream.on('data', function (data) {
//                console.log('data');
                request.write(data);
            });
        }

        // `data` will usually fire first, then `size`, then more `data`, then `load`
        bodyStream.on('size', function (size) {
//            console.log('size');
            if (chunked) {
                return;
            } else {
                options.headers["Content-Length"] = size;
                request = http.request(options, callback);
            }
        });

        bodyStream.on('load', function (data) {
//            console.log('load');

            if (!chunked) {
                request.write(data);
            }
            request.end();
        });

        return request;
    };

    exports.Multipart = Multipart;
    exports.Multipart.FormData = FormData;

})();