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
exports.PlatformUser = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../database/base.entity");
let PlatformUser = class PlatformUser extends base_entity_1.BaseEntity {
    email;
    passwordHash;
    role;
    status;
};
exports.PlatformUser = PlatformUser;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PlatformUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash' }),
    __metadata("design:type", String)
], PlatformUser.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PlatformUser.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], PlatformUser.prototype, "status", void 0);
exports.PlatformUser = PlatformUser = __decorate([
    (0, typeorm_1.Entity)('platform_users')
], PlatformUser);
//# sourceMappingURL=platform-user.entity.js.map