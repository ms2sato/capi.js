var GRAPH_HOST = 'graph.facebook.com';
var https = require('https');
var Promise = require('node-promise').Promise;
var PromiseQueue = require('../util/promise_queue.js');
var _ = require('underscore');

exports.execQuery = function (token, query, options) {
    options = options || {};

    //TODO: 後で統一的にすること
    if(options.context && options.context.queue){
        return options.context.queue.push(function(){
            return exports.doExec(token, query);
        });
    }
    return exports.doExec(token, query);
}

exports.api = function(token, path){

    path = path + ((path.indexOf('?') == -1)? '?':'&') + 'access_token=' + token;

    var promise = new Promise();
    https.get({
        host:GRAPH_HOST,
        path:path,
        agent:false //
    }, function (res) {
        var code = res.statusCode;

        var body = '';
        res.on('data', function (data) {
            body += data.toString();
        });

        res.on('end', function () {
            try{
//                console.log('body:' + body);

                var res = JSON.parse(body);
                if (res.error || code != 200) {
                    console.log('[error]body:' + body);
                    promise.reject(res);
                    return;
                }
                promise.resolve(res);
            }catch(e){
                throw new Error(e.message + ';body:' + body);
            }
        });

        res.on('error', function (err) {
            promise.reject(err);
        });
    }).on('error', function(err){
            promise.reject(err);
        });

    return promise;
}

exports.doExec = function (token, query) {
    var path = '/fql?q=' + encodeURIComponent(query);
    return exports.api(token, path);
}

exports.like = function (column, word, casesensitive) {
    if (casesensitive !== false) {
        casesensitive = true;
    }

    if (casesensitive) {
        return ' strpos(' + column + ', "' + word + '") >=0';
    }
    else {
        return ' strpos(lower(' + column + '), lower("' + word + '")) >=0';
    }
}

exports.orderBy = function (column, desc) {
    if (desc) {
        return ' ORDER BY ' + column + ' ' + desc;
    }
    else {
        return ' ORDER BY ' + column;
    }
}

exports.limit = function (limit, offset) {
    var lim = ' LIMIT ' + limit;
    if (offset !== undefined) {
        lim += ' OFFSET ' + offset;
    }
    return lim;
}

exports.getSeconds = function (time) {
    return (_.isNumber(time)) ? time : Math.floor(time.getTime() * 0.001);
}

exports.between = function (column, options) {
    var addCondition = '';

    var opt = {
        begin: options.begin,
        end: options.end
    }
    if(options.$begin || options.$end){
        opt.begin = options.$begin;
        opt.end = options.$end;
    }


    if (options.begin) {
        var b = exports.getSeconds(options.begin);
        addCondition += ' AND ' + b + ' <= ' + column;
    }
    if (options.end) {
        addCondition += ' AND ' + column + ' < ' + exports.getSeconds(options.end);
    }

    return addCondition;
}

/**
 * FQLの戻りはdataでラップされているのでこれを剥がす
 * @param promise 実行中のPromise
 * @return Promise
 */
exports.unwrapData = function (promise) {
    var p = new Promise();
    promise.then(function (ret) {
        p.resolve(ret.data);
    }, function (err) {
        p.reject(err);
    });
    return p;
}


var Query = function (body, options) {
    options = options || {};

    if(!options.context){
        options.context = new Query.SimpleContext();
    }

    this.body = body || '';
    this.andList = [];
    this._orderBy = '';
    this._limit = '';
    this.context = options.context;
}

Query.prototype = {

    and:function (expression) {

        if (arguments.length == 2) {
            var value = arguments[1];
            return this.andEql(expression, value);
        }
        else {
            if (_.isString(expression)) {
                return this.andExpression(expression);
            } else {
                throw new Error('unsupported type:', expression);
            }

        }
        return this;
    },

    andEql:function (key, value) {
        var exValue;
        if (_.isString(value)) {
            exValue = '"' + value.replace(/"/, '\"').replace(/'/, '\'') + '"';
        } else {
            exValue = value;
        }

        return this.andExpression(key + ' = ' + exValue);
    },

    andSearch:function (column, wordsStr, casesensitive) {
        var self = this;
        var words = wordsStr.split(/\s/);
        _.each(words, function (word) {
            word = word.replace(/\s/, '');
            if (!word.length) return;
            self.andExpression(exports.like(column, word, casesensitive));
        });
    },

    andExpression:function (expression) {
        this.andList.push(expression);
        return this;
    },

    or:function () {

        var args = arguments;

        var len = args.length;
        if (!len) throw new Error('args not found');

        // TODO: Queryより小さな概念に書き換える。
        if (len == 1) {
            var cond = new Query();
            args[0].call(cond);
            this.andExpression(cond.build());
            return this;
        }

        var ret = '(';
        var cond = new Query();
        args[0].call(cond);
        ret += cond.where();

        for (var i = 1; i < len; ++i) {
            var cond = new Query();
            args[i].call(cond)
            ret += ') OR (' + cond.where();
        }
        ret += ')';

        //console.log(ret);
        this.andList.push(ret);

        return this;
    },

    between:function (column, options) {

        var con = {};
        if(options.$begin || options.$end){
            con.begin = options.$begin;
            con.end = options.$end;
        }else{
            con = options;
        }

        if (options.begin) {
            this.andExpression(exports.getSeconds(options.begin) + ' <= ' + column);
        }

        var op = (options.includeEq)? ' <= ' : ' < ';

        if (options.end) {
            this.andExpression(column + op + exports.getSeconds(options.end));
        }

        return this;
    },

    orderBy:function (column, desc) {
        this._orderBy = exports.orderBy(column, desc);
        return this;
    },

    limit:function (limit, offset) {
        this._limit = exports.limit(limit, offset);
        return this;
    },

    where:function () {
        return this.andList.join(' AND ');
    },

    build:function () {
        var query = this.body;
        if (this.andList.length) {
            query += ' WHERE ' + this.where();
        }
        return query + this._orderBy + this._limit;
    },

    /**
     * @param token AccessToken
     * @param options {
     *     wrapped: 標準の「data」でラップさせるかどうか。defaultはfalse
     * }
     * @return Promise
     */
    exec:function (token, options) {
        return this.context.exec(this, token, options);
    },

    doExec:function (token, options) {
        options = options || {};

        var query = this.build();
        if (!options.wrapped) {
            return exports.unwrapData(exports.execQuery(token, query));
        }
        else {
            return exports.execQuery(token, query);
        }
    }
}

Query.QueueingContext = function(){
    this.queue = new PromiseQueue(Promise);
}

Query.QueueingContext.prototype = {
    exec: function(query, token, options){
        console.log('## enqueue');
        return this.queue.push(function(){
            return query.doExec(token, options);
        });
    }
}


Query.SimpleContext = function(){
}

Query.SimpleContext.prototype = {
    exec: function(query, token, options){
        return query.doExec(token, options);
    }
}

exports.Query = Query;

