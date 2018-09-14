"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var data_1 = require("./data");
var Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/fromPromise");
require("rxjs/add/observable/empty");
require("rxjs/add/observable/of");
require("rxjs/add/operator/map");
require("rxjs/add/operator/timeout");
require("rxjs/add/operator/concatMap");
require("rxjs/add/operator/mergeMap");
/**
 * parse key-value
 */
var toWhere = function (key, value) {
    var opt = { where: {} };
    opt.where[key] = value;
    return opt;
};
/**
 * Implementation of SObject
 */
class Objectify {
    on(data) {
        return JSON.parse(JSOn.stringify(data));
    }
}
/**
 * Implementation of SQuery for ?select=x,y,z
 */
class Selectify {
    on (req, data) {
        const fields = req.query.fields;
        if (fields) {
            if (Array.isArray(data)) {
                return data.map(entity => this.filter(fields, entity));
            }
            return this.filter(fields, data);
        }
        return data;
    }
    // filter  
    filter(properties, entity){
        return untyped.validate(entity, untyped.parse(properties));
    }
}
/**
 * Implementation of SQuery for ?sort=x,desc
 */
class Sortify {
    on(req, data) {
        let sortArgs = this.sorts(req.query.sort);
        if (sortArgs.property) {
            var filter = function (l, r) {
                var t = typeof l[sortArgs.property];
                if (t === "string") {
                    return l[sortArgs.property].localeCompare(r[sortArgs.property]);
                }
                else if (t === "number") {
                    return l[sortArgs.property] - r[sortArgs.property];
                }
                else if (t === "Date") {
                    return l[sortArgs.property].getTime() - r[sortArgs.property].getTime();
                }
                return 0;
            };
            if (sortArgs.desc) {
                return data.sort(filter)
                    .reverse();
            }
            return data.sort(filter);
        }
        return data;
    } 
    // sort func
    sorts(query) {
        let [property, desc = 'asc'] = (query || '').split(',').map(sort => sort.trim());
        return {
            property,
            desc: desc.toLowerCase() === 'desc'
        };
    }
}
/**
 * Implementation of SQuery for $href property
 */
class Urlify {

    on(req, data) {
        let self = this;
        if (Array.isArray(data)) {
            return data.map(function (entity) {
                if (!entity.href) {
                    entity.href = self.object(req, entity);
                }
                return entity;
            });
        }
        if (!data.href) {
            data.href = self.object(req, data);
        }
        return data;
    }

    object(req, data) {
        let xport = req.xport || 80;
        let url;
        if (xport !== 80) {
            url = data_1.toString("%s://%s:%d%s", req.protocol, req.hostname, xport, req.baseUrl);
        }
        else {
            url = data_1.toString("%s://%s%s", req.protocol, req.hostname, req.baseUrl);
        }
        var collection = req.url.split("/").map(function (d) { return d.trim(); });
        if (!data_1.isNullOrEmpty(req.query)) {
            // if url has any kind of query then we split it before we format content (index 0 was problem, it should be index 1)
            var pathCollection = collection[1].split("?").map(function (d) { return d.trim(); });
            // detail object might contain only select query for filtering on properties.      
            if (req.query.select) {
                return url.concat("/", pathCollection[0], "/", data.id.toString(), "?select=", req.query.select);
            }
            return url.concat("/", pathCollection[0], "/", data.id.toString());
        }
        // if this object is already in detail context in use.
        if (req.url.indexOf("/".concat(data.id.toString())) !== -1) {
            return url.concat(req.url);
        }
        return url.concat(req.url, "/", data.id.toString());
    }

