"use strict";
var express = require("express");
var Utilities = require("./src/data");
var http = require("./src/method");
/**
 * Resource implementation
 */
var Resource = (function () {
    function Resource() {
    }
    /**
     * Register as array or single
     */
    Resource.register = function (server, options, base) {
        options.forEach(function (option) {
            if (base) {
                server.use(base, Resource.route(option));
            }
            else {
                server.use(Resource.route(option));
            }
        });
    };
    /**
     * create route from option
     */
    Resource.route = function (option) {
        var route = express.Router();
        var methods = option.methods || ["get", "post", "put", "delete"];
        var path = (option.model.getTableName() || "").toLowerCase();
        methods.forEach(function (method) {
            switch (method.toLowerCase()) {
                case "get": {
                    [Utilities.toString("/%s", path), Utilities.toString("/%s/:id", path)].forEach(function (m) {
                        route.get(m, function (req, res) {
                            if (m.indexOf("/:id") === -1) {
                                http.httpMethods.all.on(req, res, option.model);
                            }
                            else {
                                http.httpMethods.detail.on(req, res, option.model);
                            }
                        });
                    });
                    break;
                }
                case "post": {
                    [Utilities.toString("/%s", path)].forEach(function (m) {
                        route.post(m, function (req, res) {
                            http.httpMethods.create.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "put": {
                    [Utilities.toString("/%s/:id", path)].forEach(function (m) {
                        route.put(m, function (req, res) {
                            http.httpMethods.update.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "delete": {
                    [Utilities.toString("/%s/:id", path)].forEach(function (m) {
                        route.delete(m, function (req, res) {
                            http.httpMethods.remove.on(req, res, option.model);
                        });
                    });
                    break;
                }
                default: {
                    throw { status: 404, message: "not supported method.", name: "NotFound" };
                }
            }
        });
        return route;
    };
    return Resource;
}());
exports.Resource = Resource;
