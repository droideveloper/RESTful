"use strict";
var data_1 = require("./data");
var Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/fromPromise");
require("rxjs/add/observable/empty");
require("rxjs/add/observable/of");
require("rxjs/add/operator/map");
require("rxjs/add/operator/concatMap");
require("rxjs/add/operator/mergeMap");
/**
 * Implementation of SObject
 */
var Objectify = (function () {
    function Objectify() {
    }
    Objectify.prototype.on = function (data) {
        return JSON.parse(JSON.stringify(data));
    };
    return Objectify;
}());
/**
 * Implementation of SQuery for ?select=x,y,z
 */
var Selectify = (function () {
    function Selectify() {
    }
    Selectify.prototype.on = function (req, data) {
        var self = this;
        var properties = self.selects(req);
        if (properties) {
            if (Array.isArray(data)) {
                return data.map(function (entity) {
                    return self.filter(properties, entity);
                });
            }
            return self.filter(properties, data);
        }
        return data;
    };
    /**
     * select properties from query of request.
     */
    Selectify.prototype.selects = function (req) {
        return (req.query.select || "")
            .split(",")
            .map(function (select) { return select.trim(); });
    };
    /**
     * filter object with properties found.
     */
    Selectify.prototype.filter = function (properties, entity) {
        var filtered = {};
        properties.forEach(function (property) { return filtered[property] = entity[property]; });
        return data_1.isNullOrEmpty(filtered) ? entity : filtered;
    };
    return Selectify;
}());
/**
 * Implementation of SQuery for ?sort=x,desc
 */
var Sortify = (function () {
    function Sortify() {
    }
    Sortify.prototype.on = function (req, data) {
        var self = this;
        var sortArgs = self.sorts(req);
        if (sortArgs.property) {
            var filter = function (l, r) {
                if (typeof l[sortArgs.property] === "string") {
                    return l[sortArgs.property].localeCompare(r[sortArgs.property]);
                }
                else if (typeof l[sortArgs.property] === "number") {
                    return l[sortArgs.property] - r[sortArgs.property];
                }
                else if (typeof l[sortArgs.property] === "Date") {
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
    };
    /**
     * sort property and type from query of request.
     */
    Sortify.prototype.sorts = function (req) {
        var args = (req.query.sort || "")
            .split(",")
            .map(function (sort) { return sort.trim(); });
        return { property: args[0] || "",
            desc: (args[1] || "asc").toLowerCase() === "desc"
        };
    };
    return Sortify;
}());
/**
 * Implementation of SQuery for $href property
 */
var Urlify = (function () {
    function Urlify() {
    }
    Urlify.prototype.on = function (req, data) {
        var self = this;
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
    };
    /**
     * create object href.
     */
    Urlify.prototype.object = function (req, data) {
        var url = data_1.toString("%s://%s%s", req.protocol, req.hostname, req.baseUrl);
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
        return url.concat(req.url, "/", data.id.toString());
    };
    /**
     * create collection of object href.
     */
    Urlify.prototype.collection = function (req, count) {
        var self = this;
        var collectionArgs = {
            href: data_1.toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, req.url),
            limit: parseInt(req.query.limit || 25),
            offset: parseInt(req.query.offset || 0),
            count: count
        };
        var uri = data_1.toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, (req.url.split("?")[0] || req.url));
        var hasNext = count >= collectionArgs.limit;
        if (hasNext) {
            collectionArgs.next = self.properties(uri, req.query, (collectionArgs.offset + collectionArgs.limit));
        }
        var hasPrev = (collectionArgs.offset - collectionArgs.limit) >= 0;
        if (hasPrev) {
            collectionArgs.previous = self.properties(uri, req.query, (collectionArgs.offset - collectionArgs.limit));
        }
        return collectionArgs;
    };
    /**
     * controls if uri has previously query.
     */
    Urlify.prototype.hasPreviousQuery = function (uri) {
        return uri && uri.indexOf("?") === -1;
    };
    /**
     * read properties on query and write them again, as long as it is not `offset`
     */
    Urlify.prototype.properties = function (uri, query, offset) {
        for (var property in query) {
            if (query.hasOwnProperty(property)) {
                uri = uri.concat(this.hasPreviousQuery(uri) ? "?" : "&", property, "=", property === "offset" ? offset.toString() : query[property].toString());
            }
        }
        return uri;
    };
    return Urlify;
}());
/** Instance of Objectify */
var objectify = new Objectify();
/** Instance of Selectify */
var selectify = new Selectify();
/** Instance of Sortify */
var sortify = new Sortify();
/** Instance of Urlify */
var urlify = new Urlify();
/**
 * Implementation of SRequest for All.
 */
var All = (function () {
    function All() {
    }
    All.prototype.on = function (req, res, model) {
        var limit = parseInt(req.query.limit || 25); // defults for 'limit'
        var offset = parseInt(req.query.offset || 0); // defults for 'offset'
        Observable_1.Observable.fromPromise(model.all({
            limit: limit,
            offset: offset
        })).map(function (entities) { return objectify.on(entities); })
            .map(function (entities) { return urlify.on(req, entities); })
            .map(function (entities) { return selectify.on(req, entities); })
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
        }).subscribe(function (response) { return res.json(response); });
    };
    return All;
}());
exports.All = All;
/**
 * Implementation of SRequest for Detail.
 */
