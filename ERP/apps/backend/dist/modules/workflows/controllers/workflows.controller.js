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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowsController = void 0;
const common_1 = require("@nestjs/common");
const permissions_decorator_1 = require("../../../common/guards/permissions.decorator");
const permissions_guard_1 = require("../../../common/guards/permissions.guard");
const create_workflow_rule_dto_1 = require("../dto/create-workflow-rule.dto");
const workflows_service_1 = require("../services/workflows.service");
let WorkflowsController = class WorkflowsController {
    workflows;
    constructor(workflows) {
        this.workflows = workflows;
    }
    findRules(companyId) {
        return this.workflows.findRules(companyId);
    }
    createRule(dto) {
        return this.workflows.createRule(dto);
    }
};
exports.WorkflowsController = WorkflowsController;
__decorate([
    (0, common_1.Get)('companies/:companyId/rules'),
    (0, permissions_decorator_1.Permissions)('workflow.view'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "findRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, permissions_decorator_1.Permissions)('workflow.create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_workflow_rule_dto_1.CreateWorkflowRuleDto]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "createRule", null);
exports.WorkflowsController = WorkflowsController = __decorate([
    (0, common_1.Controller)('workflows'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [workflows_service_1.WorkflowsService])
], WorkflowsController);
//# sourceMappingURL=workflows.controller.js.map