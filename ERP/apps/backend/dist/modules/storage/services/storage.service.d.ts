export interface StoredObject {
    provider: 'local' | 'minio' | 's3';
    path: string;
    contentType: string;
    size: number;
}
export declare class StorageService {
    buildCompanyPath(companyId: string, module: string, entity: string, fileName: string): string;
}
