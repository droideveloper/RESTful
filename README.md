##  RESTful - is easy to use restful service implementation for express and sequelize ##

Registers your database context on restful definitions for instance your table as "Frameworks" in mysql registered as `/frameworks` for methods:
  
  * GET     /frameworks
  * GET     /frameworks/:id
  * POST    /frameworks
  * PUT     /frameworks/:id
  * DELETE  /frameworks/:id

and by passing methods args on your registeration in array `["get", "post", "put", "delete"]`
you are allowed to manipulate proper methods or register only your needs. P.S. ( as defaults all registered )

supports some default query options:
  
  1. for array Response
    * select=property1,property2 (any property of model itself and some extras: id, href, createdAt, updatedAt)
    * sort=property,type (any property of model and type as 'desc' or 'asc' is default )
    * limit=number (25 is default)
    * offset=number (0 is default)  
    
  2. for object Response
    * select=property1,property2 (any property of model itself and some extras: id, href, createdAt, updatedAt)  

response are wrapped as follows

  for array responses:

  ```json
  {
    "code": 200,
    "message": "success",
    "data": [{ }],
    "count": 1, 
    "href": "$href", 
    "next": "$next", 
    "previous": "$previous", 
    "limit": 25,
    "offset": 0
  }
  ```

  for object or primitive responses:

  ```json
  {
    "code": 200,
    "message": "success",
    "data": { } 
  }
  ```

### How to install ###

with node package manager aka npm

`npm install --save restful-express-sequelize`

### How to use ###

if you prefer javascript then in your server.js or index.js file

```javascript
//imports
var express = require("express");
var bodyParser = require("body-parser");
var gzip = require("compression");
var context = require("restful-express-sequelize");
// model generted by sequelize-cli aka (sequelize model:create --name Framework --attributes name:string,lang:string)
var dbContext = require("./models");
// bind over ip and port instead of 127.0.0.1
var port = process.env.PORT || 52192;
var host = process.env.HOST || "192.168.1.100";
// express instance
var server = express();
// register body-parser middleware
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
// register compression middleware
server.use(gzip({ filter: function (req, res) {
  return !req.headers["x-no-gzip"];
}}));
// sync ORM context
if (dbContext.sequelize) {
  dbContext.sequelize.sync();
}
// get items from models
var models = [];
for (var property in dbContext) {
 if (property !== "sequelize" && property !== "Sequelize") {
   // register as options you can add { model: xxx, methods: ["get", "post"] } methods are optional 
    models.push({ model: dbContext[property] });
  }
}
// finally register your method(s) on base as '/v1/endpoint'
context.Resource.register(server, models, "/v1/endpoint");
// start serving
server.listen(port, host, function () {
  console.log("Server Running...");
});
```

if you prefer typescript then in your index.ts or server.ts file

```typescript
import * as express from "express";
import * as orm from "sequelize";
import * as bodyParser from "body-parser";
import * as gzip from "compression";
import { Request, Response } from "express";
import { Resource, ResourceOption } from "restful-express-sequelize";
import * as dbContext from "./models";

const port = process.env.PORT || 52192;
const host = process.env.HOST || "192.168.1.100";

const server = express();

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

server.use(gzip({ filter: (req: Request, res: Response): boolean => {
  return !req.headers["x-no-gzip"];
}}));

if(dbContext.sequelize) {
  dbContext.sequelize.sync();
}

const models: Array<ResourceOption<{}, {}>> = [];
for(const property in dbContext) {  
  if(property !== "sequelize" && property !== "Sequelize") {
      models.push({ model: dbContext[property] }); 
  }  
}

Resource.register(server, models, "/v1/endpoint");

server.listen(port, host, () => {
  console.log("Server Running...");
});
```

## License ##

Copyright 2017 Fatih Şen and contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
