# [Hash Bind](//jcorbin.github.io/hashbind)

A dual-binding library for `window.location.hash`

## Example

```javascript
var Hash = require('hashbind');
var Result = require('rezult');

var hash = new Hash(window);

// Simple usage as a key-value store:
var someVal = hash.get('setting');
hash.set('setting', someVal);

// Better still, bind the value:
var bound = hash.bind('setting')
    .addListener(function onSettingChange(val) {
        console.log('the setting is', val);
    })
    ;

// Maybe you wanted an integer setting:
var bound = hash.bind('setting')
    .setParse(Result.lift(parseInt))
    .addListener(function onSettingChange(val) {
        console.log('the setting is', val);
    })
    ;

// Maybe you wanted a default:
var bound = hash.bind('setting')
    .setParse(Result.lift(parseInt))
    .setDefault('42')
    .addListener(function onSettingChange(val) {
        console.log('the setting is', val);
    })
    ;

// You can still set it by name:
hash.set('setting', 99);

// You can also set it through the bound reference:
bound.set(99);

// If you care to handle parse errors when settingy our values (rather than
have them thrown):
bound.set('XXX', function setDone(err, str, val) {
    // err is null or the parse error
    // str is the string that was parsed
    // val is the value returned by the parser
    console.error(err);
});

```

## MIT Licensed
