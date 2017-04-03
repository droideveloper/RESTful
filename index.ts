import * as express from "express";
import { Request, Response, Router, NextFunction, Express } from "express";
import { toString, Model, SError } from "./src/data";
import { httpMethods } from "./src/method";
/**
 * Resource Options with model and methods to bind
 */
export interface ResourceOption<T, V> {
  model: Model<T, V>;
  methods?: Array<string>;
}
/**
 * Resource implementation
 */
export class Resource {
  /**
   * Register as array or single
   */
  public static register<T, V>(server: Express, options: Array<ResourceOption<T, V>>, base?: string, port?: Number): void {
    options.forEach((option: ResourceOption<T, V>): void => {
      if (base) {
        if (port) {
          server.use(base, Resource.route(option, port));
        } else {
          server.use(base, Resource.route(option));
        }
      } else {
        if (port) {
          server.use(Resource.route(option, port));
        } else {
          server.use(Resource.route(option));
        }
      }
    });
    server.use((req: Request, res: Response, next: NextFunction) => {
      httpMethods.error404(req, res, next);
    });
    server.use((error: SError, req: Request, res: Response, next: NextFunction) => {
      httpMethods.error500(error, req, res, next);
    });
  }
  /**
   * create route from option
   */
  public static route<T, V>(option: ResourceOption<T, V>, port?: Number): Router {
    const route = express.Router();
    const methods: Array<string> = option.methods || ["get", "post", "put", "delete"];
    const path = (<string> option.model.getTableName() || "").toLowerCase();
    methods.forEach((method: string) => {
      switch (method.toLowerCase()) {
        case "get": {
          [toString("/%s", path), toString("/%s/:id", path)].forEach((m: string) => {
            route.get(m, (req: Request, res: Response): void => {
              if (port) {
                req["xport"] = port;
              }
              if (m.indexOf("/:id") === -1) {
                httpMethods.all.on(req, res, option.model);
              } else {
                httpMethods.detail.on(req, res, option.model);
              }
            });
          });
          break;
        }
        case "post": {
          [toString("/%s", path)].forEach((m: string) => {
            route.post(m, (req: Request, res: Response): void => {
              if (port) {
                req["xport"] = port;
              }
              httpMethods.create.on(req, res, option.model);
            });
          });
          break;
        }
        case "put":  {
          [toString("/%s/:id", path)].forEach((m: string) => {
            route.put(m, (req: Request, res: Response): void => {
              if (port) {
                req["xport"] = port;
              }
              httpMethods.update.on(req, res, option.model);
            });
          });
          break;
        }
        case "delete": {
          [toString("/%s/:id", path)].forEach((m: string) => {
            route.delete(m, (req: Request, res: Response): void => {
              if (port) {
                req["xport"] = port;
              }
              httpMethods.remove.on(req, res, option.model);
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