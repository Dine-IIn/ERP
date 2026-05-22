"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const api_response_interceptor_1 = require("./common/interceptors/api-response.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const apiPrefix = config.get('API_PREFIX', 'api');
    const apiVersion = config.get('API_VERSION', 'v1');
    app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalInterceptors(new api_response_interceptor_1.ApiResponseInterceptor());
    await app.listen(config.get('APP_PORT', 3000));
}
void bootstrap();
//# sourceMappingURL=main.js.map