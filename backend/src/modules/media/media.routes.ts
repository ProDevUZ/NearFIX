import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MediaScope } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { authenticate } from "../auth/middleware/auth.middleware.js";
import { createUploadedMedia } from "./media.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm"
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDir),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Only image and video files are allowed"), {
        status: 415,
        code: "UNSUPPORTED_MEDIA_TYPE"
      }));
      return;
    }

    callback(null, true);
  }
});

function resolveScope(value: unknown) {
  const raw = typeof value === "string" ? value.toUpperCase() : undefined;
  if (raw && raw in MediaScope) return MediaScope[raw as keyof typeof MediaScope];
  return undefined;
}

function normalizeMimeType(value: string) {
  const mimeType = value.toLowerCase();
  if (mimeType === "image/jpg" || mimeType === "image/pjpeg") return "image/jpeg";
  if (mimeType === "image/x-png") return "image/png";
  return mimeType;
}

export const mediaRouter = Router();

mediaRouter.post("/upload", authenticate, upload.single("file"), async (request, response, next) => {
  try {
    const file = request.file;

    if (!file) {
      throw Object.assign(new Error("File is required"), {
        status: 400,
        code: "FILE_REQUIRED"
      });
    }

    const url = `${request.protocol}://${request.get("host")}/uploads/${file.filename}`;
    const media = await createUploadedMedia(request.user!, {
      roomId: typeof request.body.roomId === "string" ? request.body.roomId : undefined,
      orderId: typeof request.body.orderId === "string" ? request.body.orderId : undefined,
      scope: resolveScope(request.body.scope),
      url,
      fileName: file.originalname,
      mimeType: normalizeMimeType(file.mimetype),
      size: file.size
    });

    response.json({ ok: true, media });
  } catch (error) {
    next(error);
  }
});
