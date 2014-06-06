/**
 * Created by mbinot on 10.05.14.
 */
/**
 * Test dependencies
 */
var assert = require('assert');
var Schema = require('../../lib/schema');
var testUtils = require('../support/testutils');

describe('Schema', function(){
    describe('registerCollection', function () {

        var connection = testUtils.createMockedConnection('foo');
        var unit = new Schema(connection.client);

        it('should not hang or encounter any errors', function (done) {
            unit.registerCollection('standard', {});
            done();
        });

        it('should normalize the collection name', function(done){
            unit.registerCollection('CamelCaseNotAllowed', {});
            var name = 'camelcasenotallowed';
            assert(unit._schema[name] != null);
            assert(unit._indices[name] != null);
            assert(unit._sequences[name] != null);

            done();
        });

        it('should register all attributes, indices and sequences', function (done) {
            var testSchema = {
                guid: {
                    type: 'string',
                    primaryKey: true
                },
                firstName : 'string',
                lastName : {
                    type: 'string',
                    required: true,
                    unique: true
                },
                counter: {
                    type: 'integer',
                    autoIncrement: true
                },
                email: {
                    type: 'string',
                    index: true
                }
            };

            unit.registerCollection('withAttributes', testSchema);
            var registeredSchema = unit._schema.withattributes;
            assert(registeredSchema.guid != undefined);
            assert(registeredSchema.firstName != undefined);
            assert(registeredSchema.lastName != undefined);
            assert(registeredSchema.lastName.type == 'string');
            assert(registeredSchema.counter != undefined);
            assert(registeredSchema.email != undefined);

            assert(unit._sequences['withattributes'].length > 0);
            assert(unit._sequences['withattributes'][0].name == 'counter');

            assert(unit._indices['withattributes'].length > 0);
            assert(unit._indices['withattributes'][0].name == 'guid');
            assert(unit._indices['withattributes'][1].name == 'lastName');

            assert(unit._primary['withattributes'] == 'guid');

            done();
        });

    });
});
