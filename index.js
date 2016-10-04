'use strict';

var Result = require('rezult');

module.exports = Hash;

Hash.decodeUnescape =
function decodeUnescape(str) {
    var keyvals = [];
    var parts = str.split('&');
    for (var i = 0; i < parts.length; i++) {
        var keystr = parts[i].split('=');
        var key = unescape(keystr[0]);
        var val = unescape(keystr[1]) || '';
        keyvals.push([key, val]);
    }
    return keyvals;
};

Hash.encodeMinEscape =
function encodeMinEscape(keyvals) {
    var parts = [];
    for (var i = 0; i < keyvals.length; i++) {
        var key = keyvals[i][0];
        var val = keyvals[i][1];
        var part = '' + minEscape(key);
        if (val === undefined) {
            continue;
        }
        if (val !== '') {
            part += '=' + minEscape(val);
        }
        parts.push(part);
    }
    return parts.join('&');
};

Hash.encodeMaxEscape =
function encodeMaxEscape(keyvals) {
    var parts = [];
    for (var i = 0; i < keyvals.length; i++) {
        var key = keyvals[i][0];
        var val = keyvals[i][1];
        var part = '' + escape(key);
        if (val === undefined) {
            continue;
        }
        if (val !== '') {
            part += '=' + escape(val);
        }
        parts.push(part);
    }
    return parts.join('&');
};

function Hash(window, options) {
    var self = this;
    if (!options) {
        options = {};
    }

    this.window = window;
    this.last = '';
    this.cache = {};
    this.values = {};
    this.bound = {};
    // TODO: do we ever need to escape?
    this.decode = options.decode || Hash.decodeUnescape;
    this.encode = options.encode || (options.escape
        ? Hash.encodeMaxEscape
        : Hash.encodeMinEscape);

    this.window.addEventListener('hashchange', onHashChange);
    this.load();
    this.save();

    function onHashChange(e) {
        self.load();
    }
}

Hash.prototype.load =
function load() {
    if (this.window.location.hash === this.last) {
        return;
    }

    this.last = this.window.location.hash;
    var keystrs = this.decode(this.last.slice(1));

    var seen = {};
    for (var i = 0; i < keystrs.length; i++) {
        var key = keystrs[i][0];
        var str = keystrs[i][1];
        if (this.cache[key] !== str) {
            this.cache[key] = str;
            if (this.bound[key]) {
                this.bound[key].onChange();
            } else {
                var res = parseValue(str);
                if (!res.err) {
                    // intentional ignore parse error; best-effort load
                    this.values[key] = res.value;
                }
            }
        }
        seen[key] = true;
    }
    this.prune(seen);
};

Hash.prototype.prune =
function prune(except) {
    if (!except) {
        except = {};
    }
    var cacheKeys = Object.keys(this.cache);
    for (var i = 0; i < cacheKeys.length; i++) {
        var key = cacheKeys[i];
        if (!except[key]) {
            if (this.bound[key]) {
                this.bound[key].reset();
            } else {
                delete this.cache[key];
                delete this.values[key];
            }
        }
    }
};

Hash.prototype.save =
function save() {
    var keystrs = [];
    var keys = Object.keys(this.cache);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!this.bound[key]) {
            this.cache[key] = valueToString(this.values[key]);
        }
        var str = this.cache[key];
        keystrs.push([key, str]);
    }

    var hash = this.encode(keystrs);
    if (hash) {
        hash = '#' + hash;
    }
    this.window.location.hash = this.last = hash;
};

Hash.prototype.bind =
function bind(key) {
    if (this.bound[key]) {
        throw new Error('key already bound');
    }
    var bound = new HashKeyBinding(this, key);
    this.bound[key] = bound;
    return bound;
};

Hash.prototype.getStr =
function getStr(key) {
    return this.cache[key];
};

Hash.prototype.get =
function get(key) {
    return this.values[key];
};

