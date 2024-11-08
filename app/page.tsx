"use client";

import { useState } from "react";
import { ConnectionState, useIntiface } from "./intiface";
import { LocalDeviceCard } from "./local-device";
import { enableMapSet } from "immer";

enableMapSet();

export default function Index() {
    const { connectionState, connect, devices, dispatchDevices } = useIntiface();
    const [intifaceUrl, setIntifaceUrl] = useState("ws://localhost:12345");


    return <div className="container-lg mt-4">
        <div className="row">
            <div className="col-4 bg-body-secondary rounded-4 p-4">
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
                        className={`btn ${connectionState == ConnectionState.Connected ? "btn-danger": "btn-success"}`}
                        disabled={connectionState == ConnectionState.Connecting}
                        onClick={() => connect(connectionState == ConnectionState.Connected ? null : intifaceUrl)}
                    >
                        {connectionState == ConnectionState.Connected ? "Disconnect" : "Connect"}
                    </button>
                </div>
                <div>
                    <label htmlFor="pair-link" className="form-label">Use this link to pair:</label>
                    <div className="input-group">
                        <input type="text" id="pair-link" className="form-control font-monospace" readOnly />
                        <button className="btn btn-primary">
                            <i className="bi bi-clipboard"></i>
                        </button>
                    </div>
                </div>
                <hr />
                <div className="vstack">
                    {devices.size == 0 && <div className="text-secondary-emphasis w-100 text-center">No local devices</div>}
                    {[...devices.entries()].map(([index, device]) => <LocalDeviceCard key={index} device={device} dispatchDevices={dispatchDevices} />)}
                </div>
            </div>
            <div className="col-8 px-4">
                <h1 className="d-flex">
                    <span>Devices</span>
                    <button className="btn btn-danger ms-auto align-self-end" disabled>Stop all</button>
                </h1>
                <hr></hr>
                <div className="position-relative">
                    <div className="position-absolute top-50 start-50 translate-middle mt-4 text-secondary d-flex align-items-center">
                        <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="ms-2">Waiting for peer connection</span>
                    </div>
                </div>
            </div>
        </div>
    </div>;
}