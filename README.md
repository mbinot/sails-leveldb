![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# waterline-leveldb

Provides easy access to `leveldb` from Sails.js & Waterline.

This `sail-leveldb` stores indexes of unique attributes for *relatively* fast lookups. Collections with multiple
unique constraints are supported as well.

Warning! This adapter will probably slow down on a high number of records.

### Installation

To install this adapter, run:

```sh
$ npm install sails-leveldb
```


### Usage

This adapter exposes the following methods:

## Methods

    - registerConnection
    - teardown
    - describe
    - define
    - drop
    - find
    - create
    - update
    - destroy


## Configuration

The following connection configuration is available:

```javascript
// default values inline
config: {
  database: 'path to the db file',
  options: {
  }
};
```

#### `options`

The underlying `levelup()` driver takes an optional options object; the following properties are accepted:

* `'createIfMissing'` *(boolean, default: `true`)*: If `true`, will initialise an empty database at the specified location if one doesn't already exist. If `false` and a database doesn't exist you will receive an error in your `open()` callback and your database won't open.

* `'errorIfExists'` *(boolean, default: `false`)*: If `true`, you will receive an error in your `open()` callback if the database exists at the specified location.

* `'compression'` *(boolean, default: `true`)*: If `true`, all *compressible* data will be run through the Snappy compression algorithm before being stored. Snappy is very fast and shouldn't gain much speed by disabling so leave this on unless you have good reason to turn it off.

* `'cacheSize'` *(number, default: `8 * 1024 * 1024`)*: The size (in bytes) of the in-memory [LRU](http://en.wikipedia.org/wiki/Cache_algorithms#Least_Recently_Used) cache with frequently used uncompressed block contents.

* `'keyEncoding'` and `'valueEncoding'` *(string, default: `'utf8'`)*: The encoding of the keys and values passed through Node.js' `Buffer` implementation (see [Buffer#toString()](http://nodejs.org/docs/latest/api/buffer.html#buffer_buf_tostring_encoding_start_end)).
  <p><code>'utf8'</code> is the default encoding for both keys and values so you can simply pass in strings and expect strings from your <code>get()</code> operations. You can also pass <code>Buffer</code> objects as keys and/or values and conversion will be performed.</p>
  <p>Supported encodings are: hex, utf8, ascii, binary, base64, ucs2, utf16le.</p>
  <p><code>'json'</code> encoding is also supported, see below.</p>

### License

**[MIT](./LICENSE)**
&copy; 2014 [balderdashy](http://github.com/balderdashy) & [contributors]
[Mike McNeil](http://michaelmcneil.com), [Balderdash](http://balderdash.co) & contributors

[Sails](http://sailsjs.org) is free and open-source under the [MIT License](http://sails.mit-license.org/).


[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/8acf2fc2ca0aca8a3018e355ad776ed7 "githalytics.com")](http://githalytics.com/balderdashy/waterline-leveldb/README.md)


