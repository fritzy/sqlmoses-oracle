"use strict";

const wadofgum = require('wadofgum');
const wadofgumValidation = require('wadofgum-validation');
const wadofgumProcess = require('wadofgum-process');
const wadofgumKeyMap = require('wadofgum-keymap');
const lodash = require('lodash');

const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;

function EmptyResult() {
  Error.apply(this, arguments);
  this.message = "EmptyResult";
}

//hoist declaration from exports
let getDB;

const cached_models = {};

class Model extends wadofgum.mixin(wadofgumValidation, wadofgumProcess, wadofgumKeyMap) {

  constructor(opts) {
    super(opts);
    this.map = this.map || {};
    oracledb.autoCommit = !!opts.autoCommit;
    this.autoCommit = !!opts.autoCommit;

    if (this.name) {
      cached_models[this.name] = this;
    }

    this.log = opts.log || console.log;

    this.table = opts.table || false;
    this.view = opts.view || false;
    this._preparedStatements = {};
    this.getDB = getDB;
  }

  _processResults(results) {
    if (!results.rows && !results.outBinds) {
      return [];
    }
    this.log(results);
    if (results.outBinds) {
      results = [this.validateAndProcess(results.outBinds, new Set(['fromDB']))];
    } else {
      results = results.rows.map(result => this.validateAndProcess(result, new Set(['fromDB'])));
    }
    return Promise.all(results);
  }

  _processArgs(args) {
    if (!args) return;
    args = this.validateAndProcess(args, new Set(['toDB']));
    return args;
  }

  validateAndProcess(obj, tags) {
    tags = tags || [];

    obj = (function (obj) {
      const newobj = {};
      Object.keys(obj).forEach((key) => {
        const idx = key.indexOf('__out');
        if (idx !== -1) {
          newobj[key.substring(0, idx)] = obj[key][0];
        } else {
          newobj[key] = obj[key];
        }
      });
      return newobj;
    })(obj);

    if (typeof tags === 'string') tags = [tags];
    const tagSet = new Set(tags);
    if (tagSet.has('toDB')) {
      obj = this.mapTo(obj);
    } else if (tagSet.has('fromDB')) {
      obj = this.mapFrom(obj);
    }
    if (this.schema) {
      return this.validate(obj)
      .then((obj2) => {
        return this.process(obj2, tags);
      });
    } else {
      return this.process(obj, tags);
    }
  }

