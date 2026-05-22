import { Injectable } from '@nestjs/common';

export interface StoredObject {
  provider: 'local' | 'minio' | 's3';
  path: string;
  contentType: string;
  size: number;
}

@Injectable()
export class StorageService {
  buildCompanyPath(companyId: string, module: string, entity: string, fileName: string) {
    return `/${companyId}/${module}/${entity}/${fileName}`;
  }
}
