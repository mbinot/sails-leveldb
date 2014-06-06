/**
 * Test dependencies
 */
var Aggregate = require('../../lib/aggregate');
var assert = require('assert');

describe('Aggregate', function () {

    it('should not hang or encounter any errors', function (done) {
        var aggregate = new Aggregate({ groupBy: ['name'], sum: ['name'] }, [{ name: 'aa' },{ name: 'bb' }]);
        done();
    });

});