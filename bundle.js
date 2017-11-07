'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var sortBy = _interopDefault(require('lodash.sortby'));

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BundleLibrary = function () {
    function BundleLibrary(module, version) {
        _classCallCheck(this, BundleLibrary);

        this.$module = module;
        this.$version = version;
    }

    _createClass(BundleLibrary, [{
        key: 'version',
        get: function get() {
            return this.$version;
        }
    }, {
        key: 'name',
        get: function get() {
            return this.$module;
        }
    }]);

    return BundleLibrary;
}();

var BundleDescription = function BundleDescription(libraries) {
    _classCallCheck(this, BundleDescription);

    this.$libraries = sortBy(libraries, function (x) {
        return x.name;
    });
};

exports.BundleDescription = BundleDescription;
exports.BundleLibrary = BundleLibrary;
