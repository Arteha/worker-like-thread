import { EventEmitter } from "events";
import socketio from "socket.io-client";

export class Socket extends EventEmitter
{
    private io: SocketIOClient.Socket;

    constructor(options: SocketIOClient.ConnectOpts)
    {
        super();

        this.io = socketio(options);
    }

    public removeAllListeners(event?: string | symbol): this
    {
        this.io.removeAllListeners();
        return super.removeAllListeners();
    }

    public get isOpen()
    {
        return this.io.connected;
    }

    public close()
    {
        this.io.close();
    }

    public send(message: string)
    {
        if(this.isOpen)
            this.io.send(message);
    }
}