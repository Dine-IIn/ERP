import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => ({
        success: true,
        message: payload?.message ?? 'Operation successful',
        data: payload?.data ?? payload,
        meta: payload?.meta ?? {},
      })),
    );
  }
}
