export interface AuthenticatedUser {
    id: string;
    companyId?: string;
    roles: string[];
    permissions: string[];
    scope?: 'global' | 'branch' | 'department' | 'self';
}
