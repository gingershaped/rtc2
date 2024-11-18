"use client";

import { useState } from "react";
import { IntifaceConnectionState, useIntiface } from "./intiface";
import { DeviceCard } from "./device-card";
import { enableMapSet } from "immer";
import { usePeer } from "./peer";

enableMapSet();

export default function Index() {
    const [showDisconnectedAlert, setShowDisconnectedAlert] = useState(false);
    const { connectionState: intifaceConnectionState, connect, devices: localDevices, dispatchDevices } = useIntiface();
    const { connectionState: peerConnectionState, remoteDevices, dispatchRemoteDevices, retryConnection } = usePeer(
        localDevices, dispatchDevices, globalThis?.window?.location?.hash?.length ? window.location.hash.substring(1) : null, () => setShowDisconnectedAlert(true),
    );
    const peerUrl = peerConnectionState.state == "connected" ? new URL(window.location.toString()) : null;
    if (peerUrl != null) {
        peerUrl.hash = peerConnectionState.state == "connected" ? peerConnectionState.id : "";
    }
    const [intifaceUrl, setIntifaceUrl] = useState("ws://localhost:12345");

    if (remoteDevices != null && showDisconnectedAlert) {
        setShowDisconnectedAlert(false);
    }

    return <div className="container-lg">
        <div className="row gy-4">
            <div className="col-lg-4 bg-body-secondary rounded-4 p-4">
                <label htmlFor="intiface-address" className="form-label">Connect to Intiface Central</label>
                <div className="input-group mb-3">
                    <input
                        type="text"
                        id="intiface-address"
                        className="form-control"
                        placeholder="Intiface websocket address"
                        value={intifaceUrl}
                        onChange={(e) => setIntifaceUrl(e.currentTarget.value)}
                    />
                    <button
                        className={`btn ${intifaceConnectionState.state == "connected" ? "btn-danger": "btn-success"}`}
                        disabled={intifaceConnectionState.state == "connecting"}
                        onClick={() => connect(intifaceConnectionState.state == "connected" ? null : intifaceUrl)}
                    >
                        {intifaceConnectionState.state == "connected" ? "Disconnect" : "Connect"}
                    </button>
                </div>
                <div>
                    <label htmlFor="pair-link" className="form-label">Use this link to pair:</label>
                    <div className="input-group position-relative">
                        <input
                            type="text"
                            id="pair-link"
                            className="form-control font-monospace"
                            readOnly
                            value={peerUrl?.toString() ?? ""}
                        />
                        {peerConnectionState.state == "connecting" && <div className="position-absolute top-50 start-50 translate-middle">
                            <div className="spinner-border spinner-border-sm text-secondary-emphasis" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>}
                        <button className="btn btn-primary">
                            <i className="bi bi-clipboard"></i>
                        </button>
                    </div>
                </div>
                <hr />
                <div className="vstack">
                    {localDevices.size == 0 && <div className="text-secondary-emphasis w-100 text-center">No local devices</div>}
                    {[...localDevices.entries()].map(([index, device]) => (
                        <DeviceCard
                            key={index}
                            device={device}
                            setControllable={(controllable) => dispatchDevices({ type: "set-controllable", index: device.index, controllable })}
                            setVibration={(motorIndex, speed) => dispatchDevices({ type: "set-vibration", index: device.index, motorIndex, speed })}
                        />
                    ))}
                </div>
            </div>
            <div className="col-lg-8 px-4">
                <h1 className="d-flex">
                    <span>Partner Devices</span>
                    <button className="btn btn-danger ms-auto align-self-end" disabled>Stop all</button>
                </h1>
                <hr></hr>
                <div className="position-relative">
                    {showDisconnectedAlert && <div className="alert alert-warning alert-dismissible" role="alert">
                        <span>Peer has disconnected.</span>
                        <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowDisconnectedAlert(false)}></button>
                    </div>}
                    {peerConnectionState.state == "errored" && <div className="alert alert-danger d-flex align-items-baseline" role="alert">
                        <span>{peerConnectionState.message} (<code>{peerConnectionState.error}</code>)</span>
                        {["network", "server-error", "socket-error", "socket-closed", "unavailable-id"].includes(peerConnectionState.error) && (
                            <button className="btn btn-danger btn-sm ms-auto" onClick={retryConnection}>Reconnect</button>
                        )}
                    </div>}
                    {(remoteDevices == null && peerConnectionState.state != "errored" && !showDisconnectedAlert) && (
                        <div className="position-absolute top-50 start-50 translate-middle mt-4 text-secondary d-flex align-items-center">
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <span className="ms-2">Waiting for peer connection</span>
                        </div>
                    )}
                    {(remoteDevices != null && remoteDevices.size == 0) && (
                        <div className="position-absolute top-50 start-50 translate-middle mt-4 d-flex align-items-center">
                            <span className="text-success">Connected!&nbsp;</span><span className="text-secondary">No remote devices.</span>
                        </div>
                    )}
                    {[...remoteDevices?.entries() ?? []].map(([index, device]) => (
                        <DeviceCard
                            key={index}
                            device={device}
                            setControllable={null}
                            setVibration={(motorIndex, speed) => dispatchRemoteDevices({ type: "set-vibration", index: device.index, motorIndex, speed })}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>;
}