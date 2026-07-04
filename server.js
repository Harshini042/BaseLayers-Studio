const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 128 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

const formRecipients = {
  project: process.env.BUSINESS_TO || "hello@baselayersstudio.in",
  career: process.env.HR_TO || "hr@baselayerssstudio.in"
};

const subjectLabels = {
  project: "New project inquiry",
  career: "Career application"
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function isInsideRoot(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
    request.resume();
  });
}

function normalizeText(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function buildEmailBody(payload) {
  const lines = [
    "New website form submission",
    "",
    `Form type: ${payload.formType}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    ""
  ];

  Object.entries(payload.fields || {}).forEach(([key, value]) => {
    if (key === "name" || key === "email") {
      return;
    }

    lines.push(`${key.replace(/-/g, " ")}: ${normalizeText(value)}`);
  });

  lines.push("", "Sent from baselayersstudio.in website form.");
  return lines.join("\n");
}

async function handleEmail(request, response) {
  let payload;

  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch (error) {
    sendJson(response, 400, { ok: false, message: "Invalid request body." });
    return;
  }

  const formType = normalizeText(payload.formType, 40);
  const recipient = formRecipients[formType];
  const name = normalizeText(payload.name, 120);
  const email = normalizeText(payload.email, 160);
  const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};

  if (!recipient) {
    sendJson(response, 400, { ok: false, message: "Unknown form type." });
    return;
  }

  if (!name || !email || !email.includes("@")) {
    sendJson(response, 400, { ok: false, message: "Please provide a valid name and email." });
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    sendJson(response, 500, { ok: false, message: "SMTP is not configured on the server." });
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: recipient,
      replyTo: email,
      subject: `${subjectLabels[formType] || "Website inquiry"} from ${name}`,
      text: buildEmailBody({ formType, name, email, fields })
    });

    sendJson(response, 200, { ok: true, message: "Inquiry sent successfully." });
  } catch (error) {
    console.error("Email send failed:", error);
    sendJson(response, 500, { ok: false, message: "Email could not be sent. Please try again later." });
  }
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.resolve(rootDir, `.${decodeURIComponent(requestedPath)}`);

  if (!isInsideRoot(filePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/send-email") {
    handleEmail(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`BaseLayers Studio website running at http://localhost:${port}`);
  });
}

module.exports = server;
