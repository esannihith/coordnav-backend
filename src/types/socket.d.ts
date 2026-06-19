import "socket.io";

declare module "socket.io" {
  interface SockerData {
    userId?: string;
  }
}

export {};
