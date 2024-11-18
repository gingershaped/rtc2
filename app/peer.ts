import Peer, { DataConnection, PeerErrorType } from "peerjs";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { deviceInfo, DeviceInfo, publicDeviceAction, PublicDeviceAction } from "./intiface";

const messageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("devices"), devices: z.array(z.tuple([z.number(), deviceInfo])) }),
    z.object({ type: z.literal("dispatch"), action: publicDeviceAction }),
]);

type PeerConnectionState = { state: "connected", id: string } | { state: "errored", error: `${PeerErrorType}`, message: string } | { state: "connecting"};

export function usePeer(
    localDevices: Map<number, DeviceInfo>,
    dispatchLocalDevices: (action: PublicDeviceAction) => unknown,
    initialTargetId: string | null,
    onDisconnected: () => unknown,
) {
    const [targetId, setTargetId] = useState(initialTargetId);
    const [peer, setPeer] = useState(() => new Peer());
    const [connectionState, setConnectionState] = useState<PeerConnectionState>({ state: "connecting" });
    const [peerConnection, setPeerConnection] = useState<DataConnection | null>(null);
    const [remoteDevices, setRemoteDevices] = useState<Map<number, DeviceInfo> | null>(null);

    const onClose = useCallback(() => {
        peer.removeAllListeners();
        peer.disconnect();
        peer.destroy();
        setRemoteDevices(null);
        setPeerConnection(null);
    }, [peer]);

    const onConnection = useCallback((connection: DataConnection) => {
        if (peerConnection != null) {
            console.warn(`Someone (${connection.peer}) tried to connect while we are already connected!`);
            connection.close();
            return;
        }
        connection.on("open", () => {
            console.log(`Peer connection opened! We are connected to ${connection.peer}`);
            setPeerConnection(connection);
        });
        connection.on("close", () => {
            console.log("Data channel closed");
            peer.destroy();
        });
        connection.on("data", (data) => {
            const message = messageSchema.parse(data);
            switch (message.type) {
                case "devices": {
                    setRemoteDevices(new Map(message.devices));
                    break;
                }
                case "dispatch": {
                    dispatchLocalDevices(message.action);
                    break;
                }
            }
        });
    }, [peerConnection, peer, dispatchLocalDevices]);

    const retryConnection = useCallback(() => {
        if (connectionState.state == "errored") {
            setPeer(new Peer());
        }
    }, [connectionState]);

    const dispatchRemoteDevices = useCallback((action: PublicDeviceAction) => {
        peerConnection?.send({ type: "dispatch", action });
    }, [peerConnection]);

    useEffect(() => {
        peer.on("open", () => {
            console.log(`Peer connected to relay, our ID is ${peer.id}`);
            setConnectionState({ state: "connected", id: peer.id });
            if (targetId) {
                console.log(`Connecting to ${targetId}`);
                onConnection(peer.connect(targetId, { reliable: true }));
            }
        });

        peer.on("connection", onConnection);

        peer.on("disconnected", () => {
            console.log("Peer disconnected");
            onDisconnected();
            setTargetId(null);
            setConnectionState({ state: "connecting" });
            onClose();
            setPeer(new Peer());
        });


        peer.on("error", (error) => {
            console.log("Peer errored!", error);
            setConnectionState({ state: "errored", error: error.type, message: error.message });
        });

        return () => {
            peer.removeAllListeners();
        };
    }, [peer, onClose, onConnection, targetId, onDisconnected]);

    useEffect(() => {
        peerConnection?.send({
            type: "devices",
            devices: [...localDevices.entries().filter(([, { controllable }]) => controllable)],
        });
    }, [peerConnection, localDevices]);

    useEffect(() => {
        window.addEventListener("unload", onClose);
        return () => window.removeEventListener("unload", onClose);
    }, [onClose]);
    
    return { connectionState, remoteDevices, retryConnection, dispatchRemoteDevices };
}