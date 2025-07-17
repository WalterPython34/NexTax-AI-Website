import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.includes('/api/login') || req.path.includes('/api/auth') || req.path.includes('/auth-')) {
    console.log(`🌐 ${req.method} ${req.path} from ${req.hostname} (${req.get('origin') || 'direct'})`);
    console.log(`🔍 Request headers:`, { host: req.get('host'), origin: req.get('origin'), userAgent: req.get('user-agent')?.substring(0, 50) });
  }
  next();
});

// Security headers for iframe embedding and CORS
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const host = req.get('Host');
  
  // Allow access from custom domain, replit domain, and nextax.ai
  const allowedOrigins = [
    'https://nextax.ai',
    'https://startsmart.nextax.ai',
    'https://startsmart-gpt.replit.app'
  ];
  
  // Allow embedding in iframe from nextax.ai domains
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://nextax.ai');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://nextax.ai https://*.nextax.ai https://*.replit.app");
  
  // CORS headers for cross-origin requests
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (host && (host.includes('nextax.ai') || host.includes('replit.app'))) {
    res.setHeader('Access-Control-Allow-Origin', `https://${host}`);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
