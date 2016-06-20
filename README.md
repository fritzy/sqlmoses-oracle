# SQLMoses-Oracle

![Seagull Waterbender Moses](https://cldup.com/xBEt5glGHQ.png)

[![npm version](https://badge.fury.io/js/sqlmoses-oracle.svg)](http://badge.fury.io/js/sqlmoses-oracle)

A [pure function](http://www.nicoespeon.com/en/2015/01/pure-functions-javascript/) model class for Oracle DB.

Methods are passed a normal object and respond with a new object.
Incoming and outgoing objects are validated and transformed by [Joi](https://npmjs.org/package/joi) schemas when supplied, and transformed by processing functions when supplied.

The Model instance itself does not keep track of fields, you are expected to pass in an object to every function.

Table methods (insert, update, delete, select) are included.
You can also generate stored procs methods.

You can always bind a query, which will be cached as a prepared statement by the node-oracledb driver.

## Example

```javascript
'use strict';

const SQLMoses = require('sqlmoses-oracle')({
  user          : "system",
  password      : "oracle",
  connectString : "192.168.1.203/orcl12c"
});

const Test = new SQLMoses.Model({
  name: 'test',
  table: 'test',
  schema: Joi.object({
    FirstName: joi.string(),
    LastName: joi.string()
  })
});

Test.select()
.then((results) => {
  //results is an array of objects
});

```

## Install

[![npm i sqlmoses](https://nodei.co/npm/sqlmoses-oracle.png)](https://npmjs.org/packages/sqlmoses-oracle)


### Connecting

Require the module and call the module as a function, including the connection attrs object specified in [oracle connection handling](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connectionhandling).

## Creating a Model

```js
new SQLMoses.Model({
  name: 'someModel'
  keyMap: {
    'renameKey': 'toThis'
  },
  schema: Joi.object(),
  processors: {
    'processorName': {
      fieldName: (input, model) => {
        return Promise.resolve(input+'modification');
      }
    }
  }
})
```

* `name`: names the model so that you can reference it by string in map and other places
* `schema`: [Joi](https://npmjs.org/package/joi) schema object. Keep in mind, joi can do transforms (rename, casting, etc)
* `processors` object of processor tags with field transformations. Called when Model`.process` is called.
  * The custom processor `fromDB` is called when models are being created from the db results.
  * The custom processor `toDB` is called when model instances are used as input for stored procs.

## Methods

### select

Arguments:

```
opts: {
  opts.where: {
    // column: value
  },
  opts.page: {
    offset: 0
    limit: 10
  },
  order: [{'column': 'DESC'}, {'column2': 'ASC'}]
```

### insert

Arguments:

```
args: {}
output: {field: SQLMoses.oracledb.[STRING or NUMBER or DATE]}
```

For output argument format see: [oracledb output binding](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#outbind)

### update

Arguments:
```
args (incoming object)
where (where AND values object)
```

### delete

Arguments
```
where
```

### mapProcedure

Creates a method that runs a Stored Procedure, returning a Promise with model instances of the resulting rows.

__mapProcedure__(opts)


```
opts: {
  name: (String) name of method and stored procedure,
  args: (node-oracledb output object) see [oracledb output binding](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#outbind)
}
```

For output argument format see: [oracledb output binding](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#outbind)


__return__: Promise awaiting setup.

####Usage

ModelName\[name\](modelobj, args)

__return__: Promise with array of model validated objects or a singular result if `oneResult` set to `true`.

### mapQuery

Create a method that runs a raw query, returning a Promise with model instances of the resulting rows.

__mapQuery__(opts)

```
opts: {
  name: (String) name of method,
  query: (String) query to run with called, mapping arguments with :arg
}
```

__return__: `undefined`


### validate(obj)

Validates using the Joi schema resulting in a new (remember that Joi can transform) object from a Promise.

### process(obj, tags)

Runs processing tags against .processors resulting in a new object from a Promise.

## validateAndProcess(obj, tags)

Runs both validation and processors resulting in a new object from a Promise.

### SQLMoses.getModel(name)

__model.getModel(name)__

Returns the model named 'name';

