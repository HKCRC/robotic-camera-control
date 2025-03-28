export type WebsocketResponseType = {
  type: string;
  message: any;
}


export enum EVENT_CODE {
  'OPEN_CAMERA' = 'OPEN_CAMERA',
  'TAKE_PHOTO' = 'TAKE_PHOTO',
  'RECEIVE_PHOTO' = 'RECEIVE_PHOTO',
  'CANCEL_TASK' = 'CANCEL_TASK'
}
