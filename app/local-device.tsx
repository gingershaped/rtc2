"use client";
import { DeviceInfo, PublicDeviceAction } from "./intiface";

type LocalDeviceCardProps = {
    device: DeviceInfo,
    dispatchDevices: (action: PublicDeviceAction) => unknown,
};

export function LocalDeviceCard({ device, dispatchDevices }: LocalDeviceCardProps) {
    const hasDisplayName = device.displayName !== undefined && device.displayName != "";

    return <div className="card">
        <div className="card-body">
            <h5 className="card-title">{hasDisplayName ? device.displayName : device.name}</h5>
            {hasDisplayName && <h6 className="card-subtitle mb-2 text-body-secondary">{device.name}</h6>}
            <div className="form-check form-switch mb-2">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id={`allow-rc-${device.index}`}
                    checked={device.controllable}
                    onChange={(e) => dispatchDevices({ type: "set-controllable", index: device.index, controllable: e.target.checked })}
                />
                <label className="form-check-label" htmlFor={`allow-rc-${device.index}`}>Allow remote control</label>
            </div>
            {device.attributes.ScalarCmd && device.attributes.ScalarCmd.map((attribute) => {
                const id = `scalar-${attribute.Index}`;
                const label = attribute.FeatureDescriptor.length ? attribute.FeatureDescriptor : attribute.ActuatorType;
                return <div key={attribute.Index} className="mb-2">
                    <label htmlFor={id} className="form-label">{label}</label>
                    <input
                        type="range"
                        className="form-range"
                        id={id}
                        min={0}
                        max={attribute.StepCount}
                        step={1}
                        value={device.vibrationSpeeds[attribute.Index] * attribute.StepCount}
                        onInput={(e) => dispatchDevices({
                            type: "set-vibration",
                            index: device.index,
                            motorIndex: attribute.Index,
                            speed: e.currentTarget.valueAsNumber / attribute.StepCount,
                        })}
                    />
                </div>;
            })}
        </div>
    </div>;
}