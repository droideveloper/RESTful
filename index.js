"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var utils = require("./src/data");
var methods = require("./src/method");
/**
 * Resource implementation
 */
let Resource = new Resource()
class Resource {

    register(server, options, base, port) {
        options.forEach(function (option) {
            if (base) {
              if (port) {
                server.use(base, Resource.route(option, port));
              }
              else {
                server.use(base, Resource.route(option));
              }
            }
            else {
              if (port) {
                server.use(Resource.route(option, port));
              }
              else {
                server.use(Resource.route(option));
              }
            }
        });
        server.use(function (req, res, next) {
          methods.httpMethods.error404(req, res, next);
        });
        server.use(function (error, req, res, next) {
          methods.httpMethods.error500(error, req, res, next);
        });
    }

    route(option, port) {
        let route = express.Router();
        let methods = option.methods || ["get", "post", "put", "delete"];
        let path = (option.model.getTableName() || "").toLowerCase();
        methods.forEach(function (method) {
            switch (method.toLowerCase()) {
                case "get": {
                    [utils.toString("/%s", path), utils.toString("/%s/:id", path)].forEach(function (m) {
                        route.get(m, function (req, res) {
                            if (port) {
                                req["xport"] = port;
                            }
                            if (m.indexOf("/:id") === -1) {
                                methods.httpMethods.all.on(req, res, option.model);
                            }
                            else {
                                methods.httpMethods.detail.on(req, res, option.model);
                            }
                        });
                    });
                    break;
                }
                case "post": {
                    [utils.toString("/%s", path)].forEach(function (m) {
                        route.post(m, function (req, res) {
                            if (port) {
                                req["xport"] = port;
                            }
                            methods.httpMethods.create.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "put": {
                    [utils.toString("/%s/:id", path)].forEach(function (m) {
                        route.put(m, function (req, res) {
                            if (port) {
                                req["xport"] = port;
                            }
                            methods.httpMethods.update.on(req, res, option.model);
                        });
                    });
                    break;
                }
                case "delete": {
                    [utils.toString("/%s/:id", path)].forEach(function (m) {
                        route.delete(m, function (req, res) {
                            if (port) {
                                req["xport"] = port;
                            }
                            methods.httpMethods.remove.on(req, res, option.model);
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
    }
}
exports.Resource = Resource;
