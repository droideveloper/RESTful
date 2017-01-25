import * as express from "express";
import * as orm from "sequelize";
import { Request, Response, Router, NextFunction, Express } from "express";
import { toString } from "./data";
import { httpMethods } from "./method";
/**
 * Resource Options with model and methods to bind
 */
export interface ResourceOption<T, V> {
  model: orm.Model<T, V>;
  methods?: Array<string>;
}
/**
 * Resource implementation
 */
export class Resource {
  /**
   * Register as array or single
   */
  public static register<T, V>(server: Express, base?: string, ...options: Array<ResourceOption<T, V>>): void {
    options.forEach((option: ResourceOption<T, V>) => {
      if (base) {
        server.use(base, Resource.route(option));
      }
      server.use(Resource.route(option));
    });
  }
  /**
   * create route from option
   */
  public static route<T, V>(option: ResourceOption<T, V>): Router {
    const route = express.Router();
    const methods: Array<string> = option.methods || ["get", "post", "put", "delete"];
    const path = (<string> option.model.getTableName() || "").toLowerCase();
    methods.forEach((method: string) => {
      switch (method.toLowerCase()) {
        case "get": {
          [toString("/%s", path), toString("/%s/:id", path)].forEach((m: string) => {
            route.get(m, (req: Request, res: Response): void => {
              if (m.indexOf("/:id") !== -1) {
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
              httpMethods.create.on(req, res, option.model);
            });
          });
          break;
        }
        case "put":  {
          [toString("/%s/:id", path)].forEach((m: string) => {
            route.put(m, (req: Request, res: Response): void => {
              httpMethods.update.on(req, res, option.model);
            });
          });
          break;
        }
        case "delete": {
          [toString("/%s/:id", path)].forEach((m: string) => {
            route.delete(m, (req: Request, res: Response): void => {
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

