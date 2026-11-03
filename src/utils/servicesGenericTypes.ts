type GetData<T> = {
  data?: T;
  permissionDenied: boolean;
};

type ModifyData<T> = {
  data?: T;
  permissionDenied: boolean;
  notFound: boolean;
};

function getModifyDataResult<T>(props: Partial<ModifyData<T>>): ModifyData<T> {
  return {
    data: props.data,
    notFound: props.notFound || false,
    permissionDenied: props.permissionDenied || false,
  };
}

export type { ModifyData, GetData };
export { getModifyDataResult };
