import { Express, Router } from "express";
import * as orm from "sequelize";

export namespace RESTfulResource {

  /**
   * @param server app server instance
   * @param base base url appended for route
   * @param options required options to pass in
   */
  export function register<T, V>(server: Express, base?: string, ...options: Array<RESTfulResourceOption<T, V>>): void;

  /**
   * @param option required option to pass in
   * @returns Router instance for express.use()
   */
  export function route<T, V>(option: RESTfulResourceOption<T, V>): Router;
}

export interface RESTfulResourceOption<T, V> {
  model: orm.Model<T, V>;
  methods?: Array<string>;
}