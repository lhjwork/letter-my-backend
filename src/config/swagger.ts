import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Letter My Backend API",
      version: "1.0.0",
      description: "API documentation for Letter My Backend service",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.ts", 
    "./src/models/*.ts",
    "./dist/routes/*.js",  // For production
    "./dist/models/*.js"   // For production
  ], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
