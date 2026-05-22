"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../database/base.entity");
let Company = class Company extends base_entity_1.BaseEntity {
    legalName;
    displayName;
    slug;
    databaseName;
    status;
    branding;
    featureFlags;
    license;
    deploymentConfig;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.Column)({ name: 'legal_name' }),
    __metadata("design:type", String)
], Company.prototype, "legalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name' }),
    __metadata("design:type", String)
], Company.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Company.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'database_name', unique: true }),
    __metadata("design:type", String)
], Company.prototype, "databaseName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], Company.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Company.prototype, "branding", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'feature_flags', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Company.prototype, "featureFlags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Company.prototype, "license", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deployment_config', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Company.prototype, "deploymentConfig", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=company.entity.js.map