var Detail = (function () {
    function Detail() {
    }
    Detail.prototype.on = function (req, res, model) {
        var objectId = parseInt(req.params.id || 0);
        if (objectId > 0) {
            Observable_1.Observable.fromPromise(model.find({
                where: {
                    id: objectId
                }
            })).map(function (entity) { return objectify.on(entity); })
                .mergeMap(function (entity) {
                if (data_1.isNullOrEmpty(entity)) {
                    res.json({ code: 400, message: "no such object exists.", data: null });
                    return Observable_1.Observable.empty();
                }
                return Observable_1.Observable.of(entity);
            }).map(function (entity) { return urlify.on(req, entity); })
                .map(function (entity) { return selectify.on(req, entity); })
                .map(function (entity) { return { code: 200, message: "success", data: entity }; })
                .subscribe(function (response) { return res.json(response); });
        }
        else {
            throw { status: 400, message: "invalid object id, check param id.", name: "InvalidObjectId" };
        }
    };
    return Detail;
}());
exports.Detail = Detail;
/**
 * Implementation of SRequest for Create.
 */
var Create = (function () {
    function Create() {
    }
    Create.prototype.on = function (req, res, model) {
        var object = (req.body || {});
        if (!data_1.isNullOrEmpty(object)) {
            Observable_1.Observable.fromPromise(model.create(object)).map(function (entity) { return objectify.on(entity); })
                .map(function (entity) { return urlify.on(req, entity); })
                .map(function (entity) { return selectify.on(req, entity); })
                .map(function (entity) { return { code: 200, message: "success", data: entity }; })
                .subscribe(function (response) { return res.json(response); });
        }
        else {
            throw { status: 400, message: "invalid object", name: "InvalidObject" };
        }
    };
    return Create;
}());
exports.Create = Create;
/**
 * Implementation of SRequest for Update.
 */
var Update = (function () {
    function Update() {
    }
    Update.prototype.on = function (req, res, model) {
        var objectId = parseInt(req.params.id || 0);
        var object = (req.body || {});
        if (objectId > 0 && !data_1.isNullOrEmpty(object)) {
            Observable_1.Observable.fromPromise(model.update(object, {
                where: {
                    id: objectId
                }
            })).concatMap(function (count) { return count; })
                .map(function (count) { return { code: 200, message: "success", data: count }; })
                .subscribe(function (response) { return res.json(response); });
        }
        else {
            throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
        }
    };
    return Update;
}());
exports.Update = Update;
/**
 * Implementation of SRequest for Remove.
 */
var Remove = (function () {
    function Remove() {
    }
    Remove.prototype.on = function (req, res, model) {
        var objectId = parseInt(req.params.id || 0);
        if (objectId > 0) {
            Observable_1.Observable.fromPromise(model.destroy({
                where: {
                    id: objectId
                }
            })).map(function (count) { return { code: 200, message: "success", data: count }; })
                .subscribe(function (response) { return res.json(response); });
        }
        else {
            throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
        }
    };
    return Remove;
}());
exports.Remove = Remove;
/**
 * export httpMethods handlers.
 */
exports.httpMethods = {
    all: new All(),
    detail: new Detail(),
    create: new Create(),
    update: new Update(),
    remove: new Remove()
};
