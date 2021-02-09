// TODO: Clean these up

const should = require('should');
const helpers = require('../helpers');
const redismock = require("../../lib");

// Since this is purely for mocking plugins
if (process.env.VALID_TESTS) {
  return;
}

// Clean the db after each test
afterEach(function (done) {
  var r = helpers.createClient();
  r.flushdb(function () {
    r.end(true);
    done();
  });
});

describe('addMockCommand()', function () {

  it('should exist', function () {
    var r = redismock.createClient();
    should.exist(r.addMockCommand);
  });

  it('should add method to `.commands` property', function () {
    var r = redismock.createClient();

    r.addMockCommand('json.set', (client, args, callback) => {
      // Should never be called, maybe have an empty callback here??
      should.not.exist(client);
    });

    // Should only be added here when '.addCommand' is called
    should.not.exist(r.json_set);
    should(r.commands).have.key('json.set');
  });

});

// This is a valid command from NodeRedis
describe('addCommand()', function () {

  it('should exist', function () {
    var r = redismock.createClient();
    should.exist(r.addCommand);
  });

  it('should add method to `.commands` property', function () {
    var r = redismock.createClient();

    // This is the flow
    r.addMockCommand('json.set', (client, args, callback) => {
      // Should never be called, maybe have an empty callback here??
      should.not.exist(client);
    });

    r.addCommand('json.set');

    // Should only be added here when '.addCommand' is called
    should.exist(r.json_set);
    should(r.commands).have.key('json.set');
  });

  describe('example commands', function () {
    describe('client', function () {
      let r;

      before(function () {
        r = redismock.createClient();

        // Better functionality but will work
        r.addMockCommand('json.set', (client, args, callback) => {
          client.set(args[0], JSON.stringify(args[2]), callback);
        });

        r.addMockCommand('json.get', (client, args, callback) => {
          client.get(args[0], callback);
        });

        r.addCommand('json.set');
        r.addCommand('json.get');
      });

      after(function (done) {
        r.quit(done);
      });

      afterEach(function() {
        r.flushall();
      });

      it('should set value via working command', function (done) {
        const value = {
          hello: 'world'
        };

        r.json_set('foo', '.', value, function (err, result) {
          result.should.eql('OK');

          r.json_get('foo', function (err, result) {
            JSON.parse(result).should.deepEqual(value);
            done();
          });
        });
      });
    });

    describe('multi', function () {

      let r;

      before(function () {
        r = redismock.createClient();

        // Better functionality but will work
        r.addMockCommand('json.set', (client, args, callback) => {
          client.set(args[0], JSON.stringify(args[2]), callback);
        });

        r.addMockCommand('json.get', (client, args, callback) => {
          client.get(args[0], callback);
        });

        r.addCommand('json.set');
        r.addCommand('json.get');
      });

      after(function (done) {
        r.quit(done);
      });

      afterEach(function() {
        r.flushall();
      });

      it('should set the value with a ttl', function (done) {
        const value = {
          hello: 'world'
        };

        r.multi()
          .json_set('key', 'path', JSON.stringify(value))
          .expire('key', 60)
          .ttl('key')
          .exec((err, results) => {
            should(err).not.be.ok();
            should(results[0]).equal('OK');
            should(results[1]).equal(1);
            (results[2]<= 60 ).should.be.true();

            done();
          });
      });
    });
  });

});