Hash.prototype.set =
function set(key, val, callback) {
    var bound = this.bound[key] || this.bind(key);
    return bound.set(val, callback);
};

function HashKeyBinding(hash, key) {
    this.hash = hash;
    this.key = key;
    this.def = undefined;
    this.value = hash.values[key];
    this.parse = parseValue;
    this.valToString = valueToString;
    this.listener = null;
    this.listeners = [];
    this.notify = this.notifyNoop;
}

HashKeyBinding.prototype.load =
function load() {
    var str = this.hash.cache[this.key];
    if (str !== undefined) {
        var res = this.parse(str);
        if (res.err) {
            // intentional ignore parse error; best-effort load
            return this;
        }
        var val = res.value;
        if (this.value !== val) {
            this.value = val;
            this.hash.values[this.key] = this.value;
            this.notify();
        }
    }
    return this;
};

HashKeyBinding.prototype.save =
function save() {
    this.hash.values[this.key] = this.value;
    var str = this.valToString(this.value);
    if (this.hash.cache[this.key] !== str) {
        this.hash.cache[this.key] = str;
        this.hash.save();
    }
    return this;
};

HashKeyBinding.prototype.notifyNoop =
function notifyNoop() {
    return this;
};

HashKeyBinding.prototype.notifyOne =
function notifyOne() {
    this.listener(this.value);
    return this;
};

HashKeyBinding.prototype.notifyAll =
function notifyAll() {
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].call(this, this.value);
    }
    return this;
};

HashKeyBinding.prototype.setParse =
function setParse(parse, toString) {
    this.parse = parse || parseValue;
    this.load();
    if (toString) {
        this.setToString(toString);
    }
    return this;
};

HashKeyBinding.prototype.setToString =
function setToString(toString) {
    this.valToString = toString;
    if (this.value !== undefined) {
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.addListener =
function addListener(listener) {
    if (this.listeners.length) {
        this.listeners.push(listener);
    } else if (this.listener) {
        this.listeners = [this.listener, listener];
        this.listener = null;
        this.notify = this.notifyAll;
    } else {
        this.listener = listener;
        this.notify = this.notifyOne;
    }
    if (this.value !== undefined) {
        this.notify();
    }
    return this;
};

HashKeyBinding.prototype.setDefault =
function setDefault(def) {
    var value = null;
    if (typeof def === 'string') {
        value = this.parse(def).toValue();
    } else {
        value = def;
    }

    this.def = value;
    if (this.value === undefined) {
        this.value = this.def;
        this.save();
    }

    return this;
};

HashKeyBinding.prototype.onChange =
function onChange() {
    this.load();
};

HashKeyBinding.prototype.get =
function get() {
    return this.value;
};

HashKeyBinding.prototype.reset =
function reset() {
    if (this.value !== this.def) {
        this.value = this.def;
        this.save();
    }
    return this;
};

HashKeyBinding.prototype.set =
function set(val, callback) {
    var value = null;
    if (typeof val === 'string') {
        var res = this.parse(val);
        if (callback) {
            callback(res.err, val, res.value);
            if (res.err) {
                return undefined;
            }
            value = res.value;
        } else {
            value = res.toValue();
        }
    } else {
        value = val;
    }

    if (this.value !== value) {
        this.value = value;
        this.notify();
        this.save();
    }

    return this.value;
};

function valueToString(val) {
    if (val === false) {
        return undefined;
    }
    if (val === true) {
        return '';
    }
    return '' + val;
}

function parseValue(str) {
    if (str === '' || str === 'true') {
        return new Result(null, true);
    }
    if (str === 'false') {
        return new Result(null, false);
    }
    if (str === 'null') {
        return new Result(null, null);
    }
    return new Result(null, str);
}

function minEscape(str) {
    return str.replace(/[#=&]/g, escapeMatch);
}

function escapeMatch(part) {
    return escape(part);
}
