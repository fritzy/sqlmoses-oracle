'use strict';

const lab = exports.lab = require('lab').script();
const expect = require('code').expect;
const Joi = require('joi');

const config = require('getconfig');

process.on('uncaughtException', function (err) {
  console.log(err.stack);
});

const SQLMoses = require('../index')(config.oracle);

const Test = new SQLMoses.Model({
  name: 'Test',
  table: 'HELP',
  keyMap: {
    'topic': 'TOPIC',
    'seq': 'SEQ',
    'info': 'INFO'
  },
  autoCommit: true,
  log: function () {}
});

lab.experiment('testing functions', () => {
  lab.test('select', (done) => {
    Test.select({order: [{seq: 'DESC'}]})
    .then((results) => {
      done();
    })
    .catch((err) => {
      console.log(err.stack);
    });
  });

  lab.test('insert', (done) => {
    Test.insert({topic: 'cheese', 'info': 'weee', seq: 1}, {seq: SQLMoses.oracledb.NUMBER})
    .then((results) => {
      expect(results[0].seq).to.equal(1);
      done();
    })
    .catch((err) => {
      console.log(err.stack);
    });
  });

  lab.test('update', (done) => {
    Test.update({topic: 'cheese2'}, {topic: 'cheese'})
    .then((results) => {
      done();
    })
    .catch((err) => {
      console.log(err.stack);
    });
  });
  
  lab.test('delete', (done) => {
    Test.delete({topic: 'cheese2'})
    .then((results) => {
      done();
    })
    .catch((err) => {
      console.log(err.stack);
    })
  });

});
