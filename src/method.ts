import { Request, Response } from "express";
import {
  SRequest, SResponse, SObject, SQuery,
  SEntity, SSortArgs, SCollectionArgs,
  isNullOrEmpty, toString
} from "./data";
import { Observable } from "rxjs/Observable";
import * as promise from "bluebird";
import * as orm from "sequelize";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/of";
import "rxjs/add/operator/map";
import "rxjs/add/operator/concatMap";
import "rxjs/add/operator/mergeMap";
/**
 * Implementation of SObject
 */
class Objectify<T extends SEntity> implements SObject<T> {
  on(data: T | Array<T>): T | Array<T> {
    return JSON.parse(JSON.stringify(data));
  }
}
/**
 * Implementation of SQuery for ?select=x,y,z
 */
class Selectify<T extends SEntity> implements SQuery<T> {
  on(req: Request, data: T | Array<T>): T | Array<T> {
    const self = this;
    const properties: Array<string> = self.selects(req);
    if (properties) {
      if (Array.isArray(data)) {
        return (<Array<T>> data).map((entity: T) => {
          return self.filter(properties, entity);
        });
      }
      return self.filter(properties, data);
    }
    return data;
  }

  /**
   * select properties from query of request.
   */
  private selects(req: Request): Array<string> {
    return (<string> req.query.select || "")
      .split(",")
      .map((select: string) => select.trim());
  }

  /**
   * filter object with properties found.
   */
  private filter(properties: Array<string>, entity: T): T {
    const filtered = {};
    properties.forEach((property: string): void => filtered[property] = entity[property]);
    return isNullOrEmpty(filtered) ? entity : (<T> filtered);
  }
}
/**
 * Implementation of SQuery for ?sort=x,desc
 */
class Sortify<T extends SEntity> implements SQuery<T> {
  on(req: Request, data: Array<T>): Array<T> {
    const self = this;
    const sortArgs: SSortArgs = self.sorts(req);
    if (sortArgs.property) {
      const filter = (l: T, r: T): number => {
        if (typeof l[sortArgs.property] === "string") {
          return (<string> l[sortArgs.property]).localeCompare((<string> r[sortArgs.property]));
        } else if (typeof l[sortArgs.property] === "number") {
          return (<number> l[sortArgs.property]) - (<number> r[sortArgs.property]);
        } else if (typeof l[sortArgs.property] === "Date") {
          return (<Date> l[sortArgs.property]).getTime() - (<Date> r[sortArgs.property]).getTime();
        } return 0;
      };
      if (sortArgs.desc) {
        return data.sort(filter)
          .reverse();
      }
      return data.sort(filter);
    }
    return data;
  }
  /**
   * sort property and type from query of request.
   */
  private sorts(req: Request): SSortArgs {
    const args: Array<string> = (<string> req.query.select || "")
      .split(",")
      .map((sort: string) => sort.trim());

    return { property: args[0] || "",
      desc: (args[1] || "asc").toLowerCase() === "desc"
    };
  }
}
/**
 * Implementation of SQuery for $href property
 */
