import { Request, Response, NextFunction } from "express";
import { SRequest, Model, SError } from "./data";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/of";
import "rxjs/add/operator/map";
import "rxjs/add/operator/timeout";
import "rxjs/add/operator/concatMap";
import "rxjs/add/operator/mergeMap";
/**
 * Implementation of SRequest for All.
 */
export declare class All<T, V> implements SRequest<T, V> {
    on(req: Request, res: Response, model: Model<T, V>): void;
}
/**
 * Implementation of SRequest for Detail.
 * on orm.Model property needed to appended are;
 *  - idKey: string
 *  - includeModels: Array<orm.Model<?, ?>>
 */
export declare class Detail<T, V> implements SRequest<T, V> {
    on(req: Request, res: Response, model: Model<T, V>): void;
}
/**
 * Implementation of SRequest for Create.
 */
export declare class Create<T, V> implements SRequest<T, V> {
    on(req: Request, res: Response, model: Model<T, V>): void;
}
/**
 * Implementation of SRequest for Update.
 */
export declare class Update<T, V> implements SRequest<T, V> {
    on(req: Request, res: Response, model: Model<T, V>): void;
}
/**
 * Implementation of SRequest for Remove.
 */
export declare class Remove<T, V> implements SRequest<T, V> {
    on(req: Request, res: Response, model: Model<T, V>): void;
}
/**
 * export httpMethods handlers.
 */
export declare const httpMethods: {
    all: All<{}, {}>;
    detail: Detail<{}, {}>;
    create: Create<{}, {}>;
    update: Update<{}, {}>;
    remove: Remove<{}, {}>;
    error404: (req: Request, res: Response, next: NextFunction) => void;
    error500: (error: SError, req: Request, res: Response, next: NextFunction) => void;
};
