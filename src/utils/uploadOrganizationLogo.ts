import {
  UploadFileService,
  getFileType,
  getFileTypePath,
} from "./uploadFileService";

class UploadOrganizationLogo extends UploadFileService {
  constructor() {
    super({
      savePath: `${getFileTypePath("image")}/logo`,
      allowedTypes: getFileType("image"),
    });
  }
}

export { UploadOrganizationLogo };
