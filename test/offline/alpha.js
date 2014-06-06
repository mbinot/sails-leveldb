var Promise = require('bluebird');
var assert = require('assert');

var testFunction = function (name, cb) {
    console.log('tested: ', name);
    if (name == 'error')
        return cb('error in ' + name);
    cb(null, name + ':ok');
}

var asncFunction = function(name, cb) {

    Promise.resolve(name)
        .then(function(n){
            console.log('tested: ', n);
            return n;
        })
        .then(function(n){
            if(n == 'error')
                throw "error in async " + n;
            return n + ':async';
        })
        .nodeify(cb);
};

var returnAsyncVal = function(){
    return Promise.resolve('aa')
        .then(function(n){
            console.log('returning ', n);
            return n;
        });
};

/**
 * Created by mbinot on 09.05.14.
 */
describe('alpha', function () {

    it('sould return a value', function(done){
        returnAsyncVal()
            .then(function(result){
                console.log('ok: ', result);
                done();
            });
    });

    it('should work', function (done) {
        testFunction('alpha', function (err, res) {
            assert(err == undefined);
            console.log('result: %s : %s', err, res);

            testFunction('beta', function (err, res) {
                assert(err == undefined);
                console.log('result: %s : %s', err, res);

                testFunction('error', function(err, res){
                    assert(err != undefined);
                    console.log('result: %s : %s', err, res);
                    done();
                });
            });
        });
    });

    it('should work', function (done) {
        asncFunction('alpha', function (err, res) {
            assert(err == undefined);
            console.log('result: %s : %s', err, res);

            asncFunction('beta', function (err, res) {
                assert(err == undefined);
                console.log('result: %s : %s', err, res);

                asncFunction('error', function(err, res){
                    assert(err != undefined);
                    console.log('result: %s : %s', err, res);
                    done();
                });
            });
        });
    });

});