var _ = require('underscore');


/**
 * Queue for Promise
 * @param Promise
 * @param options
 * @constructor
 */
var PromiseQueue = function (Promise, options) {
    var defaults = {
        max: 5
    };
    var opt = _.extend(_.clone(defaults), options);
    this.options = opt;

    this.actives = [];
    this.queue = [];
    this.Promise = Promise;
}

PromiseQueue.prototype = {

    /**
     * @param processFunc 実処理
     * @return この処理が後で呼ばれた時に対応するPromise
     */
    push:function (processFunc) {
        var self = this;

        function del(process){
            //console.log('### resolve fin del');
            var index = self.actives.indexOf(process);
            //console.log('### resolve fin del:' + index);
            self.actives.splice(index, 1);
        }

        function fin(process){
            //console.log('### resolve fin');
            del(process);
            self.next();

            //console.log('## actives:' + JSON.stringify(self.actives.length));
        }



        var promise = new this.Promise();
        this.queue.push(function () {
            return processFunc().then(function () {
                fin(processFunc);

//                console.log('### resolve '/* + self.actives*/);
                promise.resolve.apply(promise, arguments);
            }, function () {
                fin(processFunc);

//                console.log('### reject');
                promise.reject.apply(promise, arguments);
            });
        });

        this.next();

        return promise;
    },

    next:function () {

        var self = this;

        if (this.actives.length < this.options.max && this.queue.length) {
            //console.dir(this);
            var process = this.queue.shift();
            this.actives.push(process);
            process();
        }
    }
}

module.exports = PromiseQueue;
