import { ButtplugBrowserWebsocketClientConnector, ButtplugClient, ButtplugClientDevice, MessageAttributes } from "buttplug";
import { Draft } from "immer";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useImmerReducer } from "use-immer";

export const enum ConnectionState {
    Disconnected, Connecting, Connected,
}

export type DeviceInfo = {
    index: number,
    name: string,
    displayName: string | null,
    attributes: MessageAttributes,
    vibrationSpeeds: number[],
    controllable: boolean,
};

export type PublicDeviceAction = (
    {
        type: "set-controllable",
        index: number,
        controllable: boolean,
    } | {
        type: "set-vibration",
        index: number,
        motorIndex: number,
        speed: number,
    }
);

export type DeviceAction = (
    {
        type: "add-device",
        index: number,
        info: DeviceInfo,
    } | {
        type: "remove-device",
        index: number,
    } | {
        type: "clear-devices",
    } | PublicDeviceAction
);

function deviceReducer(draft: Draft<Map<number, DeviceInfo>>, action: DeviceAction) {
    switch (action.type) {
        case "add-device": {
            draft.set(action.index, action.info);
            break;
        }
        case "remove-device": {
            draft.delete(action.index);
            break;
        }
        case "clear-devices": {
            draft.clear();
            break;
        }
        case "set-controllable": {
            draft.get(action.index)!.controllable = action.controllable;
            break;
        }
        case "set-vibration": {
            const device = draft.get(action.index)!;
            device.vibrationSpeeds[action.motorIndex] = action.speed;
            
            break;
        }
    }
}

export function useIntiface() {
    const client = useMemo(() => new ButtplugClient("rtc2"), []);
    const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
    const [devices, dispatchDevices] = useImmerReducer(deviceReducer, new Map<number, DeviceInfo>());

    const deviceAdded = useCallback((device: ButtplugClientDevice) => {
        dispatchDevices({
            type: "add-device",
            index: device.index,
            info: {
                name: device.name,
                index: device.index,
                displayName: device.displayName ?? null,
                attributes: device.messageAttributes,
                vibrationSpeeds: Array(device.vibrateAttributes.length).fill(0),
                controllable: false,
            },
        });
    }, [dispatchDevices]);
    const deviceRemoved = useCallback((device: ButtplugClientDevice | undefined) => {
        if (device != undefined) {
            dispatchDevices({
                type: "remove-device",
                index: device.index,
            });
        }
    }, [dispatchDevices]);
    const disconnected = useCallback(() => {
        dispatchDevices({ type: "clear-devices" });
        setConnectionState(ConnectionState.Disconnected);
    }, [dispatchDevices]);

    useEffect(() => {
        client.addListener("deviceadded", deviceAdded);
        client.addListener("deviceremoved", deviceRemoved);
        client.addListener("disconnect", disconnected);
        return () => {
            client.removeListener("deviceadded", deviceAdded);
            client.removeListener("deviceremoved", deviceRemoved);
            client.removeListener("disconnect", disconnected);
        };
    }, [client, deviceAdded, deviceRemoved, disconnected]);

    useEffect(() => {
        if (client.connected) {
            for (const device of client.devices) {
                const deviceInfo = devices.get(device.index)!;
                device.vibrate(deviceInfo.vibrationSpeeds);
            }
        }
    }, [client, devices]);

    const connect = useCallback(async(url: string | null) => {
        if (url != null) {
            setConnectionState(ConnectionState.Connecting);
            try {
                await client.connect(new ButtplugBrowserWebsocketClientConnector(url));
                await client.startScanning();
            } catch (e) {
                console.warn(`Failed to connect to ${url}!`, e);
                setConnectionState(ConnectionState.Disconnected);
                return;
            }
            setConnectionState(ConnectionState.Connected);
            for (const device of client.devices) {
                deviceAdded(device);
            }
        } else {
            await client.disconnect();
        }
    }, [client, deviceAdded]);

    return { connectionState, connect, devices, dispatchDevices: (action: PublicDeviceAction) => dispatchDevices(action) };
}