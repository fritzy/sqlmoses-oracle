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
    'seq': 'seq',
    'info': 'info'
  }
});

lab.experiment('testing functions', () => {
  lab.test('select', (done) => {
    Test.select()
    .then((results) => {
      console.log(results);
      done();
    })
    .catch((err) => {
      console.log(err.stack);
    });
  });
});
