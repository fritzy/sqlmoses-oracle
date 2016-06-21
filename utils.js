'use strict';

const through = require('through2');

module.export = {
  convertStream: function (stream) {
    return stream.pipe(through({objectMode: false}, (chunk, enc, next) => {
      this.push(JSON.stringify(chunk));
      next();
    }));
  }
};
