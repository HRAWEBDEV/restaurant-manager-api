type ApiErrorShape = {
  success: boolean;
  statusCode: number;
  code?: string;
  message?: string;
};

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
export { getApiErrorShape };