  select (opts) {
    opts = opts || {};
    let db;
    return this.getDB()
    .then((dbi) => {
      db = dbi;
      return this._processArgs(opts.where)
    })
   .then((where) => {
      opts.where = where;

      if(opts.order){
        const result = opts.order.map(order => this._processArgs(order));
        return Promise.all(result);
      }
      else{
         return where;
      }
    })
    .then((order) => {
      opts.order = order;
      return new Promise((resolve, reject) => {
        let query = `SELECT * FROM "${this.table || this.view}"`;
        const args = [];
        if (opts.where) {
          query += ' WHERE ';
          query += Object.keys(opts.where).map((key) => {
            args.push(opts.where[key]);
            return `"${key}" = :${key}`;
          }).join(' AND ')
        }
        if (opts.page) {
          args.push(opts.page.offset);
          args.push(opts.page.limit);
          query += `OFFSET :v_offset ROWS FETCH NEXT :v_next ROWS ONLY`;
        }
        if (Array.isArray(opts.order) && opts.order.length > 0) {
          query += ' ORDER BY ';
          query += opts.order.map(order => `"${Object.keys(order)[0]}" ${order[Object.keys(order)[0]] === 'DESC' ? 'DESC' : '' }`).join(', ');
        }
        this.log(query)
        db.execute(query, args, {autoCommit: this.autoCommit}, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(this._processResults(result));
        });
      });
    });
  }

  insert (args, out) {

    let db;
    return this.getDB()
    .then((dbi) => {
      db = dbi;
      out = this.mapTo(out);
      return Promise.all([this._processArgs(args), this._processArgs(out)]);
    })
    .then((proms) => {
      args = proms[0];
      out = proms[1];

      return new Promise((resolve, reject) => {
        const inargs = {};
        const outkeys = Object.keys(out);
        outkeys.forEach((key) => {
          inargs[key + '__out'] = {type: out[key], dir: oracledb.BIND_OUT};
        });
        
        let query = `INSERT INTO "${this.table}" (`;
        query += Object.keys(args).map(key => `"${key}"`)
        .join(', ');
        query += ') VALUES (';
        query += Object.keys(args).map((key) => {
          inargs[key] = args[key];
          if (typeof args[key] === 'object' && (args[key].dir === oracledb.BIND_OUT || args[key].dir === oracledb.BIND_INOUT)) {
            outkeys.push(key);
          }
          return `:${key}`;
        }).join(', ');
        query += ")";
        if (out) {
          query += ` RETURNING ${outkeys.join(', ')} INTO ${outkeys.map(key => ':' + key + '__out').join(', ')}`;
        }
        db.execute(query, inargs, {autoCommit: this.autoCommit}, (err, result) => {

          if (err) {
            return reject(err);
          }
          return resolve(this._processResults(result));
        });
      });
    });
  }

  update (args, where) {
    let db;
    return this.getDB()
    .then((dbi) => {
      db = dbi;
      return this._processArgs(args);
    })
    .then((argsi) => {
      args = argsi;
      return this._processArgs(where);
    })
    .then((wherei) => {
      where = wherei;
      return new Promise((resolve, reject) => {
        const inargs = {};
        let query = `UPDATE "${this.table}" SET `;
        query += Object.keys(args).map((key) => {
          inargs[key] = args[key];
          return `"${key}" = :${key}`
        })
        .join(', ');
        if (where) {
          query += ' WHERE ';
          query += Object.keys(where).map((key) => {
            inargs[`c_${key}`] = where[key];
            return `"${key}" = :c_${key}`;
          }).join(' AND ');
        }
        this.log(query);
        this.log(inargs);
        db.execute(query, inargs, {autoCommit: this.autoCommit}, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(this._processResults(result));
        });
      });
    });
  }

  delete (where) {
    let db;
    return this.getDB()
    .then((dbi) => {
      db = dbi;
      return this._processArgs(where);
    })
    .then((where) => {
      return new Promise((resolve, reject) => {
        let query = `DELETE FROM "${this.table || this.view}"`;
        const args = [];
        if (where) {
          query += ' WHERE ';
          query += Object.keys(where).map((key) => {
            args.push(where[key]);
            return `"${key}" = :${key}`;
          }).join(' AND ')
        }
        this.log(query);
        this.log(args);
        db.execute(query, args, {autoCommit: this.autoCommit}, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(this._processResults(result));
        });
      });
    });
  }

  getModel (mname) {
    if (mname instanceof Model) {
      return mname;
    }
    if (!cached_models.hasOwnProperty(mname)) {
      throw new Error(`The model "${mname}" doesn't exist or this user doesn't have permission to see it.`);
    }
    return cached_models[mname];
  }

  mapQuery (opts) {
    this[opts.name] = (args, out) => {
      let db;
      return this.getDB()
      .then((dbi) => {
        db = dbi;
        return this._processArgs(args);
      })
      .then((args) => {
        return new Promise((resolve, reject) => {
          this.log(query);
          this.log(args);
          db.execute(query, args, {autoCommit: this.autoCommit}, (err, result) => {
            if (err) {
              return reject(err);
            }
            return resolve(this._processResults(result));
          });
        });
      });
    };
  }

  mapProcedure (opts) {
    this[opts.name] = (args) => {
      let db;
      return this.getDB()
      .then((dbi) => {
        db = dbi;
        return this._processArgs(args);
      })
      .then((args) => {
        let query = `BEGIN ${opts.name}(`;
        const qargs = lodash.assign(opts.args, args)
        query += Object.keys(qargs).map(key => `:${key}`).join(', ');
        query += `); END;`;
        return new Promise((resolve, reject) => {
          db.execute(query, qargs, {autoCommit: this.autoCommit}, (err, result) => {
            if (err) {
              return reject(err);
            }
            return resolve(this._processResults(result));
          });
        });
      });
    };
  }

}

module.exports = (oracle_config) => {

  let db_conn;
  let db_connecting = false;
  let connected_list = [];

  getDB = () => {
    if (!db_conn)  {
      if (db_connecting) {
        return new Promise((resolve, reject) => {
          connected_list.push((db) => {
            resolve(db);
          });
        });
      } else {
        db_connecting = true;
        return new Promise((resolve, reject) => {
          oracledb.getConnection(oracle_config, (err, conn) => {
            if (err) return reject(err);
            db_conn = conn;
            while (connected_list.length > 0) {
              const cb = connected_list.pop();
              cb(db_conn);
            }
            db_connecting = false;
            return resolve(db_conn);
          });
        });
      }
    } else {
      return Promise.resolve(db_conn);
    }
  };

  return {
    Model,
    getDB,
    EmptyResult,
    getModel: function getModel(name) {
      return cached_models[name];
    },
    oracledb,
    utils: require('./utils')
  };
}
