"use strict";
var util = require("util");
/**
 * isNullOrEmpty control
 */
function isNullOrEmpty(item) {
    if (item === null || item === undefined) {
        return true;
    }
    else if (typeof item === "string") {
        return item === "";
    }
    else if (Array.isArray(item)) {
        return item.length === 0;
    }
    else {
        return JSON.stringify(item) === "{}";
    }
}
exports.isNullOrEmpty = isNullOrEmpty;
/**
 * toString control
 */
exports.toString = util.format;