class Urlify<T extends SEntity> implements SQuery<T> {
  on(req: Request, data: T | Array<T>): T | Array<T> {
    const self = this;
    if (Array.isArray(data)) {
      return data.map((entity: T) => {
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
  /**
   * create object href.
   */
  object(req: Request, data: T): string {
    const url: string = toString("%s://%s%s", req.protocol, req.hostname, req.baseUrl);
    const collection: Array<string> = req.url.split("/").map(d => d.trim());
    if (!isNullOrEmpty(req.query)) {
      // if url has any kind of query then we split it before we format content
      const pathCollection: Array<string> = collection[0].split("?").map(d => d.trim());
      // detail object might contain only select query for filtering on properties.
      if (req.query.select) {
        return url.concat("/", pathCollection[0], "/", data.id.toString(), "?select=", req.query.select);
      }
      return url.concat("/", pathCollection[0], "/", data.id.toString());
    }
    return url.concat("/", collection[0], "/", data.id.toString());
  }
  /**
   * create collection of object href.
   */
  collection(req: Request, count: number): SCollectionArgs {
    const self = this;
    const collectionArgs: SCollectionArgs = {
      href: toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, req.url),
      limit: parseInt(req.query.limit || 25),
      offset: parseInt(req.query.offset || 0),
      count: count
    };
    const uri = toString("%s://%s%s%s", req.protocol, req.hostname, req.baseUrl, (req.url.split("?")[0] || ""));
    const hasNext = count >= collectionArgs.limit;
    if (hasNext) {
      collectionArgs.next = self.properties(uri, req.query, (collectionArgs.offset + collectionArgs.limit));
    }
    const hasPrev = (collectionArgs.offset - collectionArgs.limit) >= 0;
    if (hasPrev) {
      collectionArgs.previous = self.properties(uri, req.query, (collectionArgs.offset - collectionArgs.limit));
    }
    return collectionArgs;
  }
  /**
   * controls if uri has previously query.
   */
  private hasPreviousQuery(uri: string): boolean {
    return uri && uri.indexOf("?") === -1;
  }
  /**
   * read properties on query and write them again, as long as it is not `offset`
   */
  private properties(uri: string, query: any, offset: number): string {
    for (const property in query) {
      if (query.hasOwnProperty(property)) {
        uri = uri.concat(this.hasPreviousQuery(uri) ? "?" : "&", property, "=", property === "offset" ? offset.toString() : query[property].toString());
      }
    }
    return uri;
  }
}
/** Instance of Objectify */
const objectify = new Objectify();
/** Instance of Selectify */
const selectify = new Selectify();
/** Instance of Sortify */
const sortify = new Sortify();
/** Instance of Urlify */
const urlify = new Urlify();
/**
 * Implementation of SRequest for All.
 */
class All<T, V> implements SRequest<T, V> {
  on(req: Request, res: Response, model: orm.Model<T, V>): void {
    const limit: number = parseInt(req.query.limit || 25); // defults for 'limit'
    const offset: number = parseInt(req.query.offset || 0); // defults for 'offset'
    Observable.fromPromise(
      model.all({
        limit: limit,
        offset: offset
      })
    ).map((entities: Array<SEntity>) => objectify.on(entities))
     .map((entities: Array<SEntity>) => urlify.on(req, entities))
     .map((entities: Array<SEntity>) => selectify.on(req, entities))
     .map((entities: Array<SEntity>) => sortify.on(req, entities))
     .map((entities: Array<SEntity>) => {
       const args = urlify.collection(req, entities.length);
       const response: SResponse<SEntity> = { code: 200, message: "success", data: entities, href: args.href };
       if (args.next) { response.next = args.next; }
       if (args.previous) { response.previous = args.previous; }
       response.count = entities.length;
       response.limit = args.limit;
       response.offset = args.offset;
       return response;
     }).subscribe((response: SResponse<SEntity>) => res.json(response));
  }
}
/**
 * Implementation of SRequest for Detail.
 */
class Detail<T, V> implements SRequest<T, V> {
  on(req: Request, res: Response, model: orm.Model<T, V>): void {
    const objectId: number = parseInt(req.params.id || 0);
    if (objectId > 0) {
      Observable.fromPromise(
        model.find({
          where: {
            id: objectId
          }
        })
      ).map((entity: SEntity) => objectify.on(entity))
       .mergeMap((entity: SEntity) => {
         if (isNullOrEmpty(entity)) {
           res.json({ code: 400, message: "no such object exists.", data: null });
           return Observable.empty();
         }
         return Observable.of(entity);
       }).map((entity: SEntity) => urlify.on(req, entity))
       .map((entity: SEntity) => selectify.on(req, entity))
       .map((entity: SEntity) => { return { code: 200, message: "success", data: entity }; })
       .subscribe((response: SResponse<SEntity>) => res.json(response));
    } else {
      throw { status: 400, message: "invalid object id, check param id.", name: "InvalidObjectId" };
    }
  }
}
/**
 * Implementation of SRequest for Create.
 */
class Create<T, V> implements SRequest<T, V> {
  on(req: Request, res: Response, model: orm.Model<T, V>): void {
    const object: V = <V> (req.body || {});
    if (!isNullOrEmpty(object)) {
      Observable.fromPromise(
        model.create(object)
      ).map((entity: SEntity) => objectify.on(entity))
       .map((entity: SEntity) => urlify.on(req, entity))
       .map((entity: SEntity) => selectify.on(req, entity))
       .map((entity: SEntity) => { return { code: 200, message: "success", data: entity }; })
       .subscribe((response: SResponse<SEntity>) => res.json(response));
    } else {
      throw { status: 400, message: "invalid object", name: "InvalidObject" };
    }
  }
}
/**
 * Implementation of SRequest for Update.
 */
class Update<T, V> implements SRequest<T, V> {
  on(req: Request, res: Response, model: orm.Model<T, V>): void {
    const objectId: number = parseInt(req.params.id || 0);
    const object: V = <V> (req.body || {});
    if (objectId > 0 && !isNullOrEmpty(object)) {
      Observable.fromPromise(
        model.update(object, {
          where: {
            id: objectId
          }
        })
      ).concatMap((count: Array<number>) => count)
       .map((count: number) => { return { code: 200, message: "success", data: count }; })
       .subscribe((response: SResponse<number>) => res.json(response));
    } else {
      throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
    }
  }
}
/**
 * Implementation of SRequest for Remove.
 */
class Remove<T, V> implements SRequest<T, V> {
  on(req: Request, res: Response, model: orm.Model<T, V>): void {
    const objectId: number = parseInt(req.params.id || 0);
    if (objectId > 0) {
      Observable.fromPromise(
        model.destroy({
          where: {
            id: objectId
          }
        })
      ).map((count: number) => { return { code: 200, message: "success", data: count }; })
       .subscribe((response: SResponse<number>) => res.json(response));
    } else {
      throw { status: 400, message: "no such object exists.", name: "NoSuchObjectExists." };
    }
  }
}
/**
 * export httpMethods handlers.
 */
export const httpMethods = {
  all: new All(),
  detail: new Detail(),
  create: new Create(),
  update: new Update(),
  remove: new Remove()
};