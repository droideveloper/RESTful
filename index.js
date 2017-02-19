"use strict";
var express = require("express");
var data_1 = require("./src/data");
var method_1 = require("./src/method");
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
        server.use(function (req, res, next) {
            method_1.httpMethods.error404(req, res, next);
        });
        server.use(function (error, req, res, next) {
            method_1.httpMethods.error500(error, req, res, next);
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
                    [data_1.toString("/%s", path), data_1.toString("/%s/:id", path)].forEach(function (m) {
                        route.get(m, function (req, res) {
                            if (m.indexOf("/:id") === -1) {
                                method_1.httpMethods.all.on(req, res, option.model);
                            }
                            else {
                                method_1.httpMethods.detail.on(req, res, option.model);
                            }
                        });
                    });
                    break;
                }
                case "post": {
                    [data_1.toString("/%s", path)].forEach(function (m) {
                        route.post(m, function (req, res) {
                            method_1.httpMethods.create.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "put": {
                    [data_1.toString("/%s/:id", path)].forEach(function (m) {
                        route.put(m, function (req, res) {
                            method_1.httpMethods.update.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "delete": {
                    [data_1.toString("/%s/:id", path)].forEach(function (m) {
                        route.delete(m, function (req, res) {
                            method_1.httpMethods.remove.on(req, res, option.model);
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
