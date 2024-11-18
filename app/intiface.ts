import { ActuatorType, ButtplugBrowserWebsocketClientConnector, ButtplugClient, ButtplugClientDevice } from "buttplug";
import { Draft } from "immer";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useImmerReducer } from "use-immer";
import { z } from "zod";


export const genericDeviceMessageAttributesSchema = z.object({
    FeatureDescriptor: z.string(),
    ActuatorType: z.nativeEnum(ActuatorType),
    StepCount: z.number(),
    Index: z.number(),
});

export const deviceInfo = z.object({
    index: z.number(),
    name: z.string(),
    displayName: z.string().nullable(),
    attributes: z.object({
        scalar: z.array(genericDeviceMessageAttributesSchema),
        linear: z.array(genericDeviceMessageAttributesSchema),
        rotational: z.array(genericDeviceMessageAttributesSchema),
    }),
    vibrationSpeeds: z.array(z.number()),
    controllable: z.boolean(),
});

export const publicDeviceAction = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("set-vibration"),
        index: z.number(),
        motorIndex: z.number(),
        speed: z.number(),
    }),
    z.object({
        type: z.literal("stop-all"),
    }),
]);

export const deviceAction = z.discriminatedUnion("type", [
    ...publicDeviceAction.options,
    z.object({
        type: z.literal("set-controllable"),
        index: z.number(),
        controllable: z.boolean(),
    }),
    z.object({
        type: z.literal("add-device"),
        index: z.number(),
        info: deviceInfo,
    }),
    z.object({
        type: z.literal("remove-device"),
        index: z.number(),
    }),
    z.object({
        type: z.literal("clear-devices"),
    }),
]);

export type DeviceInfo = z.infer<typeof deviceInfo>;
export type PublicDeviceAction = z.infer<typeof publicDeviceAction>;
export type DeviceAction = z.infer<typeof deviceAction>;

export type IntifaceConnectionState = { state: "connected" | "connecting" } | { state: "disconnected", error: string | null };

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
        case "stop-all": {
            draft.forEach((device) => {
                device.vibrationSpeeds.fill(0);
            });
            break;
        }
    }
}


export function useIntiface() {
    const client = useMemo(() => new ButtplugClient("rtc2"), []);
    const [connectionState, setConnectionState] = useState<IntifaceConnectionState>({ state: "disconnected", error: null });
    const [devices, dispatchDevices] = useImmerReducer(deviceReducer, new Map<number, DeviceInfo>());

    const deviceAdded = useCallback((device: ButtplugClientDevice) => {
        dispatchDevices({
            type: "add-device",
            index: device.index,
            info: {
                name: device.name,
                index: device.index,
                displayName: device.displayName ?? null,
                attributes: {
                    linear: device.messageAttributes.LinearCmd?.map(attribute => genericDeviceMessageAttributesSchema.parse(attribute)) ?? [],
                    scalar: device.messageAttributes.ScalarCmd?.map(attribute => genericDeviceMessageAttributesSchema.parse(attribute)) ?? [],
                    rotational: device.messageAttributes.RotateCmd?.map(attribute => genericDeviceMessageAttributesSchema.parse(attribute)) ?? [],
                },
                vibrationSpeeds: Array(device.vibrateAttributes.length).fill(0),
                controllable: true,
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
        setConnectionState({ state: "disconnected", error: null });
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
                const deviceInfo = devices.get(device.index);
                if (deviceInfo == null) {
                    continue;
                }
                device.vibrate(deviceInfo.vibrationSpeeds);
            }
        }
    }, [client, devices]);

    const connect = useCallback(async(url: string | null) => {
        if (url != null) {
            if (connectionState.state != "disconnected") {
                throw new Error("Tried to connect while already connected");
            }
            setConnectionState({ state: "connecting" });
            try {
                await client.connect(new ButtplugBrowserWebsocketClientConnector(url));
                await client.startScanning();
            } catch (e) {
                console.warn(`Failed to connect to ${url}!`, e);
                setConnectionState({ state: "disconnected", error: "Connection failed!" });
                return;
            }
            setConnectionState({ state: "connected" });
            for (const device of client.devices) {
                deviceAdded(device);
            }
        } else {
            if (connectionState.state != "connected") {
                throw new Error("Tried to disconnect while not connected");
            }
            dispatchDevices({ type: "clear-devices" });
            setConnectionState({ state: "disconnected", error: null });
            try {
                await client.disconnect();
            } catch (e) {
                console.warn("An error occured while disconnecting!", e);
            }
        }
    }, [client, connectionState, deviceAdded, dispatchDevices]);

    return { connectionState, connect, devices, dispatchDevices };
}