import { AppError } from './errors.js';

export const validate =
  (schema, source = 'body') =>
  (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', result.error.flatten()),
      );
    }
    request[source] = result.data;
    next();
  };