    collection(req, count) {
        let xport = req.xport || 80;
        let self = this;
        let collectionArgs = {
            href: "",
            limit: parseInt(req.query.limit || 25),
            offset: parseInt(req.query.offset || 0),
            count: count
        };
        let uri;
        if (xport !== 80) {
            collectionArgs.href = data_1.toString("%s://%s:%d%s%s", req.protocol, req.hostname, xport, req.baseUrl, req.url);
            uri = data_1.toString("%s://%s:%d%s%s", req.protocol, req.hostname, xport, req.baseUrl, (req.url.split("?")[0] || req.url));
        }
        else {
            collectionArgs.href = data_1.toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, req.url);
            uri = data_1.toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, (req.url.split("?")[0] || req.url));
        }
        var hasNext = count >= collectionArgs.limit;
        if (hasNext) {
            collectionArgs.next = self.properties(uri, req.query, (collectionArgs.offset + collectionArgs.limit));
        }
        var hasPrev = (collectionArgs.offset - collectionArgs.limit) >= 0;
        if (hasPrev) {
            collectionArgs.previous = self.properties(uri, req.query, (collectionArgs.offset - collectionArgs.limit));
        }
        return collectionArgs;
    } 

    hasPreviousQuery(uri) {
        return uri && uri.indexOf("?") === -1;
    }

    properties(uri, query, offset) {
        var self = this;
        for (var property in query) {
            if (query.hasOwnProperty(property)) {
                uri = uri.concat(self.hasPreviousQuery(uri) ? "?" : "&", property, "=", property === "offset" ? offset.toString() : query[property].toString());
            }
        }
        return uri;
    }
}
/** Instance of Objectify */
let objectify = new Objectify();
/** Instance of Selectify */
let selectify = new Selectify();
/** Instance of Sortify */
let sortify = new Sortify();
/** Instance of Urlify */
let urlify = new Urlify();
/**
 * Implementation of SRequest for All.
 */
let All = new All()
class All {
    on(req, res, model) {
        var served = false;
        var limit = parseInt(req.query.limit || 25); // defults for 'limit'
        var offset = parseInt(req.query.offset || 0); // defults for 'offset'
        Observable_1.Observable.fromPromise(model.all({
            limit: limit,
            offset: offset,
            include: model.map || []
        }).catch(function (error) {
            served = true;
            res.json({
                status: 400,
                message: error.name || "database error",
                data: error.message || "error occured in database transaction"
            });
        })).map(function (entities) { return objectify.on(entities); })
           .map(function (entities) { return selectify.on(req, entities); })
           .map(function (entities) { return urlify.on(req, entities); })
           .map(function (entities) { return sortify.on(req, entities); })
           .map(function (entities) {
            var args = urlify.collection(req, entities.length);
            var response = { code: 200, message: "success", data: entities, href: args.href };
            if (args.next) {
                response.next = args.next;
            }
            if (args.previous) {
                response.previous = args.previous;
            }
            response.count = entities.length;
            response.limit = args.limit;
            response.offset = args.offset;
            return response;
        }).subscribe(function (response) { return res.json(response); }, function (error) {
            if (!served) {
                res.json({
                    status: 400,
                    message: error.name || "database error",
                    data: error.message || "error occured in database transaction"
                });
            }
        });
    }
}
exports.All = All;
/**
 * Implementation of SRequest for Detail.
 * on orm.Model property needed to appended are;
 *  - idKey: string
 *  - includeModels: Array<orm.Model<?, ?>>
 */
let Detail = new Detail()
class Detail {
    on(req, res, model) {
        var served = false;
        var objectId = parseInt(req.params.id || 0);
        if (objectId > 0) {
            var where = toWhere(model.primaryKeyName || "id", objectId);
            if (model.map) {
                where["include"] = model.map;
            }
            Observable_1.Observable.fromPromise(model.find(where)
                .catch(function (error) {
                served = true;
                res.json({
                    status: 400,
                    message: error.name || "database error",
                    data: error.message || "error occured in database transaction"
                });
            })).map(function (entity) { return objectify.on(entity); })
               .mergeMap(function (entity) {
                  if (data_1.isNullOrEmpty(entity)) {
                    res.json({ code: 400, message: "no such object exists.", data: null });
                    return Observable_1.Observable.empty();
                  }
                  return Observable_1.Observable.of(entity);
            }).map(function (entity) { return selectify.on(req, entity); })
              .map(function (entity) { return urlify.on(req, entity); })
              .map(function (entity) { return { code: 200, message: "success", data: entity }; })
              .subscribe(function (response) { return res.json(response); }, function (error) {
                if (!served) {
                    res.json({
                        status: 400,
                        message: error.name || "database error",
                        data: error.message || "error occured in database transaction"
                    });
                }
            });
        }
        else {
            throw { status: 400, message: "invalid object id, check param id.", name: "InvalidObjectId" };
        }
    }
}
exports.Detail = Detail;
/**
 * Implementation of SRequest for Create.
 */
