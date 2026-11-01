import { z } from "@hono/zod-openapi";

type ApiErrorShape = {
  success: boolean;
  statusCode: number;
  code?: string;
  message?: string;
};

const apiErrorShapeSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  code: z.string().optional(),
  message: z.string().optional(),
});

function getApiErrorShape({
  success,
  code,
  message,
  statusCode,
}: ApiErrorShape): ApiErrorShape {
  return {
    success,
    code,
    message,
    statusCode,
  };
}

export type { ApiErrorShape };
export { getApiErrorShape, apiErrorShapeSchema };
