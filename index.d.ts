/// <reference types="express" />
import { Router, Express } from "express";
import { Model } from "./src/data";
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
export declare class Resource {
    /**
     * Register as array or single
     */
    static register<T, V>(server: Express, options: Array<ResourceOption<T, V>>, base?: string): void;
    /**
     * create route from option
     */
    static route<T, V>(option: ResourceOption<T, V>): Router;
}
