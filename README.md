# [Hash Bind](//jcorbin.github.io/hashbind)

A dual-binding library for `window.location.hash`

## Example

```javascript
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
    .setParse(parseInt)
    .addListener(function onSettingChange(val) {
        console.log('the setting is', val);
    })
    ;

// Maybe you wanted a default:
var bound = hash.bind('setting')
    .setParse(parseInt)
    .setDefault('42')
    .addListener(function onSettingChange(val) {
        console.log('the setting is', val);
    })
    ;

// You can still set it by name:
hash.set('setting', 99);

// You can also set it through the bound reference:
bound.set(99);
```

## MIT Licensed
