import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiResponse } from '../dto/api-response.dto';
export declare class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>>;
}
