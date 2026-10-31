import {
  UploadFileService,
  getFileType,
  getFileTypePath,
} from "./uploadFileService";

class UploadUserImageService extends UploadFileService {
  constructor() {
    super({
      savePath: `${getFileTypePath("image")}/avatar`,
      allowedTypes: getFileType("image"),
    });
  }
}

export { UploadUserImageService };
