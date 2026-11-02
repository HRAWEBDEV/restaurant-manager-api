import {
  UploadFileService,
  getFileType,
  getFileTypePath,
} from "./uploadFileService";

class UploadOrganizationAvatar extends UploadFileService {
  constructor() {
    super({
      savePath: `${getFileTypePath("image")}/logo`,
      allowedTypes: getFileType("image"),
    });
  }
}

export { UploadOrganizationAvatar };
