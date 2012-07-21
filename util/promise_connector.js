/**
 * 関数をプロミスへ変換する。
 */
function PromiseConnector(PType) {
    if (!PType) PType = Promise;
    this.promise = new PType();
}
;

PromiseConnector.prototype = {

    /**
     * 本関数の戻りfunctionを受信用関数として扱うこと
     * @param adaptor
     * @return {Function}
     */
    handler:function (adaptor) {
        var self = this;
        return function (err, data) {
            if (err) {
                console.dir(err);
                console.dir(self.promise);
                self.promise.reject(err);
            }
            else {
                if (adaptor) {
                    data = adaptor(data);
                }
                self.promise.resolve(data);
            }
        }
    }

}

exports.PromiseConnector = PromiseConnector;