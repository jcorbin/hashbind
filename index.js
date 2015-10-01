'use strict';

module.exports = Hash;

function Hash(window) {
    var self = this;

    this.window = window;
    this.window.addEventListener('hashchange', onHashChange);
    this.last = '';
    this.cache = {};
    this.values = {};
    this.bound = {};
    this.load();

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
    var parts = this.last.slice(1).split('&');
    var seen = {};
    for (var i = 0; i < parts.length; i++) {
        var keyval = parts[i].split('=');
        var key = unescape(keyval[0]);
        var str = unescape(keyval[1]) || '';
        if (this.cache[key] !== str) {
            this.cache[key] = str;
            if (this.bound[key]) {
                this.bound[key].onChange();
            } else {
                this.values[key] = parseValue(str);
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
    var parts = [];
    var keys = Object.keys(this.cache);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!this.bound[key]) {
            this.cache[key] = valueToString(this.values[key]);
        }
        var str = this.cache[key];

        var part = '' + escape(key);
        if (str === undefined) {
            continue;
        } else if (str !== '') {
            part += '=' + escape(str);
        }
        parts.push(part);
    }

    var hash = parts.join('&');
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
function set(key, val) {
    var bound = this.bound[key] || this.bind(key);
    return bound.set(val);
};

function HashKeyBinding(hash, key) {
    this.hash = hash;
    this.key = key;
    this.def = undefined;
    this.value = hash.values[key];
    this.parse = parseValue;
    this.valToString = valueToString;
    this.listeners = [];
}

HashKeyBinding.prototype.load =
function load() {
    var str = this.hash.cache[this.key];
    if (str !== undefined) {
        var val = this.parse(str);
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

HashKeyBinding.prototype.notify =
function notify() {
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
    if (this.value !== undefined) {
        listener(this.value);
    }
    this.listeners.push(listener);
    return this;
};

HashKeyBinding.prototype.setDefault =
function setDefault(def) {
    var value = null;
    if (typeof def === 'string') {
        value = this.parse(def);
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
function set(val) {
    var value = null;
    if (typeof val === 'string') {
        value = this.parse(val);
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
        return true;
    }
    if (str === 'false') {
        return false;
    }
    if (str === 'null') {
        return null;
    }
    return str;
}