let Create = new Create()
class Create {
    on(req, res, model) {
        var served = false;
        var object = (req.body || {});
        if (!data_1.isNullOrEmpty(object)) {
            Observable_1.Observable.fromPromise(model.create(object)
               .catch(function (error) {
                  served = true;
                  res.json({
                    status: 400,
                    message: error.name || "database error",
                    data: error.message || "error occured in database transaction"
                });
            })).map(function (entity) { return objectify.on(entity); })
               .map(function (entity) { return selectify.on(req, entity); })
               .map(function (entity) { return urlify.on(req, entity); })
               .map(function (entity) { return { code: 200, message: "success", data: entity }; })
               .subscribe(function (response) { return res.json(response); }, function (error) {
                  if (!served) {
                    res.json({
                        status: 400,
                        message: error.name || "database error",
                        data: error.message || "error occured in database transaction"
                    });
                  }
            });
        }
        else {
            throw { status: 400, message: "invalid object", name: "InvalidObject" };
        }
    }
}
exports.Create = Create;
/**
 * Implementation of SRequest for Update.
 */
let Update = new Update()
class Update {
    on(req, res, model) {
        var served = false;
        var objectId = parseInt(req.params.id || 0);
        var object = (req.body || {});
        if (objectId > 0 && !data_1.isNullOrEmpty(object)) {
            var where = toWhere(model.primaryKeyName || "id", objectId);
            if (model.map) {
                where["include"] = model.map;
            }
            Observable_1.Observable.fromPromise(model.update(object, where)
                .catch(function (error) {
                  served = true;
                  res.json({
                    status: 400,
                    message: error.name || "database error",
                    data: error.message || "error occured in database transaction"
                });
            })).concatMap(function (count) { return count; })
               .map(function (count) { return { code: 200, message: "success", data: count }; })
               .subscribe(function (response) { return res.json(response); }, function (error) {
                if (!served) {
                    res.json({
                        status: 400,
                        message: error.name || "database error",
                        data: error.message || "error occured in database transaction"
                    });
                }
            });
        }
        else {
            throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
        } 
    }
}
exports.Update = Update;
/**
 * Implementation of SRequest for Remove.
 */
let Remove = new Remove()
class Remove {
    on(req, res, model) {
        var served = false;
        var objectId = parseInt(req.params.id || 0);
        if (objectId > 0) {
            var where = toWhere(model.primaryKeyName || "id", objectId);
            if (model.map) {
                where["include"] = model.map;
            }
            Observable_1.Observable.fromPromise(model.destroy(where)
                .catch(function (error) {
                  served = true;
                  res.json({
                    status: 400,
                    message: error.name || "database error",
                    data: error.message || "error occured in database transaction"
                });
            })).map(function (count) { return { code: 200, message: "success", data: count }; })
               .subscribe(function (response) { return res.json(response); }, function (error) {
                if (!served) {
                    res.json({
                        status: 400,
                        message: error.name || "database error",
                        data: error.message || "error occured in database transaction"
                    });
                }
            });
        }
        else {
            throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
        }
    }
}
exports.Remove = Remove;
/**
 * export httpMethods handlers.
 */
exports.httpMethods = {
    all: new All(),
    detail: new Detail(),
    create: new Create(),
    update: new Update(),
    remove: new Remove(),
    error404: function (req, res, next) {
        next({ status: 404, message: "no such url exists.", name: "NotFound." });
    },
    error500: function (error, req, res, next) {
        res.json({
            code: error.status || 500,
            message: error.name || "ServerError",
            data: error.message || "internal server error"
        });
    }
};
