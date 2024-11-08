import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import React from "react";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode } ) {
    return <html>
        <body data-bs-theme="dark">
            <nav className="navbar bg-body-tertiary">
                <div className="container-lg">
                    <Link className="navbar-brand" href="/">rtc<sup>2</sup></Link>
                    <ul className="navbar-nav flex-grow-1">
                        <li className="nav-item">
                            <Link className="nav-link" href="/">About</Link>
                        </li>
                    </ul>
                </div>
            </nav>
            <main>{children}</main>
        </body>
    </html>;
}