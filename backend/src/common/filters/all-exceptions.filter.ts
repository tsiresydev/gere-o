import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ErrorPayload = {
      statusCode: status,
      message: 'Erreur interne du serveur',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        payload = { statusCode: status, message: body, error: exception.name };
      } else if (typeof body === 'object' && body !== null) {
        const details = body as Record<string, unknown>;
        payload = {
          statusCode: status,
          message: (details.message as string | string[]) ?? exception.message,
          error: (details.error as string) ?? exception.name,
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Erreur non gérée : ${request.method} ${request.url}`,
        exception.stack,
      );
      payload = { statusCode: status, message: 'Erreur interne du serveur' };
    }

    response.status(status).json(payload);
  }
}
