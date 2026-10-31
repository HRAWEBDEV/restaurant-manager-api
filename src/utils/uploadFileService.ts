import { mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

class InvalidFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFileTypeError";
  }
}

class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileTooLargeError";
  }
}

const MAX_SIZE = 5 * 1024 * 1024;

const FILE_TYPES_CATEGORY = {
  image: ["image/jpeg", "image/png", "image/webp"],
} as const;

const FILE_CATEGORY_PATHS = {
  image: "images",
} as const;

function getFileType(category: keyof typeof FILE_TYPES_CATEGORY) {
  return [...FILE_TYPES_CATEGORY[category]];
}

function getFileTypePath(category: keyof typeof FILE_CATEGORY_PATHS) {
  return FILE_CATEGORY_PATHS[category];
}

class UploadFileService {
  static readonly staticPath: string = "/static";
  private options: {
    maxSize: number;
    savePath: string;
    allowedTypes: string[];
  };
  constructor(options: {
    maxSize?: number;
    savePath: string;
    allowedTypes: string[];
  }) {
    this.options = Object.assign(
      {
        maxSize: MAX_SIZE,
      },
      options,
    );
  }
  async saveStaticImage(file: File): Promise<string> {
    if (!this.options.allowedTypes.includes(file.type)) {
      throw new InvalidFileTypeError(
        `Invalid file type (${file.type}), allowed types are ${this.options.allowedTypes.join(", ")}`,
      );
    }
    if (file.size > this.options.maxSize) {
      throw new FileTooLargeError(
        `File is too large (${file.size} bytes, max ${this.options.maxSize} bytes)`,
      );
    }
    const extension = extname(file.name);
    const filename = `${randomUUID()}${extension}`;
    const directory = join(
      process.cwd(),
      UploadFileService.staticPath,
      this.options.savePath,
    );
    await mkdir(directory, {
      recursive: true,
    });
    const path = join(directory, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await Bun.write(path, buffer);
    return `${UploadFileService.staticPath}/${this.options.savePath}/${filename}`;
  }

  async deleteStaticImage(avatarPath: string): Promise<void> {
    const filePath = join(process.cwd(), avatarPath);
    try {
      await Bun.file(filePath).delete();
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export {
  FILE_TYPES_CATEGORY,
  FILE_CATEGORY_PATHS,
  UploadFileService,
  InvalidFileTypeError,
  FileTooLargeError,
  getFileType,
  getFileTypePath,
};
